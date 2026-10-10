#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {estimateCost, PRICES_AS_OF} from '../../apps/web/lib/ai/pricing.ts';

/**
 * Session Z-Local Part 3: the before/after caching measurement, one Markdown row per pair from the two run files (the same
 * cases, cache markers off then on). Input cost = the input, cache-write and cache-read tokens at the dated price table;
 * nothing is typed by hand. Usage: node scripts/zigi/cache-compare.mjs <before.json> <after.json> [<before> <after> …]
 */
const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2) { console.error('pairs of run files: <before.json> <after.json>'); process.exit(2); }
const n = v => Number(v).toLocaleString('en-US');
const read = file => { const d = JSON.parse(readFileSync(file, 'utf8')); const runs = d.runs.filter(r => r.requests > 0); const sum = k => runs.reduce((a, r) => a + (r.tokens?.[k] ?? 0), 0); return {file: basename(file), model: d.summary.model, runs: runs.length, passed: runs.filter(r => r.pass).length, requests: runs.reduce((a, r) => a + r.requests, 0), tokens: {input: sum('input'), cacheWrite: sum('cacheWrite'), cacheRead: sum('cacheRead'), output: sum('output')}}; };
const inputCost = r => estimateCost(r.model, {...r.tokens, output: 0}) ?? 0, totalCost = r => estimateCost(r.model, r.tokens) ?? 0;
console.log('| Model | Turns | Cache markers | Pass | Requests | Input + cache write + cache read tokens | Input cost | Total cost | Input cost lower by |');
console.log('|---|---:|---|---:|---:|---|---:|---:|---:|');
for (let i = 0; i < args.length; i += 2) {
  const before = read(args[i]), after = read(args[i + 1]);
  if (before.model !== after.model) throw new Error(`models differ: ${before.model} vs ${after.model}`);
  const b = inputCost(before), a = inputCost(after), lower = b > 0 ? (1 - a / b) * 100 : 0;
  console.log(`| \`${before.model}\` | ${before.runs} | off | ${before.passed}/${before.runs} | ${before.requests} | ${n(before.tokens.input)} + ${n(before.tokens.cacheWrite)} + ${n(before.tokens.cacheRead)} | $${b.toFixed(4)} | $${totalCost(before).toFixed(4)} | — |`);
  console.log(`| \`${after.model}\` | ${after.runs} | on | ${after.passed}/${after.runs} | ${after.requests} | ${n(after.tokens.input)} + ${n(after.tokens.cacheWrite)} + ${n(after.tokens.cacheRead)} | $${a.toFixed(4)} | $${totalCost(after).toFixed(4)} | **${lower.toFixed(1)} %** |`);
}
console.log(`\nPrices as of ${PRICES_AS_OF}: cache writes 1.25× and reads 0.05× (Opus and Sonnet) of the input price.`);
