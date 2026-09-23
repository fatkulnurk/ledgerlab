# The client and the mandate

> **Scenario brief.** This is fiction, but work it as a real engagement. Every
> technical goal in this test exists because of something on this page.

## The client

|                   |                                                                    |
| ----------------- | ------------------------------------------------------------------ |
| **Company**       | Warung Books (PT Warung Buku Digital), Jakarta                     |
| **Product**       | Bookkeeping and cash-flow tracking for Indonesian micro-businesses |
| **Founder & CEO** | Kira Mandala — ex-café owner, not an engineer                      |
| **Stage**         | Seed. 1,400 paying businesses, growing ~30% month over month       |
| **Throughput**    | ~62,000 journal lines and Rp 4.1bn of recorded value per month     |
| **Handing over**  | The codebase extracted into **this repository**                    |
| **You are**       | The first senior engineer they have hired                          |

## How it got here

Kira ran a small café and could not afford an accountant. One weekend she built
the first version of Warung Books **with an AI app builder** — describing screens
in plain language, pasting whatever the model produced, shipping it. It worked
well enough that she shared it in a few WhatsApp groups for café owners. It
spread. Within a year, 1,400 businesses depended on it to know whether they were
making money.

The growth was real. The engineering underneath it was not:

- The whole app is **one service** holding the database, the ledger, and the
  reporting logic. It falls over when the monthly reconciliation job runs.
- It uses a **SQLite file on a single VM**. There are no backups anyone has
  tested. If that VM dies, so does the company.
- `CORS` is `*`. There is **one shared API password in the repo**, and it has
  been rotated exactly never.
- There are **no automated tests**. Kira fixes things by clicking around the UI.
- Nobody has ever checked whether the ledger's debits equal its credits. It is
  an accounting product; that is the one thing that must be true.

Some of the mess has already been cleaned up in the extraction: money is stored
as integer minor units, the ledger and reporting concerns are separated, and a
storage port exists so the database can be swapped. Two real defects were left
in **on purpose** — they are the ones that scare Kira's accountant.

## What you are inheriting

| Symptom in the story                                 | Evidence in this repo                                   | Risk                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| "Reports for a month bleed into the next"            | `buildTrialBalance` ignores `asOf` (**Challenge A**)    | Misstated financials; audit failure                  |
| "Entries get voided twice and the trail looks wrong" | `voidJournalEntry` has no state guard (**Challenge B**) | Audit-trail defect; looks like fraud                 |
| "It's a website, not an application"                 | `packages/ui` is usable but inconsistent                | Customers don't trust money UIs that look like demos |
| "One VM, one file"                                   | `InMemoryLedgerRepository` is the default               | Total data loss on restart/host failure              |
| "The repo has a password in it"                      | see `.env.example` and `docs/SECURITY.md`               | Credential compromise                                |
| "Anyone can call the internal API"                   | `/api/internal/*` is public unless the token is set     | Data exfiltration                                    |
| "It fell over at 9pm on payday"                      | Single instance, no autoscaling, no health checks       | Revenue and reputation loss                          |
| "We can't answer the bank's security questionnaire"  | No WAF, no rate limiting, no real domain, no headers    | The partnership dies                                 |

## Why now (the burning platform)

1. **An audit that matters.** Kira's accounting partner, a licensed CPA, has
   agreed to review Warung Books' output — but only if the trial balance is
   correct and the void trail is defensible. Review starts **mid-October**.
2. **A bank partnership.** A working-capital lender wants to embed Warung Books
   so their micro-business clients can qualify for loans. Their vendor security
   review requires: a managed database with tested backups, no secrets in source
   control, rate limiting, a WAF, HTTPS on a **domain they recognise** (not a
   `*.onrender.com` URL), and evidence of uptime monitoring. Targeting
   **17 October 2026**.
3. **A seed round.** Due diligence opens **28 November 2026**. Investors will
   ask for uptime numbers and a data-loss story.
