# Submission

**Candidate:** Warung Books engineering (technical test)
**Date:** 2026-09-26
**Time spent:** ~1 day of focused work (G0–G5 + deploy config)

## Deployed URLs

| Surface       | URL                              | `/health`                                                                                                   |
| ------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Dashboard     | _pending — needs Render account_ | —                                                                                                           |
| Ledger API    | _pending_                        | `{"status":"ok","service":"ledger-api","repository":"postgres"}` (verified locally in the production image) |
| Reporting API | _pending_                        | `{"status":"ok","service":"reporting-api",...}` (verified locally)                                          |

**Cloudflare / custom domain:** not attempted — requires a Render account and a
domain I control. The Cloudflare configuration to apply is documented in
`deployment/cloudflare/README.md` and summarised below.

> Honest note: the **application and deployment config are complete and verified
> end to end with the production Docker images against real Postgres**, but the
> live Render deployment was not executed because it needs the account owner to
> authorise it. `render blueprint launch` is the one command that completes it.

## What I changed

**G0 — Fix the errors**

- Challenge A: `buildTrialBalance` ignored `asOf`. It now scopes postings to
  `entryStatus === "POSTED" && entryDate <= asOf` (`packages/shared/src/reporting.ts`).
- Challenge B: voiding was unguarded. `POSTED → VOID` is now the only legal
  transition, throwing `ConflictError` (409) otherwise — enforced in the service
  **and** both repository adapters, with the Postgres adapter using a conditional
  `UPDATE ... WHERE status='POSTED'` to close the race.
- Deleted the guidance comment blocks in both challenge files (specs untouched).

**G1 — Core ledger**

- Closed-period rule (`CLOSED_THROUGH`) and inactive-account rejection, enforced
  in the service and both adapters.
- Void is blocked inside a closed period.
- Real-calendar-date validation (`2026-06-31` is rejected).
- New tests: port-level balancing contract (memory + Postgres), inactive-account
  contract, VOID-exclusion regression for income statement and balance sheet,
  asOf scoping.

**G2 — Un-slop UI**

- `Async` gained an empty state; every list has a designed empty state.
- Money is right-aligned and tabular everywhere (stat cards, dashboard, inputs).
- Account-type badge switched from accent to neutral; accent is reserved for
  primary actions.
- Inline money validation with the real `parseAmountToMinor` error message.
- Ledger list: status + date-range filters, `aria-expanded`/`aria-controls`.
- Mobile navigation added; `JSON.parse` guarded; focus-visible styles.

**G3 — Real database**

- Migrations via a plain-Node runner (`packages/db/migrate.mjs`) with a
  `schema_migrations` table — idempotent, run as a deploy step, never on boot.
