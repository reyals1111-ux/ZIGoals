#!/usr/bin/env node
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, join} from 'node:path';

/**
 * Session Z-Local: one run file → its summary JSON (kept on the feature branch under
 * docs/verification/z-local/real-model/summaries/) and the Markdown rows the test document pastes. Harness files and
 * panel files alike; nothing is typed by hand. Usage: node scripts/zigi/summarise.mjs <run.json>… [--out <summaries dir>]
 */
const args = process.argv.slice(2), outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : 'docs/verification/z-local/real-model/summaries';
const files = args.filter((a, i) => a !== '--out' && (outIdx < 0 || i !== outIdx + 1));
mkdirSync(OUT, {recursive: true});
const median = xs => { const s = [...xs].filter(x => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p90 = xs => { const s = [...xs].filter(x => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : null; };
const pct = (a, b) => b ? `${((100 * a) / b).toFixed(1)} %` : '—';
const n = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US');
for (const file of files) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  let summary, row;
  if (data && data.summary && Array.isArray(data.runs)) {
    const s = data.summary, runs = data.runs, timed = runs.filter(r => r.totalMs > 0);
    const misses = {};
    for (const r of runs) if (!r.pass) for (const c of r.checks) if (!c.pass) { const name = c.name.replace(/:.*/, ''); misses[name] = (misses[name] ?? 0) + 1; }
    const top = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ');
    const byKind = Object.fromEntries(Object.entries(s.byKind ?? {}).map(([k, v]) => [k, `${v.passed}/${v.total}`]));
    const requests = timed.reduce((a, r) => a + (r.requests ?? 1), 0);
    const perTurn = timed.length ? {input: s.tokens.input / timed.length, cacheWrite: (s.tokens.cacheWrite ?? 0) / timed.length, cacheRead: (s.tokens.cacheRead ?? 0) / timed.length, output: s.tokens.output / timed.length, usd: s.costUsd !== null && s.costUsd !== undefined ? s.costUsd / timed.length : null} : null;
    summary = {kind: 'harness', file: basename(file), provider: s.provider ?? 'local', model: s.model, host: s.host, mode: s.mode, think: s.think, cache: s.cache ?? null, cases: s.cases, repeat: s.repeat, runs: s.runs, passed: s.passed, rate: s.rate, byKind: s.byKind,
      latency: {firstTokenMedianMs: median(timed.map(r => r.firstTokenMs)), firstTokenP90Ms: p90(timed.map(r => r.firstTokenMs)), totalMedianMs: median(timed.map(r => r.totalMs)), totalP90Ms: p90(timed.map(r => r.totalMs))},
      tokens: s.tokens, requests, costUsd: s.costUsd ?? null, pricesAsOf: s.pricesAsOf ?? null, perTurn, costPer100Messages: perTurn?.usd !== null && perTurn?.usd !== undefined ? perTurn.usd * 100 : null, repaired: runs.filter(r => r.repaired).length, errors: runs.filter(r => r.error).length, misses: top, startedAt: s.startedAt, finishedAt: s.finishedAt};
    row = `| \`${s.model}\` | ${s.host} | ${s.passed} / ${s.runs} · **${pct(s.passed, s.runs)}** | ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')} | ${n(summary.latency.firstTokenMedianMs)} / ${n(summary.latency.firstTokenP90Ms)} | ${n(summary.latency.totalMedianMs)} | ${perTurn ? `${n(Math.round(perTurn.input))} + ${n(Math.round(perTurn.cacheWrite))} w + ${n(Math.round(perTurn.cacheRead))} r → ${n(Math.round(perTurn.output))}` : '—'} | ${summary.costPer100Messages !== null ? `$${summary.costPer100Messages.toFixed(2)}` : '—'} | ${top || '—'} |`;
  } else if (Array.isArray(data)) {
    const groups = new Map();
    for (const r of data) { const k = `${r.model} on ${r.host} (${r.project})`; const g = groups.get(k) ?? {runs: 0, passed: 0, ms: [], errors: 0, usd: 0, usage: 0}; g.runs++; if (r.score?.pass && !r.error) g.passed++; if (r.ms) g.ms.push(r.ms); if (r.error) g.errors++; if (r.usage?.costUsd) { g.usd += r.usage.costUsd; g.usage++; } groups.set(k, g); }
    summary = {kind: 'panel', file: basename(file), groups: Object.fromEntries([...groups].map(([k, g]) => [k, {runs: g.runs, passed: g.passed, rate: g.runs ? g.passed / g.runs : 0, medianMs: median(g.ms), p90Ms: p90(g.ms), errors: g.errors, costUsd: g.usage ? g.usd : null}]))};
    row = [...groups].map(([k, g]) => `| ${k} | ${g.passed} / ${g.runs} · **${pct(g.passed, g.runs)}** | ${n(median(g.ms))} | ${g.errors} | ${g.usage ? `$${g.usd.toFixed(3)}` : '—'} |`).join('\n');
  } else { console.error(`Unknown shape: ${file}`); continue; }
  const out = join(OUT, `${basename(file)}.summary.json`);
  writeFileSync(out, JSON.stringify(summary, null, 1));
  console.log(`${basename(file)}\n${row}\n→ ${out}`);
}
