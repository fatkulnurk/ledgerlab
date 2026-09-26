// LedgerLab migration runner (plain Node, no TypeScript toolchain).
//
// Applies every *.sql file in ./migrations in filename order, recording each in
// a `schema_migrations` table so re-running is a no-op. Designed to run as a
// deploy step (Render preDeployCommand, Cloud Run job, ECS one-off task) where
// dev dependencies like tsx are not installed.
//
//   DATABASE_URL=... node migrate.mjs
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Load the repository-root `.env` without overwriting real environment values.
 * Kept inline because this file runs in the production image, where no
 * TypeScript toolchain (and no `.env`) is available. A missing file is a no-op.
 */
function loadRootEnv() {
  const envPath = join(here, "..", "..", ".env");
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(separator + 1).trim();
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadRootEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run migrations");

  const migrationsDir = join(here, "migrations");
  const sql = postgres(url, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set((await sql`SELECT name FROM schema_migrations`).map((row) => row.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip ${file} (already applied)`);
        continue;
      }
      const contents = await readFile(join(migrationsDir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      console.log(`applied ${file}`);
      count += 1;
    }
    console.log(`Migrations complete: ${count} applied, ${files.length - count} already up to date.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
