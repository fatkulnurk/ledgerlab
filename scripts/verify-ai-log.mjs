#!/usr/bin/env node
/**
 * CI gate: the technical test requires AI prompts to be logged.
 *
 * Fails when `docs/ai/prompt-log.jsonl` is missing, empty, or any record is
 * missing the fields a reviewer needs (task, prompt, summary, decision).
 *
 * Allow a pass before any AI was used by setting ALLOW_EMPTY_AI_LOG=1.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSONL = join(ROOT, "docs", "ai", "prompt-log.jsonl");

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

const REQUIRED = ["timestamp", "tool", "task", "prompt", "summary", "decision"];
const problems = [];
records.forEach((record, i) => {
  for (const field of REQUIRED) {
    const value = record[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      problems.push(`record ${i + 1} (${record.id ?? "no id"}): missing "${field}"`);
    }
  }
});

if (problems.length > 0) {
  console.error("FAIL: AI prompt log has incomplete records:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`OK: ${records.length} AI prompt log entries are complete.`);
