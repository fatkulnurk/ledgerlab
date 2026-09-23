import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export type Database = ReturnType<typeof createDatabase>["db"];

/**
 * Create a Drizzle client bound to a Postgres connection pool.
 * Call `close()` on shutdown so the process can exit.
 */
export function createDatabase(url: string, options?: { max?: number }) {
  const sql = postgres(url, { max: options?.max ?? 10 });
  const db = drizzle(sql, { schema });
  return {
    db,
    sql,
    async close(): Promise<void> {
      await sql.end({ timeout: 5 });
    },
  };
}
