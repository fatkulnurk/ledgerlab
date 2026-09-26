import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export type Database = ReturnType<typeof createDatabase>["db"];

export interface DatabaseOptions {
  /** Maximum pool connections. Defaults to 10. */
  max?: number;
  /** Close idle connections after this many seconds. Defaults to 30. */
  idleTimeoutSeconds?: number;
}

/**
 * Create a Drizzle client bound to a Postgres connection pool.
 * Call `close()` on shutdown so the process can exit.
 */
export function createDatabase(url: string, options?: DatabaseOptions) {
  const sql = postgres(url, {
    max: options?.max ?? 10,
    idle_timeout: options?.idleTimeoutSeconds ?? 30,
  });
  const db = drizzle(sql, { schema });
  return {
    db,
    sql,
    async close(): Promise<void> {
      await sql.end({ timeout: 5 });
    },
  };
}
