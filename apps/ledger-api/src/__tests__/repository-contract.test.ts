import { describe, expect, it } from "vitest";
import type { Account, LedgerRepository } from "@ledgerlab/shared";
import { isBalanced, sumMinor } from "@ledgerlab/shared";
import { InMemoryLedgerRepository, PostgresLedgerRepository, createDatabase } from "@ledgerlab/db";

const databaseUrl = process.env.DATABASE_URL;

interface Harness {
  repo: LedgerRepository;
  close: () => Promise<void>;
}

/** Two fresh accounts with unique 4-digit codes so any adapter can accept them. */
async function createTwoAccounts(repo: LedgerRepository): Promise<{ debit: Account; credit: Account }> {
  const base = Math.floor(Math.random() * 8000) + 1000;
  const debit = await repo.createAccount({
    code: String(base).padStart(4, "0"),
    name: "Contract Debit",
    type: "ASSET",
    currency: "USD",
  });
  const credit = await repo.createAccount({
    code: String(base + 1).padStart(4, "0"),
    name: "Contract Credit",
    type: "REVENUE",
    currency: "USD",
  });
  return { debit, credit };
}

/**
 * The same contract every LedgerRepository implementation must satisfy. Running
 * it against the Postgres adapter is what proves the invariant beyond memory.
 */
function repositoryContract(name: string, create: () => Promise<Harness>): void {
  describe(`LedgerRepository contract: ${name}`, () => {
    it("persists an entry whose signed minor units sum to exactly zero", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        const entry = await repo.createJournalEntry({
          date: "2030-01-01",
          memo: `contract ${name}`,
          lines: [
            { accountId: debit.id, amountMinor: 12_345 },
            { accountId: credit.id, amountMinor: -12_345 },
          ],
        });

        expect(entry.status).toBe("POSTED");
        expect(isBalanced(entry.lines.map((line) => line.amountMinor))).toBe(true);
        expect(sumMinor(entry.lines.map((line) => line.amountMinor))).toBe(0);

        const postings = await repo.listPostings();
        const mine = postings.filter((posting) => posting.entryId === entry.id);
        expect(mine).toHaveLength(2);
        expect(sumMinor(mine.map((posting) => posting.amountMinor))).toBe(0);
      } finally {
        await close();
      }
    });

    it("refuses an entry whose debits and credits do not net to zero", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        await expect(
          repo.createJournalEntry({
            date: "2030-01-02",
            memo: `contract unbalanced ${name}`,
            lines: [
              { accountId: debit.id, amountMinor: 1_000 },
              { accountId: credit.id, amountMinor: -900 },
            ],
          }),
        ).rejects.toBeTruthy();
      } finally {
        await close();
      }
    });

    it("refuses an entry that references an inactive account", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        const deactivated = await repo.setAccountActive(debit.id, false);
        expect(deactivated?.isActive).toBe(false);

        await expect(
          repo.createJournalEntry({
            date: "2030-01-03",
            memo: `contract inactive ${name}`,
            lines: [
              { accountId: debit.id, amountMinor: 500 },
              { accountId: credit.id, amountMinor: -500 },
            ],
          }),
        ).rejects.toBeTruthy();
      } finally {
        await close();
      }
    });

    it("voids a POSTED entry exactly once and rejects a second void", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        const entry = await repo.createJournalEntry({
          date: "2030-01-04",
          memo: `contract void ${name}`,
          lines: [
            { accountId: debit.id, amountMinor: 700 },
            { accountId: credit.id, amountMinor: -700 },
          ],
        });

        const first = await repo.voidJournalEntry(entry.id);
        expect(first?.status).toBe("VOID");

        await expect(repo.voidJournalEntry(entry.id)).rejects.toBeTruthy();

        // A voided entry disappears from the POSTED-only postings feed.
        const postings = await repo.listPostings();
        expect(postings.some((posting) => posting.entryId === entry.id)).toBe(false);
      } finally {
        await close();
      }
    });

    it("filters journal entries by inclusive date range", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        const lines = [
          { accountId: debit.id, amountMinor: 100 },
          { accountId: credit.id, amountMinor: -100 },
        ];
        await repo.createJournalEntry({ date: "2031-03-15", memo: `in-range ${name}`, lines });
        await repo.createJournalEntry({ date: "2031-04-15", memo: `out-of-range ${name}`, lines });

        const march = await repo.listJournalEntries({
          page: 1,
          pageSize: 50,
          from: "2031-03-01",
          to: "2031-03-31",
        });
        const memos = march.data.map((entry) => entry.memo);
        expect(memos).toContain(`in-range ${name}`);
        expect(memos).not.toContain(`out-of-range ${name}`);
        expect(march.data.every((entry) => entry.date >= "2031-03-01" && entry.date <= "2031-03-31")).toBe(
          true,
        );
      } finally {
        await close();
      }
    });

    it("orders same-date entries newest first (createdAt desc)", async () => {
      const { repo, close } = await create();
      try {
        const { debit, credit } = await createTwoAccounts(repo);
        const lines = [
          { accountId: debit.id, amountMinor: 100 },
          { accountId: credit.id, amountMinor: -100 },
        ];
        const first = await repo.createJournalEntry({ date: "2032-06-01", memo: `older ${name}`, lines });
        // Give the two rows distinct createdAt values (ms precision in memory).
        await new Promise((resolve) => setTimeout(resolve, 5));
        const second = await repo.createJournalEntry({ date: "2032-06-01", memo: `newer ${name}`, lines });

        // Scope to this run's rows: Postgres persists rows across runs.
        const page = await repo.listJournalEntries({ page: 1, pageSize: 200 });
        const ids = page.data
          .filter((entry) => entry.id === first.id || entry.id === second.id)
          .map((entry) => entry.id);
        expect(ids).toEqual([second.id, first.id]);
      } finally {
        await close();
      }
    });
  });
}

repositoryContract("memory", async () => {
  const repo = new InMemoryLedgerRepository();
  return { repo, close: async () => undefined };
});

describe.skipIf(!databaseUrl)("postgres adapter", () => {
  repositoryContract("postgres", async () => {
    const database = createDatabase(databaseUrl!, { max: 2 });
    // Start every contract test from an empty ledger so leftover rows from a
    // previous run cannot make an assertion pass or fail for the wrong reason.
    // Point DATABASE_URL at a disposable database, never production.
    await database.sql`TRUNCATE TABLE journal_lines, journal_entries, accounts CASCADE`;
    return { repo: new PostgresLedgerRepository(database.db), close: database.close };
  });
});
