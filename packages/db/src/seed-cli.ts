import { createDatabase } from "./client";
import { PostgresLedgerRepository } from "./postgres-repository";
import { runSeed } from "./seed";

/**
 * Seed a Postgres database with the demo chart of accounts and journal entries.
 * Idempotent: running it repeatedly never duplicates data.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to seed Postgres");
  const { db, close } = createDatabase(url, { max: 1 });
  const repo = new PostgresLedgerRepository(db);
  try {
    const result = await runSeed(repo);
    console.log(
      `Seed complete: ${result.accountsCreated} accounts created, ${result.entriesCreated} entries created ` +
        `(${result.accountCount} accounts, ${result.entryCount} entries total).`,
    );
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
