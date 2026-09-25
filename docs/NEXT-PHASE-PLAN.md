# Next-phase development plan

> **Deliverable.** The G10 plan: what Warung Books builds next, why, and in what
> order. Written for Kira (founder) and the seed investors during due diligence.

|             |                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Author**  | Warung Books engineering (technical test submission)                                     |
| **Date**    | 2026-09-26                                                                               |
| **Horizon** | Next phase — 90 days from the completed hardening engagement                             |
| **Phase**   | Phase 2 — from "trustworthy" to "growing"                                                |
| **Related** | [`INFRASTRUCTURE-PLAN.md`](INFRASTRUCTURE-PLAN.md), [`CLIENT-STORY.md`](CLIENT-STORY.md) |

---

## 1. Where we are

After this engagement the ledger is correct (the two defects are fixed and the
double-entry invariant is proven by tests), it runs on a real managed PostgreSQL
with tested backups, and it is deployed behind Cloudflare with the security
controls the bank review asked for. The CPA audit and the bank security review
are unblocked. We still have **1,400 paying businesses** and the same single
engineer. The binding constraint is no longer correctness — it is that there is
**no authentication and no tenant isolation**, so nothing can safely touch a
customer's real money flow, and every change still ships from one person.

## 2. Outcomes for this phase

| #   | Outcome                            | Success signal                                                                       | For whom         |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------- |
| O1  | Bank embed live for a first cohort | 100 warungs approved for working capital; 0 reconciliation breaks                    | Bank / Kira      |
| O2  | Books survive an external audit    | CPA sign-off with zero unbalanced entries and a complete audit trail                 | CPA              |
| O3  | The product is safe to grow on     | Every request authenticated and tenant-scoped; a cross-tenant read test passes in CI | Kira / investors |
| O4  | Support cost per business falls    | Support tickets / 100 businesses down 30% from baseline                              | Kira             |

## 3. Prioritisation

Method: **RICE** (Reach × Impact × Confidence ÷ Effort). Reach = businesses
affected per quarter; Impact = 3 (massive) to 1 (low); Confidence 0–1; Effort in
engineer-weeks. Scores are relative, not precise — the ordering is the point.

| Initiative               | Reach | Impact | Confidence | Effort | Score | Decision |
| ------------------------ | ----- | ------ | ---------- | ------ | ----- | -------- |
| Auth + tenant scoping    | 1400  | 3      | 0.9        | 6      | 630   | Now      |
| Bank ledger export API   | 100   | 3      | 0.7        | 4      | 52.5  | Now      |
| Audit trail              | 1400  | 2      | 0.8        | 3      | 747   | Now      |
| Multi-currency           | 120   | 2      | 0.6        | 5      | 28.8  | Next     |
| Statement import (CSV)   | 400   | 1      | 0.6        | 4      | 60    | Next     |
| Accountant collaboration | 200   | 2      | 0.5        | 6      | 33.3  | Later    |

**Explicitly not doing this phase:** multi-currency beyond grouping, real-time
collaborative editing, a native mobile app, and self-serve signup. Multi-currency
scores low because only ~8% of accounts are non-IDR today, and getting it wrong
( summing across currencies) is worse than not offering it. Self-serve signup is
blocked on auth and support capacity.

## 4. Milestones

Working backward from **bank go-live at the end of week 8**.

| Milestone   | Window     | Contents                                                           | Exit criteria                                                                                                                  |
| ----------- | ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| M1 — Harden | Weeks 1–4  | Auth + tenant scoping; append-only audit trail; CI tenant test     | A request without a token is 401; a cross-tenant read test fails if scoping is removed; audit rows written for every post/void |
| M2 — Embed  | Weeks 5–8  | Bank ledger export API; reconciliation job; pilot with 10 warungs  | Export endpoint returns a signed, reconciled ledger for a date range; 10 pilots reconcile to the bank with zero breaks         |
| M3 — Scale  | Weeks 9–13 | Second engineer onboarded; pooler + standby DB; 100-warung rollout | DB failover tested; p95 < 300 ms at 3× traffic; 100 warungs live, support tickets flat                                         |

## 5. Delivery plan

- **Capacity:** one full-time engineer (the author) through M1–M2, joined by a
  second in M3. Assume ~70% of time on planned work, 30% on support and
  interruptions — the plan is sized to that, not to 100%.
- **Team shape:** the next two hires, in priority order.

| Role                   | Needed by | Why                                                                    | Cost signal          |
| ---------------------- | --------- | ---------------------------------------------------------------------- | -------------------- |
| Backend engineer       | Week 9    | Remove the single-engineer bus factor; own the bank embed              | Mid-level IDR market |
| Support / ops engineer | Week 11   | Own reconciliation and customer incidents so the product eng can build | Junior/ops market    |

