#!/usr/bin/env node
/**
 * Build the candidate guide PDF from the repository's markdown docs.
 *
 * Pipeline:  markdown -> styled HTML -> Chrome (headless, DevTools Protocol) -> PDF
 *
 * Why Chrome directly instead of a PDF library: it is already installed, it lays
 * out real HTML/CSS (tables, page breaks), and the DevTools Protocol lets us add
 * a footer with "Page N of M" — which the `--print-to-pdf` CLI flag cannot do.
 *
 *   pnpm guide:pdf          # writes docs/ledgerlab-technical-test-guide.pdf
 *   pnpm guide:html         # writes docs/guide/*.html only (no Chrome needed)
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "docs", "guide");
const HTML_OUT = join(OUT_DIR, "ledgerlab-technical-test-guide.html");
const PDF_OUT = join(ROOT, "docs", "ledgerlab-technical-test-guide.pdf");
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const VERSION = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/** Guide structure: title + markdown file, in reading order. */
const SECTIONS = [
  {
    file: "docs/CLIENT-STORY.md",
    title: "The client and the mandate",
    blurb:
      'Warung Books: how a vibe-coded app got 1,400 customers, why it must go production, and what "good" looks like.',
  },
  {
    file: "README.md",
    title: "Overview, goals and scoring",
    blurb: "What the scaffold is, goals G0–G8, the rubric and the submission checklist.",
  },
  {
    file: "docs/TASKS.md",
    title: "Task backlog",
    blurb: "Ordered P0–P3 work: fix the defects, then quality, database, deploy and security.",
  },
  {
    file: "docs/DESIGN.md",
    title: "Design rules (anti-slop)",
    blurb: "The enforced UI rules: colour balance, icons, typography, surfaces, motion.",
  },
  {
    file: "docs/DATABASE.md",
    title: "Database",
    blurb: "The storage port, PostgreSQL wiring, and MySQL/SQLite/SQL Server options.",
  },
  {
    file: "docs/DEPLOYMENT.md",
    title: "Deployment",
    blurb: "Render/AWS/GCP/Azure runbooks and the definition of production-scale.",
  },
  {
    file: "docs/SECURITY.md",
    title: "Security",
    blurb: "Secrets, the service-to-service boundary, CORS, headers and rate limiting.",
  },
  {
    file: "docs/AI-USAGE.md",
    title: "AI usage policy",
    blurb: "How to log every AI prompt and what is scored; includes rejected prompts.",
  },
  {
    file: "docs/SUBAGENTS.md",
    title: "Sub-agents",
    blurb: "Build at least three sub-agents and one of your own; scope and contracts.",
  },
  {
    file: "docs/INFRASTRUCTURE-PLAN.md",
    title: "Infrastructure plan (template)",
    blurb: "The scored deliverable: topology, durability, scaling, cost, DR and ADRs.",
  },
  {
    file: "docs/NEXT-PHASE-PLAN.md",
    title: "Next-phase development plan (template)",
    blurb: "The scored deliverable: outcomes, prioritisation, milestones and capacity.",
  },
  {
    file: "docs/SUBMISSION.md",
    title: "Submission template",
    blurb: "The fill-in-the-blanks document a reviewer reads first.",
  },
];

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Turn relative file links into plain text so the PDF has no dead links. */
function stripDeadLinks(html) {
  return html.replace(/href="(?!#|https?:|mailto:)[^"]*"/g, 'data-internal-link="true"');
}