4. **Growth.** Traffic tripled last quarter. The single instance is already
   hitting CPU limits during the nightly reconciliation.

## The mandate

Take Warung Books from a vibe-coded prototype to something a bank and an
accountant will trust — without breaking the 1,400 businesses already using it.

That is exactly this repository's goals:

| Mandate                                                                             | Goal       |
| ----------------------------------------------------------------------------------- | ---------- |
| Fix the defects the accountant will find                                            | **G0, G1** |
| Make the money UI trustworthy                                                       | **G2**     |
| Move off a single in-memory/file store to a real, backed-up database                | **G3**     |
| Survive payday traffic; deploy reproducibly                                         | **G4**     |
| Pass the bank's security questionnaire                                              | **G5**     |
| A domain and edge the bank recognises                                               | **G6**     |
| Work in a way a future team can audit                                               | **G7, G8** |
| Give the bank a plan they can approve, with tested backups and a costed path to 10× | **G9**     |
| Give investors a credible plan for the phase after this one                         | **G10**    |

## What "good" looks like

| Measure                   | Today              | Target                                                   |
| ------------------------- | ------------------ | -------------------------------------------------------- |
| Trial balance correctness | Unverified         | Correct for any `asOf`; regression-tested                |
| Void transition           | Unguarded          | `POSTED → VOID` only; `409` otherwise                    |
| Availability              | Best effort        | 99.9% with health-checked replicas                       |
| p95 API latency           | Unknown            | < 300 ms on the ledger reads                             |
| Backups                   | None tested        | Daily, with a **tested restore**                         |
| Secrets in git            | Yes                | Zero; all from a secret store                            |
| Public internal API       | Yes                | Blocked at the edge                                      |
| Domain                    | Provider subdomain | `ledgerlab.example.com` on a real TLD, behind Cloudflare |

## Stakeholders and what they care about

| Who                        | Cares about                                 | Sounds like                                             |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| **Kira (CEO)**             | Not losing customers; hitting the bank date | "I don't need it pretty. I need it to not lose data."   |
| **CPA reviewer**           | The numbers tie out                         | "If debits don't equal credits, I can't sign off."      |
| **Bank security reviewer** | Evidence, not intent                        | "Show me the WAF rule and the `/api/internal` verdict." |
| **Ops (Budi)**             | Monthly close not breaking                  | "The 9pm reconciliation is where it dies."              |
| **Existing customers**     | The app keeps working                       | "My books from last year — are they still there?"       |
| **Future engineers**       | Not inheriting another mess                 | "Why did this change? Where's the prompt log?"          |

## Constraints

- **Two weeks, one engineer.** Underscope deliberately and document what you skipped.
- **Budget is real.** Free/low tiers are fine; say what you chose and why.
- **Do not break existing customers.** Migrate the data; keep the API contract.
- **Money integrity is non-negotiable.** Never floats for money; never an
  unbalanced posted entry; the audit trail is append-only.
- **No downtime window longer than five minutes.** Roll forward, not sideways.
- **The demo data is not real.** Never paste customer data into an AI tool.

## Risks

| Risk                                           | Mitigation                                                 |
| ---------------------------------------------- | ---------------------------------------------------------- |
| A quick fix breaks an accounting invariant     | The challenge suite + port-level tests gate every change   |
| Migration loses or double-counts entries       | Idempotent seed/migrate; verify totals before and after    |
| Security work left until the end and rushed    | Start `INTERNAL_API_TOKEN` + CORS on day one               |
| Bank review needs evidence you did not capture | Keep commands, `curl -I` output, WAF screenshots as you go |
| Two weeks isn't enough                         | Ship G0–G5 fully; treat Cloudflare/TLD as the stretch      |

## The one-sentence brief

**Make the ledger provably correct, the data durable, the service survive
payday, and the whole thing defensible in a security review — then prove it with
tests, evidence, and a prompt log.**
