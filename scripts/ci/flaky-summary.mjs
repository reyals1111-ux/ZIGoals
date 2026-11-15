#!/usr/bin/env node
// Session AP ([TIER 3] (CI), owner rule 14 Nov): CI retries a failed browser test once (ZIGOALS_CI_RETRY=1 in
// playwright.config.ts and playwright.webkit.config.ts). A test that passes on its retry is "flaky", not failed; this
// lists every flaky test (file:line, project, shard) in the job summary so none goes unseen. A test that fails twice still
// fails the job (Playwright's own exit code; this script never changes it).
//   node scripts/ci/flaky-summary.mjs <report.json> <shard label>
import {appendFileSync, existsSync, readFileSync} from 'node:fs';

/** Every flaky test in a Playwright JSON report: {file, line, project, title}. */
export function flakyTests(report) {
  const out = [];
  const walk = suite => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      if (test.status === 'flaky') out.push({file: spec.file, line: spec.line, project: test.projectName, title: spec.title});
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report?.suites ?? []) walk(suite);
  return out;
}
/** The job summary's Markdown for one shard. */
export function summaryMarkdown(flaky, label) {
  if (!flaky.length) return `### Flaky tests (${label})\nNone: every test passed on its first attempt or failed on both.\n`;
  const rows = flaky.map(f => `| \`${f.file}:${f.line}\` | ${f.project} | ${label} | ${String(f.title).replace(/\|/g, '\\|')} |`);
  return [`### Flaky tests (${label}): ${flaky.length}`, 'Passed only on their one retry (docs/review/session-al/CI_INTERMITTENTS.md, "Automatic retry").', '', '| Test | Project | Shard | Title |', '|---|---|---|---|', ...rows, ''].join('\n');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [path, label = 'shard'] = process.argv.slice(2);
  let text;
  if (!path || !existsSync(path)) text = `### Flaky tests (${label})\nNo report was written (the run stopped before it ended).\n`;
  else { try { text = summaryMarkdown(flakyTests(JSON.parse(readFileSync(path, 'utf8'))), label); } catch (error) { text = `### Flaky tests (${label})\nThe report could not be read: ${error.message}\n`; } }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`); else process.stdout.write(text);
}
