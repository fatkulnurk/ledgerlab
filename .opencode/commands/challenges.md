---
description: Make the challenge suite pass by fixing production source only, never the specs.
agent: challenge-fixer
subtask: true
---

The challenge suite defines the required fixes. Run it; if any spec is red, restore it by fixing production source only.

1. Run `pnpm --filter @ledgerlab/ledger-api test:challenges` and read the result.
2. Trace it to the production function that is wrong, not the spec.
3. Apply the smallest correct fix; state the invariant it restores.
4. Re-run the suite, then `pnpm typecheck && pnpm test` for regressions.
5. Delete the guidance comment block in each challenge file that now passes.

Never edit, weaken, skip, or delete an assertion in a `*.challenge.ts` file.

$ARGUMENTS
