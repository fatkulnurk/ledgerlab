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
  });
}

repositoryContract("memory", async () => {
  const repo = new InMemoryLedgerRepository();
  return { repo, close: async () => undefined };
});

describe.skipIf(!databaseUrl)("postgres adapter", () => {
  repositoryContract("postgres", async () => {
    const database = createDatabase(databaseUrl!, { max: 2 });
    return { repo: new PostgresLedgerRepository(database.db), close: database.close };
  });
});
