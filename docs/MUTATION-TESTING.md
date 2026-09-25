# Mutation testing

> **Purpose.** Prove that the tests actually _enforce_ the rules: for each
> critical rule, break it in the source and confirm a test fails. A rule with no
> failing test is a rule that can silently regress.

Run: 2026-09-26. Method: for each mutation, one rule is broken in a **tracked
source file** (never in a test), all four suites are run, then the file is
restored and `git status` is confirmed clean.

Suites run per mutation:

1. `packages/shared` — `pnpm exec vitest run`
2. `apps/reporting-api` — `pnpm exec vitest run`
3. `apps/ledger-api` — `pnpm exec vitest run`
4. `apps/ledger-api` challenges — `pnpm exec vitest run --config vitest.challenges.config.ts`

`KILLED` = at least one suite failed (the mutation is detected). `SURVIVED` = all
suites passed (the mutation is undetected).

## Results

| #   | Mutation (rule broken)                                 | File                                  | With `DATABASE_URL` | CI (no DB)   |
| --- | ------------------------------------------------------ | ------------------------------------- | ------------------- | ------------ |
| M1  | remove `entryDate <= asOf` from trial balance          | `shared/reporting.ts`                 | KILLED              | KILLED       |
| M3  | service void guard → `if (false)`                      | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M4  | memory void guard → `if (false)`                       | `db/memory-repository.ts`             | KILLED              | KILLED       |
| M5  | postgres void guard: drop `status='POSTED'` from WHERE | `db/postgres-repository.ts`           | KILLED              | **SURVIVED** |
| M6  | service inactive-account check → `if (false)`          | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M7  | memory inactive-account check → `if (false)`           | `db/memory-repository.ts`             | KILLED              | KILLED       |
| M8  | postgres inactive-account check → `if (false)`         | `db/postgres-repository.ts`           | KILLED              | **SURVIVED** |
| M9  | `isClosed` → `return false`                            | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M10 | void-in-closed-period check → `if (false)`             | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M11 | `isBalanced` → `return true`                           | `shared/money.ts`                     | KILLED              | KILLED       |
| M12 | real-calendar-date refine → `return true`              | `shared/domain.ts`                    | KILLED              | KILLED       |
| M13 | rate limiter block branch → `if (false)`               | `shared/security.ts`                  | KILLED              | KILLED       |
| M14 | `assertProductionConfig` → `return`                    | `shared/security.ts`                  | KILLED              | KILLED       |
| M15 | CORS echoes any origin                                 | `ledger-api/app.ts`                   | KILLED              | KILLED       |
| M16 | HSTS header emptied                                    | `ledger-api/app.ts`                   | KILLED              | KILLED       |
| M17 | `aggregate` drops the `isPosted` skip                  | `shared/reporting.ts`                 | **SURVIVED**        | **SURVIVED** |
| M18 | zero-amount line check → `if (false)`                  | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M19 | min-two-lines check → `if (false)`                     | `ledger-api/ledger-service.ts`        | KILLED              | KILLED       |
| M20 | memory duplicate-code check → `if (false)`             | `db/memory-repository.ts`             | KILLED              | KILLED       |
| M21 | rate-limit key uses leftmost XFF hop                   | `ledger-api/middleware/rate-limit.ts` | KILLED              | KILLED       |
| M22 | internal token: drop `.trim()`                         | `shared/security.ts`                  | KILLED              | KILLED       |
| M23 | memory date-range filters removed                      | `db/memory-repository.ts`             | KILLED              | KILLED       |
| M24 | postgres date-range filters removed                    | `db/postgres-repository.ts`           | KILLED              | **SURVIVED** |
| M25 | seed dedupe by `reference` removed                     | `db/seed.ts`                          | KILLED              | KILLED       |
| M26 | memory same-date sort tiebreaker removed               | `db/memory-repository.ts`             | KILLED              | KILLED       |

**Score:** 24/25 killed with a real database; 21/25 killed in CI.

## Survivors, honestly

### M17 — equivalent mutant (not a gap)

`aggregate()` in `packages/shared/src/reporting.ts` skips non-`POSTED` postings.
Every caller (`buildTrialBalance`, `buildIncomeStatement`, `buildBalanceSheet`)
already pre-filters with `isPosted` before calling it, so removing the inner
check changes nothing observable — verified by running all four suites with and
without `DATABASE_URL` (all pass). This is a **redundant defence-in-depth guard**,
not an untested rule. It is deliberately kept.

### M5, M8, M24 — real gap in CI (documented)

Three Postgres-adapter rules are only exercised when `DATABASE_URL` is set:

- M5 — void is a guarded transition (conditional `UPDATE ... WHERE status='POSTED'`)
- M8 — inactive accounts are rejected
- M24 — `from`/`to` date filters

Without `DATABASE_URL`, `apps/ledger-api/src/__tests__/repository-contract.test.ts`
skips the Postgres block, so CI (which has no database) cannot detect these.
**Mitigation:** run the contract test against a real database before releasing:

```bash
pnpm db:up
DATABASE_URL=postgres://ledgerlab:ledgerlab@localhost:5432/ledgerlab \
  pnpm --filter @ledgerlab/ledger-api test
```

Adding a Postgres service to CI would close this gap; it is deferred and
recorded here rather than hidden.

## Test-isolation fix found during this exercise

The first run produced a **false kill** for M17: the Postgres contract tests
accumulated rows across runs, so an unrelated assertion failed for environmental
reasons. The contract test now truncates `journal_lines`, `journal_entries` and
`accounts` before each Postgres case, which made the results reproducible (the
matrix above was re-run and is deterministic).

## Reproduce

The mutations are applied to tracked files and reverted; a clean working tree is
required before and after:

```bash
git status --porcelain          # expect empty
DATABASE_URL=postgres://... pnpm --filter @ledgerlab/ledger-api test   # 51 passed
pnpm --filter @ledgerlab/ledger-api test:challenges                    # 4 passed
```
