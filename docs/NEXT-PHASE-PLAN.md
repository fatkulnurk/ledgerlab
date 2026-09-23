# Next-phase development plan (template)

> **Deliverable.** Fill this in and commit it as `docs/NEXT-PHASE-PLAN.md`.
> It is scored (G10). The seed investors will read it during due diligence, and
> Kira will use it to decide what to fund next. Replace every `TODO`.

|             |                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Author**  | TODO                                                                                     |
| **Date**    | TODO                                                                                     |
| **Horizon** | Next phase (e.g. 90 days)                                                                |
| **Phase**   | Phase 2 — from "trustworthy" to "growing"                                                |
| **Related** | [`INFRASTRUCTURE-PLAN.md`](INFRASTRUCTURE-PLAN.md), [`CLIENT-STORY.md`](CLIENT-STORY.md) |

---

## 1. Where we are

TODO — one short paragraph on the state **after** this engagement: correct
ledger, real database, deployed and monitored, security review passing, X
paying customers, current constraints.

## 2. Outcomes for this phase

Define 3–5 outcomes, not a feature list. Each has a **measurable** success
signal and the stakeholder who cares.

| #   | Outcome                          | Success signal                           | For whom    |
| --- | -------------------------------- | ---------------------------------------- | ----------- |
| O1  | Bank embed live for first cohort | 100 warungs approved for working capital | Bank / Kira |
| O2  | Books survive an audit           | CPA sign-off, zero unbalanced entries    | CPA         |
| O3  | TODO                             | TODO                                     | TODO        |
| O4  | TODO                             | TODO                                     | TODO        |

Candidate outcomes to consider (pick, don't sprawl): authentication and
multi-tenancy, an append-only audit trail, multi-currency, bank API
integration, mobile capture, statement import, accountant collaboration.

## 3. Prioritisation

Score the candidate work. Use RICE (Reach × Impact × Confidence ÷ Effort) or
state your own method. The **method** matters more than the exact numbers.

| Initiative             | Reach | Impact | Confidence | Effort | Score | Decision |
| ---------------------- | ----- | ------ | ---------- | ------ | ----- | -------- |
| Auth + tenant scoping  | TODO  | TODO   | TODO       | TODO   | TODO  | Now      |
| Audit trail            | TODO  | TODO   | TODO       | TODO   | TODO  | Now      |
| Multi-currency         | TODO  | TODO   | TODO       | TODO   | TODO  | Next     |
| Bank ledger export API | TODO  | TODO   | TODO       | TODO   | TODO  | Now      |
| TODO                   | TODO  | TODO   | TODO       | TODO   | TODO  | Later    |

TODO — note what you are explicitly **not** doing and why. Saying no is part of
the plan.

## 4. Milestones

Three milestones, each with **exit criteria** that are testable, and a date.
Work backward from the bank go-live.

| Milestone   | Window     | Contents | Exit criteria |
| ----------- | ---------- | -------- | ------------- |
| M1 — Harden | Weeks 1–4  | TODO     | TODO          |
| M2 — Embed  | Weeks 5–8  | TODO     | TODO          |
| M3 — Scale  | Weeks 9–13 | TODO     | TODO          |

## 5. Delivery plan

- **Capacity:** who does the work (you? a new hire?) and how much of their time.
- **Team shape:** the next two hires and why, in priority order.
- **Dependencies:** external teams (the bank, the CPA), and their lead times.
- **Cadence:** release rhythm, demo schedule, stakeholder updates.
- **Definition of done** for a work item on this team.

| Role | Needed by | Why  | Cost signal |
| ---- | --------- | ---- | ----------- |
| TODO | TODO      | TODO | TODO        |

## 6. Technical workstreams

Map each workstream to the infrastructure plan and the current codebase. Name the
files/services that will change.

| Workstream               | Depends on                  | First PR | Risk |
| ------------------------ | --------------------------- | -------- | ---- |
| Authentication + tenancy | —                           | TODO     | TODO |
| Append-only audit log    | DB schema                   | TODO     | TODO |
| Multi-currency reporting | `packages/shared/reporting` | TODO     | TODO |
| Bank export API          | Infra plan §7               | TODO     | TODO |

## 7. Risks and mitigations

| Risk                                | Likelihood | Impact | Mitigation | Owner |
| ----------------------------------- | ---------- | ------ | ---------- | ----- |
| Bank review slips                   | TODO       | High   | TODO       | TODO  |
| Schema migration on live money data | TODO       | High   | TODO       | TODO  |
| Single engineer bus factor          | TODO       | High   | TODO       | TODO  |

## 8. Metrics

The numbers this phase must move, with current values and targets.

| Metric                                   | Now   | Target   | Source     |
| ---------------------------------------- | ----- | -------- | ---------- |
| Weekly active businesses                 | 1,400 | TODO     | TODO       |
| % entries posted without support contact | TODO  | TODO     | TODO       |
| p95 ledger latency                       | TODO  | < 300 ms | Monitoring |
| Availability                             | TODO  | 99.9%    | Monitoring |
| Support tickets / 100 businesses         | TODO  | TODO     | Helpdesk   |

## 9. Explicitly deferred

| Item                            | Why deferred | Revisit when |
| ------------------------------- | ------------ | ------------ |
| Spanish/English localisation    | TODO         | TODO         |
| Native mobile app               | TODO         | TODO         |
| Real-time collaborative editing | TODO         | TODO         |

## 10. Decision log

At least two ADRs for phase-shaping decisions (e.g. "build auth vs buy an
identity provider"). Context → options → decision → consequences.

---

## How this is scored (G10)

- [ ] Outcomes are measurable and tied to a named stakeholder.
- [ ] Prioritisation uses a stated method with real trade-offs, not vibes.
- [ ] Milestones have testable exit criteria and dates that work backward from
      the bank go-live.
- [ ] The plan is honest about capacity (one engineer) and names the next hires.
- [ ] It says no to things, with reasons.
- [ ] Metrics have a source of truth, not guesses.
- [ ] It is a plan to _learn_, not a wish list of features.
