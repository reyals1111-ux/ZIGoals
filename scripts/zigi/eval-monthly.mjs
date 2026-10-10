#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PRICES_AS_OF} from '../../apps/web/lib/ai/pricing.ts';

/**
 * Session Z-Local Part 8 (docs/product/ZIGI_MONTHLY_EVAL.md): the monthly evaluation. The fixed regression set (the corpus's
 * important cases, first turns, attach mode: records in the prompt, no tools, no repair round) goes through the Message
 * Batches API on Claude Haiku 5.5 and Claude Sonnet 5.5 (and an optional slice on Opus 5.5), one request per case, scored by
 * the same scorer as every other run (`lib/ai/evals/score.ts`). A hard cap in dollars: the forecast is refused before
 * anything is submitted, and the real spend (from the API's own usage fields at the dated price table) is summed after.
 *
 *   ( set -a; . ~/.config/zigoals/anthropic-test.env; set +a; node scripts/zigi/eval-monthly.mjs --max-usd 5 )
 *   options: --month YYYY-MM (default: this month) · --opus N (N Opus cases, default 0) · --limit N (a dry run on N cases)
 *            --out <dir> (the raw JSON; default <runs worktree>/monthly/<month>) · --models haiku,sonnet · --report-only (no run)
 * The key is read from ANTHROPIC_TEST_KEY in this process's environment only: never an argument, never printed, never in
 * the report. The report goes to docs/verification/zigi-monthly/<month>.md; the raw JSON stays out of the feature branch.
 */
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const month = opt('--month', new Date().toISOString().slice(0, 7)), maxUsd = Number(opt('--max-usd', '5')), opus = Number(opt('--opus', '0')), limit = Number(opt('--limit', '0'));
const models = opt('--models', 'haiku,sonnet').split(',').map(m => m.trim()).filter(Boolean), reportOnly = args.includes('--report-only');
const RUNS = '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs', OUT = opt('--out', join(RUNS, 'monthly', month)), REPORT_DIR = join(REPO, 'docs/verification/zigi-monthly');
const IDS = {haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5'};
if (!process.env.ANTHROPIC_TEST_KEY) { console.error('ANTHROPIC_TEST_KEY is not in the environment: source the env file in a subshell (see the file comment).'); process.exit(2); }
if (!(maxUsd > 0)) { console.error('--max-usd must be a positive number'); process.exit(2); }
// The cap is enforced twice: the harness refuses a batch whose forecast is over what is left of it (ZIGI_MAX_USD), and the
// real spend is summed from the run files after each model. The important single-turn set is about 170 cases; at batch
// prices a full run is about $0.15 on Haiku, $2.20 on Sonnet and $0.45 per ten cases on Opus.
const plan = reportOnly ? [] : [...models.map(m => ({name: m, model: IDS[m], cases: limit > 0 ? limit : null})), ...(opus > 0 ? [{name: 'opus', model: IDS.opus, cases: opus}] : [])].filter(p => p.model);
console.log(`${month}: the important single-turn cases${limit > 0 ? ` (first ${limit})` : ''} × ${plan.length} model run(s); cap $${maxUsd} at batch prices (as of ${PRICES_AS_OF})`);
mkdirSync(OUT, {recursive: true});
const files = []; let spentSoFar = 0;
const costOf = file => JSON.parse(readFileSync(file, 'utf8')).runs.reduce((a, r) => a + (r.costUsd ?? 0), 0);
for (const p of plan) {
  const out = join(OUT, p.name); mkdirSync(out, {recursive: true});
  const left = maxUsd - spentSoFar;
  if (left <= 0) { console.error(`${p.name}: skipped, the cap is spent ($${spentSoFar.toFixed(2)} of $${maxUsd})`); continue; }
  console.log(`== ${p.name}: ${p.cases ?? 'all important single-turn'} cases through the Batch API; $${left.toFixed(2)} of the cap left ==`);
  const env = {...process.env, ZIGI_REAL_MODEL: '1', ZIGI_PROVIDER: 'anthropic', ZIGI_MODEL: p.model, ZIGI_CASES: 'important', ZIGI_DATA_MODE: 'attach', ZIGI_BATCH: '1', ZIGI_OUT: out, ZIGI_MAX_USD: left.toFixed(2), ...(p.cases ? {ZIGI_LIMIT: String(p.cases)} : {})};
  try { execFileSync('pnpm', ['exec', 'vitest', 'run', 'apps/web/lib/ai/evals/real-model.test.ts', '--reporter=dot'], {cwd: REPO, env, stdio: ['ignore', 'inherit', 'inherit']}); }
  catch (error) { console.error(`${p.name}: the harness exited with ${error.status ?? '?'}; the report covers what was written`); }
  for (const f of readdirSync(out)) if (f.endsWith('.json')) spentSoFar += costOf(join(out, f));
}
// The report covers every model folder under the output (a leg re-run on its own keeps the others' rows); the newest file per folder.
for (const name of existsSync(OUT) ? readdirSync(OUT).filter(d => existsSync(join(OUT, d)) && readdirSync(join(OUT, d)).some(f => f.endsWith('.json'))).sort() : []) {
  const newest = readdirSync(join(OUT, name)).filter(f => f.endsWith('.json')).sort().pop();
  files.push({name, model: IDS[name] ?? name, file: join(OUT, name, newest)});
}
// The report, from the run files only.
const lines = [`# ZIGi monthly evaluation — ${month}`, '', `Made ${new Date().toISOString().slice(0, 10)} by \`scripts/zigi/eval-monthly.mjs\`: the corpus's important single-turn cases${limit > 0 ? ` (the first ${limit}: a dry run)` : ''} in attach mode (records in the prompt, no tools, no repair round), one Message Batch request per case, scored by \`lib/ai/evals/score.ts\`; prices as of ${PRICES_AS_OF} at the Batch API's half rate. Fictional Showcase records only. Raw JSON: \`${OUT.replace(RUNS, '<runs branch>')}\`.`, ''];
lines.push('| Model | Pass | Rate | By kind | Input | Cache read | Output | Cost |', '|---|---:|---:|---|---:|---:|---:|---:|');
let spent = 0; const details = [];
for (const {name, file} of files) {
  const d = JSON.parse(readFileSync(file, 'utf8')), s = d.summary, runs = d.runs;
  const cost = runs.reduce((a, r) => a + (r.costUsd ?? 0), 0); spent += cost;
  const byKind = Object.entries(s.byKind ?? {}).map(([k, v]) => `${k} ${v.passed}/${v.total}`).join(', ');
  lines.push(`| ${name} (\`${s.model}\`) | ${s.passed}/${s.runs} | ${(s.rate * 100).toFixed(1)} % | ${byKind} | ${s.tokens.input.toLocaleString('en-US')} | ${(s.tokens.cacheRead ?? 0).toLocaleString('en-US')} | ${s.tokens.output.toLocaleString('en-US')} | $${cost.toFixed(2)} |`);
  const misses = runs.filter(r => !r.pass).map(r => `${r.id} (${r.checks.filter(c => !c.pass).map(c => c.name.replace(/:.*/, '')).join(', ')})`);
  details.push(`## ${name}: ${misses.length} miss${misses.length === 1 ? '' : 'es'}`, misses.length ? misses.map(m => `- ${m}`).join('\n') : '- none', '');
}
lines.push('', `**Spend this run: $${spent.toFixed(2)}** (cap $${maxUsd}).`, '');
// Last month's report, for the trend.
const previous = existsSync(REPORT_DIR) ? readdirSync(REPORT_DIR).filter(f => /^\d{4}-\d{2}\.md$/.test(f) && f < `${month}.md`).sort().pop() : null;
if (previous) {
  const prev = readFileSync(join(REPORT_DIR, previous), 'utf8'), rows = [...prev.matchAll(/^\| (\w+) \(`[^`]+`\) \| (\d+)\/(\d+) \| ([\d.]+) %/gm)];
  if (rows.length) lines.push(`Previous report (${previous.replace('.md', '')}): ${rows.map(r => `${r[1]} ${r[4]} %`).join(', ')}.`, '');
}
lines.push(...details);
mkdirSync(REPORT_DIR, {recursive: true});
const report = join(REPORT_DIR, `${month}${limit > 0 ? `-dry-run` : ''}.md`);
writeFileSync(report, lines.join('\n'));
console.log(`report: ${report.replace(REPO + '/', '')}; spend $${spent.toFixed(2)}${spent > maxUsd ? ' — OVER THE CAP (the forecast was wrong; check the per-case tokens before the next run)' : ''}`);
