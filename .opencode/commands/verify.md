---
description: Run the full CI gate (ai:verify, typecheck, test, challenge suite, build, format) and report failures with pasted evidence.
agent: test-runner
subtask: true
---

Run the repository's verification gate in the same order as CI, then report with pasted evidence.

1. `pnpm ai:verify`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm --filter @ledgerlab/ledger-api test:challenges`
5. `pnpm build`
6. `pnpm format:check`

Use your standard reporting format. Do not edit any code. On failure, stop at the first actionable error.

Note in the report that Postgres-backed tests are skipped without `DATABASE_URL`.

$ARGUMENTS
