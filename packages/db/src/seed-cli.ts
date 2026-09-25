import { SEED_ACCOUNTS, buildSeedEntries } from "@ledgerlab/shared";
import { createDatabase } from "./client";
import { PostgresLedgerRepository } from "./postgres-repository";

/**
 * Seed a Postgres database with the demo chart of accounts and journal entries.
 * Idempotent: accounts are skipped by code and entries by reference, so running
 * it repeatedly is safe and never duplicates data.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to seed Postgres");
  const { db, close } = createDatabase(url, { max: 1 });
  const repo = new PostgresLedgerRepository(db);
  try {
    const existingAccounts = new Set((await repo.listAccounts()).map((a) => a.code));
    let accountsCreated = 0;
    for (const account of SEED_ACCOUNTS) {
      if (!existingAccounts.has(account.code)) {
        await repo.createAccount(account);
        accountsCreated += 1;
      }
    }
    const accountsByCode = new Map((await repo.listAccounts()).map((a) => [a.code, a]));

    // Page through every entry so the idempotency check is not capped by a
    // single page size when the table grows large.
    const existingRefs = new Set<string>();
    const pageSize = 200;
    let total = Number.POSITIVE_INFINITY;
    for (let page = 1; existingRefs.size + 1 <= total; page += 1) {
      const result = await repo.listJournalEntries({ page, pageSize });
      total = result.total;
      for (const entry of result.data) {
        if (entry.reference) existingRefs.add(entry.reference);
      }
      if (result.data.length < pageSize) break;
    }

    let entriesCreated = 0;
    for (const entry of buildSeedEntries()) {
      if (entry.reference && existingRefs.has(entry.reference)) continue;
      await repo.createJournalEntry({
        date: entry.date,
        memo: entry.memo,
        reference: entry.reference,
        lines: entry.lines.map((line) => {
          const account = accountsByCode.get(line.accountCode);
          if (!account) throw new Error(`Seed account ${line.accountCode} missing`);
          return { accountId: account.id, amountMinor: line.amountMinor, memo: line.memo };
        }),
      });
      entriesCreated += 1;
    }
    console.log(
      `Seed complete: ${accountsCreated} accounts created, ${entriesCreated} entries created ` +
        `(${accountsByCode.size} accounts, ${total + entriesCreated} entries total).`,
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
