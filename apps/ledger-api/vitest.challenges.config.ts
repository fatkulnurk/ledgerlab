/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

/**
 * The challenge suite is RED on purpose. See docs/TASKS.md.
 * Run with: pnpm --filter @ledgerlab/ledger-api test:challenges
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/challenges/**/*.challenge.ts"],
  },
});
