#!/usr/bin/env node
import {readFileSync, writeFileSync} from 'node:fs';
import {basename} from 'node:path';

/**
 * Session AI (A1, ADR-034): the per-case report of one or more real-model run files (`real-model.test.ts` output).
 *   node scripts/zigi/case-report.mjs <run.json> [<run.json> …] [--out <file.md>] [--repo]
 * Without --repo the report goes to the runs folder and may quote the failing check's detail (fictional records only).
 * With --repo it holds only what may enter the repository: case ids, kinds, languages, pass/fail, the names of the failing
 * checks and costs — never a reply, a detail text or anything from the records.
 */
const args = process.argv.slice(2), files = args.filter(a => a.endsWith('.json')), repo = args.includes('--repo');
const outAt = args.indexOf('--out'), out = outAt >= 0 ? args[outAt + 1] : null;
if (!files.length) { console.error('usage: case-report.mjs <run.json> … [--out file.md] [--repo]'); process.exit(2); }
const lines = [];
const pct = (p, t) => t ? `${(100 * p / t).toFixed(1)} %` : '—';
for (const file of files) {
  const {summary, runs} = JSON.parse(readFileSync(file, 'utf8'));
  const passed = runs.filter(r => r.pass).length, cost = runs.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  lines.push(`## ${summary.model} · ${summary.set} · ${summary.mode}${summary.batch ? ' · batch' : ''}${summary.pageContext ? ' · page records' : ''}`, '',
    `Real model. File \`${basename(file)}\`; ${summary.startedAt} → ${summary.finishedAt}. **${passed}/${runs.length} (${pct(passed, runs.length)})**, cost $${cost.toFixed(4)} (prices as of ${summary.pricesAsOf ?? '—'}).${summary.capped ? ` Capped: ${repo ? 'yes' : summary.capped}.` : ''}`, '');
  const group = (key) => { const m = new Map(); for (const r of runs) { const k = key(r); const v = m.get(k) ?? {p: 0, t: 0}; v.t++; if (r.pass) v.p++; m.set(k, v); } return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))); };
  lines.push('| Kind | Passed | Rate |', '|---|---|---|', ...group(r => r.kind).map(([k, v]) => `| ${k} | ${v.p}/${v.t} | ${pct(v.p, v.t)} |`), '');
  lines.push('| Language | Passed | Rate |', '|---|---|---|', ...group(r => r.lang).map(([k, v]) => `| ${k} | ${v.p}/${v.t} | ${pct(v.p, v.t)} |`), '');
  const failing = runs.filter(r => !r.pass);
  if (failing.length) {
    lines.push(`### Failing turns (${failing.length})`, '', repo ? '| Case | Turn | Kind | Lang | Failed checks | Cost |' : '| Case | Turn | Kind | Lang | Failed checks (why) | Cost |', '|---|---|---|---|---|---|');
    for (const r of failing) {
      const why = (r.checks ?? []).filter(c => !c.pass).map(c => repo ? c.name : `${c.name}${c.detail ? `: ${String(c.detail).replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 120)}` : ''}`).join('; ') || (r.error ? (repo ? 'error' : `error: ${r.error.slice(0, 120)}`) : '—');
      lines.push(`| ${r.id} | ${r.turn}${r.repeat > 1 ? ` #${r.repeat}` : ''} | ${r.kind} | ${r.lang} | ${why} | $${(r.costUsd ?? 0).toFixed(4)} |`);
    }
    lines.push('');
  }
}
const text = `${lines.join('\n')}\n`;
if (out) { writeFileSync(out, text); console.log(`written: ${out}`); } else process.stdout.write(text);
