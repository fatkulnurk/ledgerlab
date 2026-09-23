# Submission

> Fill this in. Replace every `TODO`. Reviewers read this first.

**Candidate:** TODO
**Date:** TODO
**Time spent:** TODO

## Deployed URLs

| Surface       | URL  | `/health` |
| ------------- | ---- | --------- |
| Dashboard     | TODO | —         |
| Ledger API    | TODO | TODO      |
| Reporting API | TODO | TODO      |

**Cloudflare / custom domain:** TODO (or "not attempted")

## What I changed

TODO — bullet the meaningful changes, grouped by goal (G0…G8). Link commits or files.

## Challenge suite

```
pnpm --filter @ledgerlab/ledger-api test:challenges
# TODO paste the (green) output
```

- Challenge A (trial balance `asOf`): TODO how you fixed it and why.
- Challenge B (void transition): TODO how you fixed it and why.

## Database

- Engine and version: TODO
- Migrations: TODO (command)
- Seeding: TODO (command)
- Why this engine: TODO

## Deployment

- Target: TODO (Render / AWS / GCP / Azure)
- Reproduce it: TODO (commands or blueprint path)
- Scaling: TODO (replicas / min-max instances)
- Secrets: TODO (where they live)
- Migrations as a deploy step: TODO

## Security

- `INTERNAL_API_TOKEN` evidence: `curl -X POST https://…/api/internal/postings` → TODO status
- CORS: TODO (origin, and the preflight check result)
- Headers/HSTS: TODO (`curl -I` output)
- Rate limiting: TODO (limit + action)
- Known gaps: auth/multi-tenancy not built — TODO how you would add them

## Cloudflare + TLD (bonus)

- Domain: TODO
- `dig +short` output: TODO
- TLS mode: TODO (Full strict) + screenshot/commit
- WAF rule and rate-limit rule: TODO (paste the expression)
- `/api/internal/*` blocked at edge: TODO (evidence)
- Cache rules: TODO

## Infrastructure plan (G9)

- Document: `docs/INFRASTRUCTURE-PLAN.md` — TODO (status: complete / partial)
- Topology summary in one sentence: TODO
- RPO / RTO: TODO
- Restore drill: date TODO, duration TODO, result TODO
- Cost at 1× / 3× / 10×: TODO
- First bottleneck at 10×: TODO
- ADRs: TODO (list the decisions)

## Next-phase plan (G10)

- Document: `docs/NEXT-PHASE-PLAN.md` — TODO (status: complete / partial)
- Outcomes: TODO (list the 3–5)
- Prioritisation method and top initiative: TODO
- Milestones + exit criteria: TODO
- Next hires: TODO
- Explicitly deferred: TODO

## AI usage

- Entries in `docs/ai/prompt-log.jsonl`: TODO (count)
- A prompt I **rejected** and why: TODO
- How I verified AI output: TODO

## Sub-agents

| Agent | File                | What it did |
| ----- | ------------------- | ----------- |
| TODO  | `.opencode/agent/…` | TODO        |

- Defect a sub-agent caught: TODO

## Verification

```
pnpm format:check   # TODO PASS/FAIL
pnpm typecheck      # TODO
pnpm test           # TODO (n passed)
pnpm build          # TODO
pnpm ai:verify      # TODO
```

## What I skipped and why

TODO — be explicit. Underscoping is fine; hiding it is not.

## If I had more time

TODO — ranked, with the first thing you would do next.
