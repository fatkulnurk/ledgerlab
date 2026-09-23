import type { LedgerRepository } from "@ledgerlab/shared";
import { InMemoryLedgerRepository, PostgresLedgerRepository, createDatabase } from "@ledgerlab/db";

export interface RepositoryHandle {
  repository: LedgerRepository;
  close: () => Promise<void>;
}

/**
 * Choose a storage adapter from the environment.
 *
 *   DATABASE_URL set   -> Postgres via Drizzle
 *   DATABASE_URL unset -> seeded in-memory (zero-config default)
 */
export function resolveLedgerRepository(env: NodeJS.ProcessEnv = process.env): RepositoryHandle {
  const url = env.DATABASE_URL;
  if (url && url.trim() !== "") {
    const { db, close } = createDatabase(url);
    return { repository: new PostgresLedgerRepository(db), close };
  }
  const repository = new InMemoryLedgerRepository({ seed: true });
  return { repository, close: async () => undefined };
}
