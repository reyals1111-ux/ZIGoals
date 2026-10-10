#!/usr/bin/env node
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session Z-Local Part 2: the tables of docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md, rendered from the summary JSON
 * files (`scripts/zigi/summarise.mjs`) between the markers; the prose around them is written by hand, the figures never.
 * Usage: node scripts/zigi/render-claude-doc.mjs [--summaries <dir>] [--doc <file>]
 */
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const DIR = opt('--summaries', join(REPO, 'docs/verification/z-local/real-model/summaries')), DOC = opt('--doc', join(REPO, 'docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md'));
const n = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US');
const pct = r => r === null || r === undefined ? '—' : `${(r * 100).toFixed(1)} %`;
const usd = v => v === null || v === undefined ? '—' : `$${Number(v).toFixed(2)}`;
const summaries = readdirSync(DIR).filter(f => f.endsWith('.summary.json')).map(f => ({name: f, ...JSON.parse(readFileSync(join(DIR, f), 'utf8'))})).sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
const stageOf = s => /nocache/.test(s.file) ? 'Part 3 · cache markers off' : /-subset-/.test(s.file) ? 'Part 3 · cache markers on' : /important-20-/.test(s.file) ? 'Part 2 · the 20-case probe' : /-important-/.test(s.file) ? `Part 2 · important ×${s.repeat ?? 1}` : /-all-/.test(s.file) ? `Part 2 · corpus ×${s.repeat ?? 1}` : s.kind === 'panel' ? 'Part 2 · UI' : 'run';
const rows = ['| Stage | Model | Mode | Cases · turns | Pass | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |', '|---|---|---|---:|---:|---|---|---:|---:|---:|'];
for (const s of summaries.filter(s => s.kind === 'harness')) {
  const kinds = Object.entries(s.byKind ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ');
  const pt = s.perTurn ?? {};
  rows.push(`| ${stageOf(s)} | \`${s.model}\` | ${s.mode}${s.cache === false ? ', no cache' : ''}${s.batch ? ', batch' : ''} | ${n(s.cases)} · ${n(s.runs)} | **${s.passed}/${s.runs} · ${pct(s.rate)}** | ${kinds} | ${n(Math.round(pt.input ?? 0))} + ${n(Math.round(pt.cacheWrite ?? 0))} + ${n(Math.round(pt.cacheRead ?? 0))} → ${n(Math.round(pt.output ?? 0))} | ${pt.usd === undefined ? '—' : `$${pt.usd.toFixed(4)}`} | ${usd(s.costUsd)} | ${n(s.latency?.firstTokenMedianMs)} / ${n(s.latency?.totalMedianMs)} |`);
}
const per100 = ['| Model | Stage | Cost per 100 messages (one request each, cached prefix, quick reply) |', '|---|---|---:|'];
for (const s of summaries.filter(s => s.kind === 'harness' && s.cache !== false && !s.batch && s.perTurn?.usd !== undefined)) per100.push(`| \`${s.model}\` | ${stageOf(s)} | $${(100 * s.perTurn.usd).toFixed(2)} |`);
const doc = readFileSync(DOC, 'utf8'), start = '<!-- tables:start -->', end = '<!-- tables:end -->';
const i = doc.indexOf(start), j = doc.indexOf(end);
if (i < 0 || j < 0) throw new Error('markers missing in the document');
const block = `${start}\n_Rendered by \`scripts/zigi/render-claude-doc.mjs\` from ${summaries.length} summary file(s) on ${new Date().toISOString().slice(0, 10)}; the figures are the API's own usage fields at the dated price table._\n\n${rows.join('\n')}\n\n### Cost per 100 messages\n${per100.join('\n')}\n`;
writeFileSync(DOC, doc.slice(0, i) + block + doc.slice(j));
console.log(`rendered ${rows.length - 2} run row(s) into ${DOC.replace(REPO + '/', '')}`);
