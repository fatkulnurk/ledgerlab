import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

/** Apply the hand-written SQL migration(s). Idempotent. */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run migrations");
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = postgres(url, { max: 1 });
  try {
    const migration = await readFile(join(here, "..", "migrations", "0000_init.sql"), "utf8");
    await sql.unsafe(migration);
    console.log("Applied 0000_init.sql");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
