#!/usr/bin/env node
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session Z-Local Part 6: the targets table of docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md, one verdict per target in
 * the brief, rendered from the summary files (`scripts/zigi/summarise.mjs`) and, for the variance rows, from the raw run
 * files on the runs worktree. A verdict is "met", "not met" with the miss families, or "not run": never typed by hand.
 * Usage: node scripts/zigi/targets.mjs [--summaries <dir>] [--runs <dir>] [--doc <file>] [--golden "272/272"] [--golden-spoken "397/397"]
 */
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const DIR = opt('--summaries', join(REPO, 'docs/verification/z-local/real-model/summaries'));
const RUNS = opt('--runs', '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs/real-model');
const DOC = opt('--doc', join(REPO, 'docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md'));
const GOLDEN = opt('--golden', null), GOLDEN_SPOKEN = opt('--golden-spoken', null);
const pct = r => `${(r * 100).toFixed(1)} %`;
const all = readdirSync(DIR).filter(f => f.endsWith('.summary.json')).map(f => ({name: f, ...JSON.parse(readFileSync(join(DIR, f), 'utf8'))}))
  .sort((a, b) => (a.startedAt ?? a.name).localeCompare(b.startedAt ?? b.name));
const filterOf = s => /-important-20-/.test(s.file) ? 'probe' : /-important-/.test(s.file) ? 'important' : /-all-/.test(s.file) ? 'all' : 'subset';
/** The latest harness summary for a model, set and filter; a run with the page records (the app's own shape) wins over one without. */
const harness = (model, set, filter, host) => () => {
  const c = all.filter(s => s.kind === 'harness' && String(s.model).startsWith(model) && (s.set ?? 'typed') === set && filterOf(s) === filter && (!host || String(s.host).includes(host)));
  const page = c.filter(s => s.pageContext); const s = (page.length ? page : c).at(-1);
  if (!s) return null; const f = locate(s), stage = s.stage ?? (f ? f.split('/').at(-2) : '?');
  return {passed: s.passed, total: s.runs, where: `${stage}/${s.file}`, misses: s.misses, repeat: s.repeat, file: s.file, stage};
};
/** A panel summary (UI runs) by stage folder; every group (project) summed. */
const panel = stage => () => {
  const c = all.filter(s => s.kind === 'panel' && (stage instanceof RegExp ? stage.test(s.stage ?? '') : s.stage === stage));
  if (!c.length) return null;
  const passed = c.reduce((n, s) => n + Object.values(s.groups).reduce((m, g) => m + g.passed, 0), 0), total = c.reduce((n, s) => n + Object.values(s.groups).reduce((m, g) => m + g.runs, 0), 0);
  const errors = c.reduce((n, s) => n + Object.values(s.groups).reduce((m, g) => m + (g.errors ?? 0), 0), 0);
  return {passed, total, where: c.map(s => `${s.stage}/${s.file}`).join(', '), misses: errors ? `${errors} error(s)` : null};
};
/** The run file behind a summary on the runs worktree: its stage folder when the summary names one, else the first folder holding the file. */
const locate = s => { const direct = join(RUNS, s.stage ?? '', s.file); if (s.stage && existsSync(direct)) return direct; try { for (const d of readdirSync(RUNS)) { const f = join(RUNS, d, s.file); if (existsSync(f)) return f; } } catch { /* no runs worktree */ } return null; };
/** The spread between repeats of one run file (max − min pass rate, in points), read from the raw runs on the runs worktree. */
const spread = pick => () => {
  const s = pick(); if (!s || !s.repeat || s.repeat < 2) return s ? {...s, spread: null} : null;
  const f = locate(s); if (!f) return {...s, spread: null};
  const runs = JSON.parse(readFileSync(f, 'utf8')).runs, by = new Map();
  for (const r of runs) { const g = by.get(r.repeat) ?? {p: 0, n: 0}; g.n++; if (r.pass) g.p++; by.set(r.repeat, g); }
  const rates = [...by.values()].map(g => g.p / g.n); return {...s, spread: Math.max(...rates) - Math.min(...rates), rates};
};
const fixed = text => () => text ? {passed: Number(text.split('/')[0]), total: Number(text.split('/')[1]), where: 'vitest (CI: web checks)'} : null;
const T = [
  ['Sonnet · corpus (typed) ≥ 97 %', harness('claude-sonnet-5-5', 'typed', 'all'), 0.97],
  ['Sonnet · the spoken set ≥ 95 %', harness('claude-sonnet-5-5', 'spoken', 'all'), 0.95],
  ['Sonnet · UI panel 150 ≥ 95 %', panel('ui-panel-sonnet'), 0.95],
  ['Sonnet · 15 conversations ×3: 15/15', panel('ui-conv-sonnet'), 1],
  ['Sonnet · the day, desktop + phone: 36/36', panel('ui-day-sonnet'), 1],
  ['Sonnet · pages 17 × 10 ≥ 99 %', panel('ui-pages-sonnet'), 0.99],
  ['Sonnet · four photo plates ×3: 4/4', panel('ui-photos-sonnet-5-5'), 1],
  ['Sonnet · WebKit subset (60 panel + 5 conversations), reported', panel(/^ui-webkit-/), null],
  ['Sonnet · important ×2 variance (spread between repeats)', spread(harness('claude-sonnet-5-5', 'typed', 'important')), null],
  ['Haiku · corpus ≥ 92 %', harness('claude-haiku-5-5', 'typed', 'all'), 0.92],
  ['Haiku · the spoken set ≥ 92 %', harness('claude-haiku-5-5', 'spoken', 'all'), 0.92],
  ['Haiku · UI panel 150 ≥ 92 %', panel('ui-panel-haiku'), 0.92],
  ['Haiku · pages 17 × 10 (desktop) ≥ 92 %', panel('ui-pages-haiku'), 0.92],
  ['Opus · corpus ≥ 97 %', harness('claude-opus-5-5', 'typed', 'all'), 0.97],
  ['Opus · important set ≥ 97 % (the re-run after the fix rounds)', harness('claude-opus-5-5', 'typed', 'important'), 0.97],
  ['Opus · UI panel 60 ≥ 97 %', panel('ui-panel-opus'), 0.97],
  ['qwen3.8 (RTX 5090) ≥ 90 %', harness('qwen3.8', 'typed', 'all'), 0.90],
  ['qwen3.6 (RTX 5090) ≥ 85 %', harness('qwen3.6', 'typed', 'all', 'RTX'), 0.85],
  ['qwen3.6 (Mac M1 Max) ≥ 85 %', harness('qwen3.6', 'typed', 'all', 'Mac'), 0.85],
  ['gemma4 (RTX 5090) ≥ 89 %', harness('gemma4', 'typed', 'all'), 0.89],
  ['gemma4 · the spoken set, reported', harness('gemma4', 'spoken', 'all'), null],
  ['phi4-mini (RTX 5090), reported (X-Local: 61 %)', harness('phi4-mini', 'typed', 'all'), null],
  ['gemma4 · important ×3 variance (spread)', spread(harness('gemma4', 'typed', 'important')), null],
  ['qwen3.8 · important ×3 variance (spread)', spread(harness('qwen3.8', 'typed', 'important')), null],
  ['Golden set (272, byte-identical) 100 %', fixed(GOLDEN), 1],
  ['Golden spoken set 100 %', fixed(GOLDEN_SPOKEN), 1],
];
const rows = ['| Target | Result | Verdict | Evidence |', '|---|---:|---|---|'];
let met = 0, notMet = 0, notRun = 0;
for (const [label, pick, min] of T) {
  const r = pick();
  if (!r) { notRun++; rows.push(`| ${label} | — | not run yet | — |`); continue; }
  const rate = r.total ? r.passed / r.total : 0, result = `${r.passed}/${r.total} · ${pct(rate)}${r.spread !== undefined && r.spread !== null ? ` · spread ${(r.spread * 100).toFixed(1)} pt (${r.rates.map(pct).join(' / ')})` : ''}`;
  let verdict;
  if (min === null) verdict = 'reported';
  else if (rate >= min) { met++; verdict = '**met**'; }
  else { notMet++; verdict = `not met, ${((min - rate) * 100).toFixed(1)} pt short${r.misses ? `; misses: ${r.misses}` : ''}`; }
  rows.push(`| ${label} | ${result} | ${verdict} | \`${r.where}\` |`);
}
const head = `_Rendered by \`scripts/zigi/targets.mjs\` on ${new Date().toISOString().slice(0, 10)} from ${all.length} summary file(s): ${met} met · ${notMet} not met · ${notRun} not run yet. A run with the page records (the app's own shape) is preferred over one without; the latest wins._`;
const block = `<!-- targets:start -->\n${head}\n\n${rows.join('\n')}\n<!-- targets:end -->`;
if (args.includes('--print')) { console.log(block); process.exit(0); }
let doc = readFileSync(DOC, 'utf8');
if (doc.includes('<!-- targets:start -->')) doc = doc.replace(/<!-- targets:start -->[\s\S]*?<!-- targets:end -->/, block);
else { const k = doc.indexOf('## Recommendation per job'); if (k < 0) throw new Error('no place for the targets table'); doc = `${doc.slice(0, k)}## The targets (Part 6)\n${block}\n\n${doc.slice(k)}`; }
writeFileSync(DOC, doc);
console.log(`targets: ${met} met · ${notMet} not met · ${notRun} not run yet → ${DOC}`);
