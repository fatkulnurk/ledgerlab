# AI usage policy

AI assistance is **allowed and expected**. This test is not about whether you use
AI — it is about whether you can direct it, verify it, and explain your choices.

## The one rule

**If an AI helped produce something that ends up in the repo, that interaction is
logged.**

Use the provided script so the format is consistent and CI can verify it:

```bash
pnpm ai:log -- \
  --tool "opencode" \
  --model "deepseek/deepseek-v4.1-flash" \
  --subagent "ledger-architect" \
  --task "Fix Challenge A: trial balance asOf" \
  --prompt "buildTrialBalance ignores asOf. Make it filter postings by entryDate <= asOf." \
  --summary "Filtered postings before aggregation; kept balanced flag computed from filtered rows." \
  --decision "accepted" \
  --files "packages/shared/src/reporting.ts"
```

- Writes `docs/ai/prompt-log.jsonl` (source of truth) and regenerates
  `docs/AI-PROMPT-LOG.md` (human-readable table).
- Read a long prompt from stdin: `pbpaste | pnpm ai:log -- --tool … --prompt -`
- `pnpm ai:verify` fails CI on missing or incomplete records.

## Required fields

| Field            | Meaning                                             |
| ---------------- | --------------------------------------------------- |
| `tool` / `model` | What produced the output                            |
| `subagent`       | Which sub-agent (or blank)                          |
| `task`           | The goal of the interaction                         |
| `prompt`         | What you actually asked (verbatim, trimmed is fine) |
| `summary`        | What changed as a result                            |
| `decision`       | `accepted` · `edited` · `rejected` · `reverted`     |
| `files`          | Files the change touched                            |

## What is scored

- **Completeness.** Every non-trivial change traces to a logged interaction.
- **Honesty.** `decision: rejected` entries are _valuable_ — they show judgment.
  A log with only sparkling successes reads as fiction.
- **Verification.** You confirm the AI's output (tests, types, manual check)
  before trusting it. Say so in `summary`.
- **Direction.** Your prompts get sharper over time: context, constraints,
  acceptance criteria.

## What is penalised

- Editing the challenge specs so they pass without fixing the source.
- Committing secrets an AI suggested.
- A prompt log that is empty, fabricated, or back-filled in one commit at the
  end.
- Shipping unverified AI output — e.g. floats for money, or a `CORS_ORIGINS=*`
  in production.

## Suggested workflow

1. Ask the relevant sub-agent for a **plan** before code (log it).
2. Apply the change yourself or let the agent edit; keep the diff small.
3. Run `pnpm typecheck && pnpm test`. If it fails, that is a **new** interaction.
4. Log the decision: accepted / edited / rejected, and why.
5. Commit the code together with its log entries — one story per commit.

## Privacy

Do not paste real customer data, credentials, or proprietary third-party source
into any AI tool. Use the demo data in `packages/shared/src/seed.ts`.