function renderSection(section, index) {
  const absolute = join(ROOT, section.file);
  if (!existsSync(absolute)) throw new Error(`Guide source missing: ${section.file}`);
  const markdown = readFileSync(absolute, "utf8");
  // Drop the document's own H1: the guide supplies its own section numbering.
  const body = markdown.replace(/^#\s+.*\n/, "");
  const html = stripDeadLinks(marked.parse(body, { gfm: true, breaks: false }));
  return `
  <section class="doc" id="doc-${index + 1}">
    <p class="doc-kicker">Part ${index + 1} · <span class="mono">${escapeHtml(section.file)}</span></p>
    <h1>${index + 1}. ${escapeHtml(section.title)}</h1>
    ${html}
  </section>`;
}

function buildToc() {
  return `<section class="toc">
    <h2>Contents</h2>
    <ol class="toc-list">
      ${SECTIONS.map(
        (section, index) => `<li>
        <span class="num">${index + 1}.</span>
        <span class="toc-body">
          <span class="toc-title">${escapeHtml(section.title)}</span>
          <span class="toc-blurb">${escapeHtml(section.blurb)}</span>
          <span class="toc-file mono">${escapeHtml(section.file)}</span>
        </span>
      </li>`,
      ).join("\n")}
    </ol>
  </section>`;
}

const COVER = `
  <section class="cover">
    <div class="cover-top">
      <span class="brand">LedgerLab</span>
      <span class="brand-sub">Double-entry accounting platform</span>
    </div>
    <h1 class="cover-title">Technical Test<br />Candidate Guide</h1>
    <p class="cover-lede">
      You are contracting for <strong>Warung Books</strong>, a seed-stage bookkeeping app whose
      non-technical founder built it with an AI app builder in a weekend. It now has 1,400 paying
      customers, an accountant about to review the books, and a bank partnership that hinges on a
      security review. This repository is their codebase. Fix the planted defects, remove the UI
      slop, move it onto a real database, harden it for production, and deploy it — with a logged AI
      prompt trail and your own sub-agents. Then write the infrastructure plan the bank needs and the
      roadmap the investors want.
    </p>
    <dl class="cover-meta">
      <div><dt>Client scenario</dt><dd>Warung Books — micro-business bookkeeping</dd></div>
      <div><dt>Stage</dt><dd>Seed · 1,400 customers · audit & bank review pending</dd></div>
      <div><dt>Document</dt><dd>Candidate guide</dd></div>
      <div><dt>Repository</dt><dd>technical-test-microservice</dd></div>
      <div><dt>Scaffold version</dt><dd>${VERSION}</dd></div>
      <div><dt>Generated</dt><dd>${BUILD_DATE}</dd></div>
      <div><dt>Suggested time</dt><dd>6–8 hours</dd></div>
      <div><dt>Stack</dt><dd>TypeScript · Node · Hono · React · PostgreSQL</dd></div>
    </dl>
    <div class="cover-callout">
      <strong>Start here.</strong> Run <code>pnpm install</code>, then
      <code>pnpm test</code> (green) and
      <code>pnpm --filter @ledgerlab/ledger-api test:challenges</code> (red on purpose).
      The red suite is your first task.
    </div>
  </section>`;

const STYLE = `
@page { size: A4; margin: 20mm 16mm; }
:root {
  --ink: #18181b;
  --muted: #52525b;
  --faint: #a1a1aa;
  --line: #e4e4e7;
  --accent: #4f46e5;
  --ok: #047857;
  --bad: #b91c1c;
}
* { box-sizing: border-box; }
html { font-size: 10.5pt; }
body {
  margin: 0;
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
code, pre, .mono { font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace; }

/* --- cover --- */
.cover {
  height: 247mm; /* one page within 20mm margins on A4 (297mm) */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 4mm;
  break-after: page;
}
.cover-top { display: flex; align-items: baseline; gap: 10px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }
.brand { font-size: 15pt; font-weight: 700; letter-spacing: -0.01em; }
.brand-sub { font-size: 9pt; color: var(--muted); }
.cover-title { font-size: 34pt; line-height: 1.06; letter-spacing: -0.02em; margin: 48px 0 18px; font-weight: 700; }
.cover-lede { font-size: 12pt; color: var(--muted); max-width: 128mm; margin: 0 0 34px; }
.cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 26px; margin: 0 0 34px; border-top: 1px solid var(--line); padding-top: 22px; }
.cover-meta div { display: flex; flex-direction: column; gap: 1px; }
.cover-meta dt { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.07em; color: var(--faint); }
.cover-meta dd { margin: 0; font-size: 10.5pt; font-weight: 500; }
.cover-callout { border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 2px; padding: 12px 14px; font-size: 10pt; color: var(--muted); }
.cover-callout strong { color: var(--ink); }
.cover-callout code { background: #f4f4f5; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }

/* --- table of contents --- */
.toc { break-after: page; }
.toc h2 { font-size: 15pt; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid var(--ink); }
.toc-list { list-style: none; margin: 0; padding: 0; }
.toc-list li { display: flex; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
.toc .num { color: var(--accent); font-weight: 600; min-width: 18px; font-variant-numeric: tabular-nums; }
.toc-body { display: flex; flex-direction: column; gap: 1px; }
.toc-title { font-size: 11pt; font-weight: 600; }
.toc-blurb { font-size: 9.5pt; color: var(--muted); }
.toc-file { font-size: 8.5pt; color: var(--faint); }

/* --- sections --- */
.doc { break-before: page; }
.doc-kicker { font-size: 8.5pt; color: var(--faint); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px; }
h1 { font-size: 20pt; letter-spacing: -0.015em; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 2px solid var(--ink); }
h2 { font-size: 13.5pt; margin: 22px 0 8px; letter-spacing: -0.01em; }
h3 { font-size: 11.5pt; margin: 16px 0 6px; }
h1, h2, h3, h4 { break-after: avoid; }
p, li { orphans: 3; widows: 3; }
a { color: var(--accent); text-decoration: none; }
[data-internal-link] { color: var(--ink); }

ul, ol { margin: 8px 0; padding-left: 20px; }
li { margin: 3px 0; }
li > p { margin: 3px 0; }
strong { font-weight: 600; }
hr { border: 0; border-top: 1px solid var(--line); margin: 20px 0; }

/* GFM task lists */
li input[type="checkbox"] { width: 10px; height: 10px; margin-right: 6px; accent-color: var(--accent); }

/* code */
code { background: #f4f4f5; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
pre {
  background: #fafafa;
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 10px 12px;
  overflow-x: auto;
  break-inside: avoid;
  font-size: 8.6pt;
  line-height: 1.45;
}
pre code { background: none; padding: 0; font-size: 8.6pt; }

/* tables */
table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 9.3pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: #f4f4f5; font-weight: 600; font-size: 8.6pt; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); border-bottom: 1px solid var(--faint); }
td code { font-size: 8.6pt; }

blockquote { margin: 12px 0; padding: 8px 12px; border-left: 3px solid var(--faint); background: #fafafa; color: var(--muted); }
blockquote p { margin: 0; }

/* emoji status markers stay legible but small */
.doc { font-variant-ligatures: none; }
`;

function buildHtml() {
  const rendered = SECTIONS.map(renderSection).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>LedgerLab — Technical Test Candidate Guide</title>
<style>${STYLE}</style>
</head>
<body>
${COVER}
${buildToc()}
${rendered}
</body>
</html>`;
}

/* ------------------------------------------------------------------ Chrome */

function findChrome() {
  return CHROME_CANDIDATES.find((path) => existsSync(path));
}

function launchChrome(binary) {
  const userDataDir = mkdtempSync(join(tmpdir(), "ledgerlab-guide-"));
  const child = spawn(
    binary,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const wsUrl = new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Timed out waiting for the DevTools endpoint")), 20000);
    child.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early with code ${code}`));
    });
  });

  return { child, wsUrl, userDataDir };
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const eventWaiters = new Map();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined && pending.has(message.id)) {
        const { resolve: done, reject: fail } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) fail(new Error(`${message.error.message} (${message.error.code})`));
        else done(message.result);
        return;
      }
      if (message.method) {
        const waiters = eventWaiters.get(message.method);
        if (waiters && waiters.length > 0) {
          eventWaiters.delete(message.method);
          for (const waiter of waiters) waiter(message.params);
        }
      }
    });
    socket.addEventListener("error", () => reject(new Error("DevTools websocket error")));
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}, sessionId) {
          const id = nextId++;
          const payload = { id, method, params };
          if (sessionId) payload.sessionId = sessionId;
          socket.send(JSON.stringify(payload));
          return new Promise((done, fail) => pending.set(id, { resolve: done, reject: fail }));
        },
        once(method) {
          return new Promise((done) => {
            eventWaiters.set(method, [...(eventWaiters.get(method) ?? []), done]);
          });
        },
        close() {
          socket.close();
        },
      });
    });
  });
}

