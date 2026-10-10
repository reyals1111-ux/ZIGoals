#!/usr/bin/env node
import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {PRICES_AS_OF, estimateCost} from '../../apps/web/lib/ai/pricing.ts';

/**
 * Session Z-Local: the API ledger, rebuilt from the run files on the runs worktree (never typed by hand). Every file a
 * real-Claude stage wrote carries its own usage counts (input, output, cache writes, cache reads: thinking tokens are
 * output; the repair round and every tool round counted); each call is priced at the dated table in
 * `apps/web/lib/ai/pricing.ts`. Three file shapes are read:
 * - a harness file `{summary: {provider: 'anthropic', model, …}, runs: [{tokens, requests, costUsd, …}]}`;
 * - a panel file: a list of UI runs with `usage: {model, input, output, cacheWrite, cacheRead, requests}`;
 * - a batch file `{summary: {provider: 'anthropic', model, batch: true, tokens: {…}, requests}}`.
 * Usage: node scripts/zigi/ledger.mjs [--runs <dir>] [--cap 130] [--check <forecastUsd>]
 * `--check` exits 1 when the total so far plus the forecast would cross the cap (a stage refuses to start on it).
 */
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const RUNS = opt('--runs', '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs'), CAP = Number(opt('--cap', '130')), CHECK = opt('--check', null);
const rows = new Map();
const key = (stage, model, batch) => `${stage}\u0000${model}\u0000${batch ? 'batch' : 'api'}`;
function addRow(stage, model, batch, usage, requests, cost) {
  const k = key(stage, model, batch), r = rows.get(k) ?? {stage, model, batch, requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, usd: 0, unreported: 0, files: 0};
  r.requests += requests; r.input += usage.input ?? 0; r.cacheWrite += usage.cacheWrite ?? 0; r.cacheRead += usage.cacheRead ?? 0; r.output += usage.output ?? 0;
  if (usage.input === null && usage.output === null && requests > 0) r.unreported += requests;
  r.usd += cost ?? 0;
  rows.set(k, r);
  return r;
}
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) { const p = join(dir, name); const st = statSync(p); if (st.isDirectory()) walk(p, out); else if (name.endsWith('.json') && !name.endsWith('.summary.json')) out.push(p); }
  return out;
}
const files = walk(join(RUNS, 'real-model')).concat(walk(join(RUNS, 'spoken')), walk(join(RUNS, 'monthly')));
const read = [];
for (const file of files) {
  let data; try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
  const stage = relative(RUNS, file).split('/').slice(0, -1).join('/') || '(root)';
  if (data && data.summary && data.summary.provider === 'anthropic' && Array.isArray(data.runs)) {
    const model = data.summary.model, batch = data.summary.batch === true;
    let count = 0;
    for (const run of data.runs) {
      if (!run.requests) continue;
      const usage = {input: run.tokens?.input ?? null, output: run.tokens?.output ?? null, cacheWrite: run.tokens?.cacheWrite ?? null, cacheRead: run.tokens?.cacheRead ?? null};
      addRow(stage, model, batch, usage, run.requests, estimateCost(model, usage, {batch})); count++;
    }
    read.push({file: relative(RUNS, file), model, turns: count});
  } else if (data && data.summary && data.summary.provider === 'anthropic' && data.summary.batch === true && data.summary.tokens) {
    const model = data.summary.model, usage = data.summary.tokens;
    addRow(stage, model, true, usage, data.summary.requests ?? 0, estimateCost(model, usage, {batch: true}));
    read.push({file: relative(RUNS, file), model, turns: data.summary.requests ?? 0});
  } else if (Array.isArray(data)) {
    let count = 0;
    for (const run of data) {
      const u = run.usage; if (!u || !u.model || !/^claude-/.test(u.model)) continue;
      const usage = {input: u.input ?? null, output: u.output ?? null, cacheWrite: u.cacheWrite ?? null, cacheRead: u.cacheRead ?? null};
      addRow(stage, u.model, false, usage, u.requests ?? 1, estimateCost(u.model, usage)); count++;
    }
    if (count) read.push({file: relative(RUNS, file), model: 'panel', turns: count});
  }
}
const list = [...rows.values()].sort((a, b) => a.stage.localeCompare(b.stage) || a.model.localeCompare(b.model));
const total = list.reduce((s, r) => s + r.usd, 0);
const byModel = {};
for (const r of list) byModel[r.model] = (byModel[r.model] ?? 0) + r.usd;
const n = v => v.toLocaleString('en-US');
const md = [`# API ledger — Session Z-Local (owner cap $${CAP}; hard stop)`, '',
  `Rebuilt by \`scripts/zigi/ledger.mjs\` from the run files on this branch (${read.length} files), each call priced at the published table in \`apps/web/lib/ai/pricing.ts\` (as of ${PRICES_AS_OF}: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.`, '',
  '| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |', '|---|---|---:|---:|---:|---:|---:|---:|',
  ...list.map(r => `| ${r.stage} | ${r.model}${r.batch ? ' (batch)' : ''} | ${n(r.requests)}${r.unreported ? ` (${r.unreported} unreported)` : ''} | ${n(r.input)} | ${n(r.cacheWrite)} | ${n(r.cacheRead)} | ${n(r.output)} | ${r.usd.toFixed(4)} |`),
  '', `**Per model:** ${Object.entries(byModel).map(([m, v]) => `${m} $${v.toFixed(2)}`).join(' · ') || 'nothing yet'}`, '', `**Total: $${total.toFixed(2)} of $${CAP}.**`, ''];
writeFileSync(join(RUNS, 'ledger.md'), md.join('\n'));
writeFileSync(join(RUNS, 'ledger.json'), JSON.stringify({pricesAsOf: PRICES_AS_OF, cap: CAP, total, byModel, rows: list, files: read, rebuiltAt: new Date().toISOString()}, null, 1));
console.log(`Ledger: $${total.toFixed(2)} of $${CAP} over ${list.length} stage rows (${read.length} files).`);
if (CHECK !== null) {
  const forecast = Number(CHECK);
  if (total + forecast > CAP) { console.error(`REFUSED: $${total.toFixed(2)} spent + $${forecast.toFixed(2)} forecast = $${(total + forecast).toFixed(2)} > cap $${CAP}.`); process.exit(1); }
  console.log(`OK to start: $${total.toFixed(2)} + $${forecast.toFixed(2)} forecast stays under $${CAP}.`);
}