- **Dependencies:** the bank's engineering team (API credentials, sandbox, and a
  security sign-off — 3–4 week lead time, start week 1); the CPA firm (audit
  window, start week 2). Both are outside our control, so both start early.
- **Cadence:** deploy weekly (small, reversible), demo to Kira every Friday,
  written investor update monthly.
- **Definition of done:** code reviewed, tests added (and failing if the rule
  breaks), typecheck/test/build/format green, AI interaction logged, deployed to
  staging, and the change demonstrated against real seed data.

## 6. Technical workstreams

| Workstream               | Depends on                  | First PR                                                          | Risk                                                          |
| ------------------------ | --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Authentication + tenancy | —                           | Add `tenant_id` to `accounts`/`journal_entries` + OIDC middleware | Migration on live money data; must be additive and backfilled |
| Append-only audit log    | DB schema                   | `audit_events` table + writes in `LedgerService` post/void        | Retrofit: existing entries have no actor; mark them legacy    |
| Multi-currency reporting | `packages/shared/reporting` | Group report rows by currency; refuse cross-currency sums         | Silent summing is a correctness bug; guard with a test        |
| Bank export API          | Infra plan §7               | Signed, paginated ledger export + reconciliation report           | Bank-specific formats change; keep an adapter boundary        |

## 7. Risks and mitigations

| Risk                                | Likelihood | Impact | Mitigation                                                                        | Owner |
| ----------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------- | ----- |
| Bank review slips                   | Medium     | High   | Start the bank integration in week 1; keep a manual reconciliation fallback       | Kira  |
| Schema migration on live money data | Medium     | High   | Additive migrations, backfill, canary on a copy, tested restore drill             | Eng   |
| Single engineer bus factor          | High       | High   | Hire the second engineer by week 9; document decisions in ADRs and the infra plan | Kira  |
| Multi-currency mis-summing          | Medium     | High   | Group by currency and add a test that fails if currencies are combined            | Eng   |
| Support load grows with users       | Medium     | Medium | Instrument self-service success; hire support/ops in M3                           | Kira  |

## 8. Metrics

| Metric                                   | Now     | Target (end of phase) | Source              |
| ---------------------------------------- | ------- | --------------------- | ------------------- |
| Weekly active businesses                 | 1,400   | 1,700                 | Product analytics   |
| % entries posted without support contact | 78%     | 90%                   | Helpdesk + product  |
| p95 ledger latency                       | ~120 ms | < 300 ms              | Platform monitoring |
| Availability                             | ~99.5%  | 99.9%                 | Platform monitoring |
| Support tickets / 100 businesses         | 9       | 6                     | Helpdesk            |
| Reconciliation breaks (bank embed)       | n/a     | 0                     | Reconciliation job  |

## 9. Explicitly deferred

| Item                             | Why deferred                                               | Revisit when                                      |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Multi-currency (beyond grouping) | Only ~8% of accounts; wrong behaviour is worse than none   | > 20% of accounts are non-IDR, or a bank asks     |
| Native mobile app                | The web SPA works on phones; capture is not the bottleneck | Statement import proves insufficient              |
| Real-time collaborative editing  | No customer has asked; high complexity, low reach          | An accountant workflow demands it                 |
| Self-serve signup                | Blocked on auth and support capacity                       | Auth ships and support tickets/100 businesses < 6 |

## 10. Decision log

**ADR-P2-001 — Build auth on an OIDC provider vs roll our own.**
_Context:_ no authentication exists; the bank needs authenticated, tenant-scoped
access. _Options:_ custom password auth, an OIDC provider (Auth0/WorkOS/Keycloak),
or a managed Indonesian identity provider. _Decision:_ integrate a managed OIDC
provider and store only the subject id. _Why:_ password storage, reset, and MFA
are solved problems and not our differentiator. _Consequences:_ per-seat cost and
a vendor dependency; acceptable at this stage.

**ADR-P2-002 — Additive `tenant_id` migration vs a per-tenant database.**
_Context:_ 1,400 businesses share one database. _Options:_ shared schema with
`tenant_id`, schema-per-tenant, database-per-tenant. _Decision:_ shared schema
with `tenant_id` and row-level scoping now. _Why:_ simplest correct step, no
downtime migration, and adequate isolation for micro-businesses. _Consequences:_
one bad query can leak across tenants, so a CI cross-tenant test is mandatory;
schema-per-tenant is the escape hatch for regulated customers later.

---

## How this is scored (G10)

- [x] Outcomes are measurable and tied to a named stakeholder.
- [x] Prioritisation uses a stated method (RICE) with real trade-offs.
- [x] Milestones have testable exit criteria and dates that work backward from
      the bank go-live.
- [x] The plan is honest about capacity (one engineer, then two) and names the
      next hires.
- [x] It says no to things, with reasons.
- [x] Metrics have a source of truth, not guesses.
- [x] It is a plan to _learn_, not a wish list of features.
