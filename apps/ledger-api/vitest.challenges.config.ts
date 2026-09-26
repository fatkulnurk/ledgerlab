/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

/**
 * The challenge specs define the required fixes (see docs/TASKS.md). They run
 * outside the default suite; keep them green by fixing production source only.
 * Run with: pnpm --filter @ledgerlab/ledger-api test:challenges
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/challenges/**/*.challenge.ts"],
  },
});