- Idempotent seeding that pages through all entries.
- Connection pool configurable (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT_SECONDS`).
- Verified: `/health` reports `repository: postgres`; contract tests pass against
  Postgres.

**G4 — Production-scale deploy**

- `.dockerignore`; images rebuilt to install prod-only deps with a frozen
  lockfile and run as non-root.
- `render.yaml`: `numInstances: 2`, `preDeployCommand` migrations, pool/rate-limit
  env, full security headers on the static site.
- `docker-compose.yml` + root scripts (`db:up`, `db:migrate`, `db:seed`,
  `docker:build`) for a reproducible local stack.

**G5 — Security**

- Rate limiting on `/api/*` (120/60 s per IP, keyed on the trusted proxy hop).
- `/api/internal/*` fails closed in production.
- Startup refuses to boot on `CORS_ORIGINS=*` or a missing `INTERNAL_API_TOKEN`.
- HSTS + `nosniff` + `X-Frame-Options: DENY` + `Permissions-Policy` on the APIs
  and in `nginx.conf`.

**G7/G8 — Process**

- 23 AI interactions logged, including a rejected suggestion.
- Two custom sub-agents added (`db-migrator`, `challenge-fixer`) and used;
  `ledger-architect` caught 9 real defects in an audit.

## Challenge suite

```
pnpm --filter @ledgerlab/ledger-api test:challenges

 ✓ src/challenges/asof.challenge.ts (2 tests) 18ms
 ✓ src/challenges/void.challenge.ts (2 tests) 18ms

 Test Files  2 passed (2)
      Tests  4 passed (4)
```

- **Challenge A** (`asOf`): the builder aggregated every posting and only echoed
  `asOf` as a label. Fix: filter to POSTED postings on or before `asOf` before
  aggregating, mirroring `buildBalanceSheet`.
- **Challenge B** (void): the adapter overwrote the status unconditionally. Fix:
  guard the transition in the service and both adapters; return `409 CONFLICT`
  for anything that is not a POSTED entry.

## Database

- Engine and version: PostgreSQL 16 (Drizzle ORM).
- Migrations: `pnpm db:migrate` → `node packages/db/migrate.mjs` (idempotent,
  records applied files in `schema_migrations`).
- Seeding: `pnpm db:seed` (idempotent by account code and entry reference).
- Why this engine: the bank requires PITR and a tested restore; SQLite could not
  meet that, and Postgres was already wired via Drizzle.

## Deployment

- Target: Render (Singapore), Cloudflare in front.
- Reproduce it: `render blueprint launch` (blueprint committed at
  `deployment/render.yaml`); local equivalent is
  `pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm docker:build`.
- Scaling: `numInstances: 2` per API service; scale on CPU 60%.
- Secrets: Render secret store; `INTERNAL_API_TOKEN` generated and shared via
  `fromService`; no secret in git.
- Migrations as a deploy step: `preDeployCommand` on the ledger service.

## Security

- `INTERNAL_API_TOKEN` evidence (local, production image):
  `GET /api/internal/postings` → `401` without a token, `401` with a wrong token,
  `200` with the correct token; production boot with no token → `401` for every
  internal request.
- CORS: exact allowlist. `Origin: https://evil.example` is **not** echoed;
  `Origin: https://app.example.com` is. `CORS_ORIGINS=*` refuses to boot in
  production.
- Headers/HSTS: `strict-transport-security: max-age=31536000; includeSubDomains;
preload`, `x-content-type-options: nosniff`, `x-frame-options: DENY`,
  `referrer-policy: strict-origin-when-cross-origin`.
- Rate limiting: 120 req / 60 s per IP → `429` with `Retry-After`. Evidence: 130
  rapid requests → 117 × `200` then 13 × `429` (`Retry-After: 17`).
- Known gaps: auth and multi-tenancy are not built. To add them: a managed OIDC
  provider with short-lived tokens, `tenant_id` row scoping on every query, and an
  append-only audit log of who posted/voided what (see the next-phase plan).

## Cloudflare + TLD (bonus)

- Domain: not attempted (needs the account owner). Plan in
  `deployment/cloudflare/README.md`.
- TLS mode: Full (strict), Always Use HTTPS, HSTS preload.
- WAF rule: managed OWASP core ruleset on all hosts.
- Rate-limit rule: 100 req/min/IP → Block 60 s on the API hosts.
- `/api/internal/*` blocked at edge: custom rule expression
  `(http.host eq "api.<tld>" and starts_with(http.request.uri.path, "/api/internal/"))`.
- Cache rules: `/assets/*` cache 1 year; SPA document and all API paths bypass.

## Infrastructure plan (G9)

- Document: `docs/INFRASTRUCTURE-PLAN.md` — complete.
- Topology: Cloudflare → Render (static SPA + 2 API services ×2 replicas) →
  managed Postgres on a private network.
- RPO / RTO: RPO ≤ 5 min (PITR), RTO ≤ 30 min.
- Restore drill: **performed 2026-09-26** — `pg_dump` 301 ms, drop/recreate,
  `pg_restore` 694 ms; row counts identical (14 accounts, 6 entries, 12 lines);
  `SUM(amount_minor) = 0`.
- Cost at 1× / 3× / 10×: $35 / $90 / $320 per month.
- First bottleneck at 10×: the database — buy a standby replica and a connection
  pooler before adding more API replicas.
- ADRs: managed Postgres, Render, signed integer minor units, in-process + edge
  rate limiting.

## Next-phase plan (G10)

- Document: `docs/NEXT-PHASE-PLAN.md` — complete.
- Outcomes: bank embed for 100 warungs; audit sign-off; safe-to-grow (auth +
  tenancy); lower support cost.
- Prioritisation method and top initiative: RICE; top is auth + tenant scoping.
- Milestones: M1 Harden (weeks 1–4), M2 Embed (5–8), M3 Scale (9–13), each with
  testable exit criteria working back from bank go-live.
- Next hires: backend engineer (week 9), support/ops engineer (week 11).
- Explicitly deferred: multi-currency beyond grouping, native mobile app,
  real-time collaboration, self-serve signup.

## AI usage

- Entries in `docs/ai/prompt-log.jsonl`: **23**.
- A prompt I **rejected** and why: I rejected adding a Postgres trigger/CHECK
  constraint to enforce the balancing invariant at the database level — the rule
  is already enforced in the service and both adapters, a per-entry deferred
  constraint is awkward with a signed single column, and it added untestable
  migration weight. Chose a port-level contract test instead.
- How I verified AI output: every claim is backed by a command — typecheck, tests,
  the challenge suite, `curl` against the running services, and the production
  Docker images run against real Postgres. An AI-authored audit was re-checked by
  reproducing each reported defect before fixing it.

## Sub-agents

| Agent              | File                                  | What it did                                                              |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------ |
| `ledger-architect` | `.opencode/agent/ledger-architect.md` | Audited correctness; found 9 real defects (incl. a closed-period bypass) |
| `ui-unslop`        | `.opencode/agent/ui-unslop.md`        | Un-slopped the dashboard against `docs/DESIGN.md`                        |
| `test-runner`      | `.opencode/agent/test-runner.md`      | Ran typecheck/test/build and reported failures                           |
| `deploy-security`  | `.opencode/agent/deploy-security.md`  | Hardened and verified deploy + security controls                         |
| `db-migrator`      | `.opencode/agent/db-migrator.md`      | Own agent: migrations, seeding, pool, adapter parity                     |
| `challenge-fixer`  | `.opencode/agent/challenge-fixer.md`  | Own agent: source-only fixes for the challenge specs                     |

- Defect a sub-agent caught: `ledger-architect` found that the closed-period guard
  compared raw strings, so `2026-06-31` slipped past `CLOSED_THROUGH=2026-06-30`.
  Fixed with real-calendar-date validation plus a regression test.

## Verification

```
pnpm format:check   # PASS
pnpm typecheck      # PASS
pnpm test           # PASS (82 passed, 6 skipped without DATABASE_URL)
pnpm build          # PASS
pnpm ai:verify      # PASS (24 entries)
pnpm --filter @ledgerlab/ledger-api test:challenges   # PASS (4/4)
```

Postgres-backed run (Turborepo does not forward `DATABASE_URL`, so call the
filter directly):

```
DATABASE_URL=postgres://… pnpm --filter @ledgerlab/ledger-api test
# PASS (51 passed, including the Postgres repository contract)
```

**Rules are proven by mutation testing** (`docs/MUTATION-TESTING.md`): 25 rules
were broken in source and 24 were detected by a failing test with a database
(21 in CI). The single survivor is an equivalent mutant (a redundant
defence-in-depth guard whose callers already pre-filter); the three
Postgres-adapter rules that CI cannot reach are recorded as a known gap.

## What I skipped and why

- **Live Render deployment and Cloudflare/TLD (G4/G6):** the config and images
  are complete and verified locally, but launching them needs the account owner.
  Underscoping, not hiding.
- **UI polish beyond the design rules:** the enforced rules are met, but a
  hierarchy pass (bundled Inter font, per-section report subtotals, arrow-key
  navigation on the ledger list, skeleton loading) was deliberately deferred so
  the correctness and security work stayed solid.
- **Observability beyond platform logs and health checks:** acceptable at 1×;
  alerts and tracing are costed in the infrastructure plan for 3×.
- **Auth and multi-tenancy:** out of scope for the test; specified in the
  next-phase plan with an ADR.
- **Extra credit (multi-currency, CSV export, OpenAPI, load test):** deferred to
  keep the correctness and security work solid rather than broad.

## If I had more time

1. Deploy to Render and record the live `/health`, `dig`, `curl -I`, and a WAF
   event as the G4/G6 evidence.
2. Add OpenAPI generation from the Zod schemas so the API contract is
   machine-checkable.
3. Add a k6/autocannon load test to replace the estimated capacity math with
   measured numbers.
4. Add an append-only audit trail (`audit_events`) as the first slice of the
   next-phase plan.
