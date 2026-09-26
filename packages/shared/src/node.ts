import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Marks the repository root (the only directory with this file). */
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

/** Walk up from `start` until the workspace root is found, or the filesystem ends. */
function findRepoRoot(start: string): string | undefined {
  let current = start;
  for (;;) {
    if (existsSync(join(current, WORKSPACE_MARKER))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/** Parse a dotenv-style file into key/value pairs. Comments and blanks are skipped. */
export function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
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
    values[key] = value;
  }
  return values;
}

/**
 * Load the repository-root `.env` into `env`, without overwriting anything that
 * is already set. Real environment variables (platform secrets, CI) always win.
 *
 * Returns the file that was loaded, or `undefined` when there is none. Absence is
 * not an error: production images ship without a `.env` and must boot unchanged.
 */
export function loadRootEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const root = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  if (!root) return undefined;
  const file = join(root, ".env");
  if (!existsSync(file)) return undefined;
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(file, "utf8")))) {
    if (env[key] === undefined) env[key] = value;
  }
  return file;
}