async function printPdf(htmlPath, pdfPath) {
  const binary = findChrome();
  if (!binary) throw new Error("No Chrome/Chromium/Edge binary found");

  const { child, wsUrl, userDataDir } = launchChrome(binary);
  let client;
  try {
    client = await connect(await wsUrl);
    const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });

    await client.send("Page.enable", {}, sessionId);
    const loaded = client.once("Page.loadEventFired");
    await client.send("Page.navigate", { url: pathToFileURL(htmlPath).href }, sessionId);
    await loaded;
    // Let web fonts and layout settle before printing.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const footer = `<div style="width:100%;padding:0 16mm;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:8px;color:#a1a1aa;display:flex;justify-content:space-between;">
      <span>LedgerLab — Technical Test Candidate Guide</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

    const { data } = await client.send(
      "Page.printToPDF",
      {
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: footer,
        // Debug aid: GUIDE_PAGE_RANGES="2-3" print a subset.
        ...(process.env.GUIDE_PAGE_RANGES ? { pageRanges: process.env.GUIDE_PAGE_RANGES } : {}),
      },
      sessionId,
    );

    writeFileSync(pdfPath, Buffer.from(data, "base64"));
  } finally {
    client?.close();
    child.kill("SIGKILL");
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------- main */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const html = buildHtml();
  writeFileSync(HTML_OUT, html, "utf8");
  console.log(`HTML  ${HTML_OUT.replace(`${ROOT}/`, "")} (${(html.length / 1024).toFixed(1)} kB)`);

  if (process.argv.includes("--html-only")) return;
  const pdfPath = process.env.GUIDE_OUT ?? PDF_OUT;
  await printPdf(HTML_OUT, pdfPath);
  const size = readFileSync(pdfPath).length;
  console.log(`PDF   ${pdfPath.replace(`${ROOT}/`, "")} (${(size / 1024).toFixed(0)} kB)`);
}

main().catch((error) => {
  console.error(`Guide build failed: ${error.message}`);
  process.exitCode = 1;
});
