# Tasks

Ordered backlog. Work top to bottom; stop and document when you run out of time.
Every completed item should have evidence (a test, a command, or a screenshot).

Legend: **P0** blocks everything · **P1** core · **P2** required for full marks ·
**P3** stretch.

---

## P0 — Fix the errors

- [ ] `pnpm --filter @ledgerlab/ledger-api test:challenges` is red. Make it green
      **by fixing production code**, never the specs.
  - **Challenge A** (`src/challenges/asof.challenge.ts`) — `buildTrialBalance`
    ignores `asOf`, so periods bleed into each other. Fix the date filtering in
    `packages/shared/src/reporting.ts`.
  - **Challenge B** (`src/challenges/void.challenge.ts`) — voiding is an
    unguarded state change. Make `POSTED → VOID` the only legal transition and
    return `409 CONFLICT` otherwise. Touch `LedgerService` and both repository
    adapters.
- [ ] `pnpm typecheck && pnpm test && pnpm build` all pass from a clean clone.

## P1 — Core ledger correctness

- [ ] Add a test that proves the balancing invariant for the Postgres adapter
      too (or for the port in general), not just the in-memory one.
- [ ] Reject journal lines that reference an **inactive** account.
- [ ] Reject entries dated in a closed accounting period (add a `periods` table
      or a simple `closedThrough` setting; document the rule you chose).
- [ ] Income statement and balance sheet must exclude `VOID` entries — add a
      regression test.
- [ ] `pnpm --filter @ledgerlab/ledger-api test:challenges` green in CI.

## P2 — Product quality

- [ ] Un-slop the dashboard per [`DESIGN.md`](DESIGN.md): remove decorative
      icons, gradients, excess nested cards; fix hierarchy and spacing.
- [ ] Empty, loading, and error states on every page.
- [ ] Keyboard access: the ledger list is navigable, the entry form is usable
      without a mouse.
- [ ] Money input rejects bad values with an inline message (uses
      `parseAmountToMinor` errors).
- [ ] Pagination and filtering on the ledger list (status, date range).

## P2 — Database

- [ ] Run against a real database (`docs/DATABASE.md`). PostgreSQL is wired;
      MySQL/SQLite are accepted if you implement the port.
- [ ] Migrations applied as a deploy step, not on boot.
- [ ] Seeding is idempotent and scripted.
- [ ] Connection pooling configured and documented.

## P2 — Deploy, scale, secure

- [ ] Deploy to Render / AWS / GCP / Azure (one is enough).
- [ ] Health checks wired; ≥2 replicas or `min-instances ≥ 1`.
- [ ] Secrets in the platform store; **no** secret in the repo.
- [ ] `CORS_ORIGINS` restricted; `INTERNAL_API_TOKEN` set.
- [ ] HSTS + secure headers at the edge.
- [ ] Rate limit on `/api/*`.
- [ ] Migrations run as a job/step, not at container start.

## P3 — Bonus (Cloudflare + TLD)

- [ ] Custom domain on a real TLD, proxied through Cloudflare.
- [ ] TLS Full (strict), Always Use HTTPS, HSTS.
- [ ] WAF managed rules + a rate-limit rule.
- [ ] `/api/internal/*` blocked at the edge.
- [ ] Cache rules: assets cached, API bypassed.
- [ ] Evidence committed (`dig`, `curl -I`, WAF event screenshot).

## P3 — Extra credit

- [ ] Multi-currency: reports must not sum across currencies silently. Group by
      currency or require an explicit FX rate.
- [ ] Audit trail: who changed what, when.
- [ ] CSV or PDF export for the trial balance.
- [ ] OpenAPI spec generated from the route schemas.
- [ ] A load test (`k6`/`autocannon`) with results committed.

---

## Definition of done (whole test)

1. `pnpm typecheck && pnpm test && pnpm build` green.
2. `pnpm --filter @ledgerlab/ledger-api test:challenges` green.
3. `pnpm ai:verify` green and the log is honest.
4. Deployed URL with `/health` returning `200`.
5. `docs/SUBMISSION.md` written: changes, decisions, evidence, limitations.
