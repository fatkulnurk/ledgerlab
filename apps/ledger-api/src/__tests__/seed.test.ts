import { describe, expect, it } from "vitest";
import { InMemoryLedgerRepository, runSeed } from "@ledgerlab/db";
import { SEED_ACCOUNTS, buildSeedEntries } from "@ledgerlab/shared";

describe("runSeed", () => {
  it("loads the demo data once", async () => {
    const repo = new InMemoryLedgerRepository();
    const result = await runSeed(repo);

    expect(result.accountsCreated).toBe(SEED_ACCOUNTS.length);
    expect(result.entriesCreated).toBe(buildSeedEntries().length);
    expect((await repo.listAccounts()).length).toBe(SEED_ACCOUNTS.length);
    expect((await repo.listJournalEntries({ page: 1, pageSize: 100 })).total).toBe(buildSeedEntries().length);
  });

  it("is idempotent: a second run creates nothing", async () => {
    const repo = new InMemoryLedgerRepository();
    await runSeed(repo);
    const before = await repo.listJournalEntries({ page: 1, pageSize: 100 });

    const second = await runSeed(repo);

    expect(second.accountsCreated).toBe(0);
    expect(second.entriesCreated).toBe(0);
    const after = await repo.listJournalEntries({ page: 1, pageSize: 100 });
    expect(after.total).toBe(before.total);
    expect((await repo.listAccounts()).length).toBe(SEED_ACCOUNTS.length);
  });
});
