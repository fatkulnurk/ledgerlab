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
    const max = Number(env.DB_POOL_MAX ?? 10) || 10;
    const idleTimeoutSeconds = Number(env.DB_IDLE_TIMEOUT_SECONDS ?? 30) || 30;
    const { db, close } = createDatabase(url, { max, idleTimeoutSeconds });
    return { repository: new PostgresLedgerRepository(db), close };
  }
  const repository = new InMemoryLedgerRepository({ seed: true });
  return { repository, close: async () => undefined };
}
