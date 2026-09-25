import { SEED_ACCOUNTS, buildSeedEntries, type LedgerRepository } from "@ledgerlab/shared";

export interface SeedResult {
  accountsCreated: number;
  entriesCreated: number;
  accountCount: number;
  entryCount: number;
}

/**
 * Load the demo chart of accounts and journal entries into any repository.
 *
 * Idempotent: accounts are skipped by `code` and entries by `reference`, so
 * running it repeatedly never duplicates data. Extracted from the CLI so it can
 * be unit tested against the in-memory adapter.
 */
export async function runSeed(repo: LedgerRepository, today: Date = new Date()): Promise<SeedResult> {
  const existingAccounts = new Set((await repo.listAccounts()).map((a) => a.code));
  let accountsCreated = 0;
  for (const account of SEED_ACCOUNTS) {
    if (!existingAccounts.has(account.code)) {
      await repo.createAccount(account);
      accountsCreated += 1;
    }
  }
  const accountsByCode = new Map((await repo.listAccounts()).map((a) => [a.code, a]));

  // Page through every entry so the idempotency check is not capped by a single
  // page size when the table grows large.
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
  for (const entry of buildSeedEntries(today)) {
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

  return {
    accountsCreated,
    entriesCreated,
    accountCount: accountsByCode.size,
    entryCount: total + entriesCreated,
  };
}
