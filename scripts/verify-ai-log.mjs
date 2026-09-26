#!/usr/bin/env node
/**
 * CI gate: the technical test requires AI prompts to be logged.
 *
 * Fails when `docs/ai/prompt-log.jsonl` is missing, empty, or any record is
 * incomplete or inconsistent. A reviewer needs: tool/model, task, prompt,
 * summary, decision, and the files the interaction touched. When a record names
 * a sub-agent, that agent definition must exist. The generated markdown table
 * must also agree with the JSONL source of truth.
 *
 * Allow a pass before any AI was used by setting ALLOW_EMPTY_AI_LOG=1.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSONL = join(ROOT, "docs", "ai", "prompt-log.jsonl");
const MARKDOWN = join(ROOT, "docs", "AI-PROMPT-LOG.md");
const AGENT_DIR = join(ROOT, ".opencode", "agent");
const DECISIONS = new Set(["accepted", "edited", "rejected", "reverted"]);

if (!existsSync(JSONL)) {
  if (process.env.ALLOW_EMPTY_AI_LOG === "1") {
    console.log("AI prompt log not found — allowed by ALLOW_EMPTY_AI_LOG=1");
    process.exit(0);
  }
  console.error(`FAIL: ${JSONL} is missing. Every AI prompt must be logged via \`pnpm ai:log\`.`);
  process.exit(1);
}

const records = readFileSync(JSONL, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line, i) => {
    try {
      return JSON.parse(line);
    } catch {
      console.error(`FAIL: line ${i + 1} of prompt-log.jsonl is not valid JSON.`);
      process.exit(1);
    }
  });

if (records.length === 0 && process.env.ALLOW_EMPTY_AI_LOG !== "1") {
  console.error("FAIL: the AI prompt log is empty. Log each AI prompt with `pnpm ai:log`.");
  process.exit(1);
}

const REQUIRED = ["id", "timestamp", "tool", "model", "task", "prompt", "summary", "decision", "files"];
const problems = [];
const warnings = [];

records.forEach((record, i) => {
  const where = `record ${i + 1} (${record.id ?? "no id"})`;
  for (const field of REQUIRED) {
    const value = record[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      problems.push(`${where}: missing "${field}"`);
    }
  }

  if (record.decision && !DECISIONS.has(record.decision)) {
    problems.push(`${where}: decision "${record.decision}" is not one of ${[...DECISIONS].join(", ")}`);
  }

  if (record.subagent) {
    if (!existsSync(join(AGENT_DIR, `${record.subagent}.md`))) {
      problems.push(`${where}: sub-agent "${record.subagent}" has no .opencode/agent file`);
    }
  }

  if (Array.isArray(record.files)) {
    for (const file of record.files) {
      if (!existsSync(join(ROOT, file))) {
        warnings.push(`${where}: file no longer exists: ${file}`);
      }
    }
  }
});

if (existsSync(MARKDOWN)) {
  const match = readFileSync(MARKDOWN, "utf8").match(/Entries:\s*\*\*(\d+)\*\*/);
  if (!match) {
    problems.push("docs/AI-PROMPT-LOG.md has no `Entries: **N**` header; run `pnpm ai:log`.");
  } else if (Number(match[1]) !== records.length) {
    problems.push(
      `docs/AI-PROMPT-LOG.md says ${match[1]} entries but the JSONL has ${records.length}; regenerate it.`,
    );
  }
} else {
  problems.push("docs/AI-PROMPT-LOG.md is missing; run `pnpm ai:log`.");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);

if (problems.length > 0) {
  console.error("FAIL: AI prompt log has incomplete or inconsistent records:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`OK: ${records.length} AI prompt log entries are complete.`);
