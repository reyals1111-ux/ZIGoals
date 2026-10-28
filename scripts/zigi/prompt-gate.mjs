#!/usr/bin/env node
import {readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {G6} from '../../apps/web/lib/ai/evals/g6-regression.ts';

/**
 * Session AI (DE7, G2): the chip gate, rebuilt from real-model runs of the G6 set (never typed by hand).
 *   node scripts/zigi/prompt-gate.mjs <runs folder with g6 run files> [--out apps/web/lib/ai/prompt-gate.json]
 * For each chip (a G6 case's `chip`), the newest g6 run file per model gives pass or fail (every repeat must pass). A chip
 * is shown in the app only when it passed on Claude Sonnet 5.5 and on Claude Haiku 5.5 (lib/ai/prompt-gate.ts).
 * The output holds chip ids, case ids, models, results and dates only.
 */
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')), outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : new URL('../../apps/web/lib/ai/prompt-gate.json', import.meta.url).pathname;
if (!dir) { console.error('usage: prompt-gate.mjs <runs folder> [--out file]'); process.exit(2); }
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? (n === 'batches' ? [] : walk(p)) : n.endsWith('.json') ? [p] : []; });
const newest = new Map();
for (const file of walk(dir)) {
  let data; try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
  if (!data?.summary || !Array.isArray(data.runs) || !String(data.summary.set).split('+').includes('g6')) continue;
  const prev = newest.get(data.summary.model);
  if (!prev || prev.summary.startedAt < data.summary.startedAt) newest.set(data.summary.model, data);
}
const CHIP_OF = Object.fromEntries(G6.filter(c => c.chip).map(c => [c.id, c.chip]));
const gate = {source: 'real-model runs of the G6 set (scripts/zigi/prompt-gate.mjs)', rule: 'shown only when passed on claude-sonnet-5-5 and claude-haiku-5-5', models: {}, chips: {}};
for (const [model, data] of newest) {
  gate.models[model] = data.summary.startedAt;
  for (const [caseId, chip] of Object.entries(CHIP_OF)) {
    const runs = data.runs.filter(r => r.id === caseId);
    if (!runs.length) continue;
    (gate.chips[chip] ??= {case: caseId})[model] = runs.every(r => r.pass);
  }
}
writeFileSync(out, `${JSON.stringify(gate, null, 1)}\n`);
const shown = Object.values(gate.chips).filter(c => c['claude-sonnet-5-5'] && c['claude-haiku-5-5']).length;
console.log(`prompt gate: ${shown}/${Object.keys(gate.chips).length} chips pass on both models; written to ${out}`);
