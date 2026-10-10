#!/usr/bin/env node
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
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
const stageOf = s => s.set === 'spoken' ? `Part 6 · the spoken set${s.pageContext ? ', page records' : ''}` : s.provider === 'local' && !/^anthropic/.test(s.file) ? `Part 6 · local, ${s.stage ?? 'corpus'}` : /nocache/.test(s.file) ? 'Part 3 · cache markers off' : /-subset-/.test(s.file) ? 'Part 3 · cache markers on' : /important-20-/.test(s.file) ? 'Part 2 · the 20-case probe' : /-important-/.test(s.file) ? `Part 2 · important ×${s.repeat ?? 1}` : /-all-.*-page-/.test(s.file) ? `Part 6 · corpus ×${s.repeat ?? 1} after the fix rounds` : /-all-/.test(s.file) ? `Part 2 · corpus ×${s.repeat ?? 1}` : s.kind === 'panel' ? 'Part 2 · UI' : 'run';
const RUNS = '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs/real-model';
/** The pass count under the scorer and corpus as they are now (`lib/ai/evals/rescore.test.ts`), when a re-scored file sits beside the run file on the runs branch. */
const rescored = s => { try { for (const dir of readdirSync(RUNS)) { const f = join(RUNS, dir, `${s.file}.rescored.json`); if (existsSync(f)) { const r = JSON.parse(readFileSync(f, 'utf8')); const inCorpus = r.runs.filter(x => x.rescored).length; return `${r.summary.passed}/${inCorpus}`; } } } catch { /* no runs worktree here */ } return '—'; };
const rows = ['| Stage | Model | Mode | Cases · turns | Pass (then) | Pass re-scored now (turns still in the corpus) | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |', '|---|---|---|---:|---:|---:|---|---|---:|---:|---:|'];
for (const s of summaries.filter(s => s.kind === 'harness')) {
  const kinds = Object.entries(s.byKind ?? {}).map(([k, v]) => `${k} ${typeof v === 'string' ? v : `${v.passed}/${v.total}`}`).join(' · ');
  const pt = s.perTurn ?? {};
  rows.push(`| ${stageOf(s)} | \`${s.model}\` | ${s.mode}${s.cache === false ? ', no cache' : ''}${s.batch ? ', batch' : ''}${s.pageContext ? ', page records' : ''} | ${n(s.cases)} · ${n(s.runs)} | **${s.passed}/${s.runs} · ${pct(s.rate)}** | ${rescored(s)} | ${kinds} | ${n(Math.round(pt.input ?? 0))} + ${n(Math.round(pt.cacheWrite ?? 0))} + ${n(Math.round(pt.cacheRead ?? 0))} → ${n(Math.round(pt.output ?? 0))} | ${pt.usd === undefined ? '—' : `$${pt.usd.toFixed(4)}`} | ${usd(s.costUsd)} | ${n(s.latency?.firstTokenMedianMs)} / ${n(s.latency?.totalMedianMs)} |`);
}
// Session Z-Local Part 2: the UI stages (the real panel in Chrome or WebKit), one row per stage and project, from the panel summaries.
const uiRows = ['| Stage | Model | Browser · project | Pass | Median ms | Errors | Cost |', '|---|---|---|---:|---:|---:|---:|'];
for (const s of summaries.filter(s => s.kind === 'panel')) for (const [key, g] of Object.entries(s.groups ?? {})) {
  const project = /\((\w+)\)$/.exec(key)?.[1] ?? '—', engine = /webkit/i.test(s.stage ?? '') ? 'WebKit' : 'Chrome';
  uiRows.push(`| ${s.stage ?? s.file} | \`${key.replace(/ on .*$/, '')}\` | ${engine} · ${project} | **${g.passed}/${g.runs} · ${pct(g.rate)}** | ${n(g.medianMs)} | ${g.errors ?? 0} | ${g.costUsd === null || g.costUsd === undefined ? '—' : usd(g.costUsd)} |`);
}
const per100 = ['| Model | Stage | Cost per 100 messages (one request each, cached prefix, quick reply) |', '|---|---|---:|'];
for (const s of summaries.filter(s => s.kind === 'harness' && s.cache !== false && !s.batch && s.perTurn?.usd !== undefined)) per100.push(`| \`${s.model}\` | ${stageOf(s)} | $${(100 * s.perTurn.usd).toFixed(2)} |`);
const doc = readFileSync(DOC, 'utf8'), start = '<!-- tables:start -->', end = '<!-- tables:end -->';
const i = doc.indexOf(start), j = doc.indexOf(end);
if (i < 0 || j < 0) throw new Error('markers missing in the document');
const block = `${start}\n_Rendered by \`scripts/zigi/render-claude-doc.mjs\` from ${summaries.length} summary file(s) on ${new Date().toISOString().slice(0, 10)}; the figures are the API's own usage fields at the dated price table._\n\n${rows.join('\n')}\n\n### Cost per 100 messages\n${per100.join('\n')}\n\n### The UI stages (the real panel)\n${uiRows.length > 2 ? uiRows.join('\n') : '_No UI stage summarised yet._'}\n`;
writeFileSync(DOC, doc.slice(0, i) + block + doc.slice(j));
console.log(`rendered ${rows.length - 2} run row(s) into ${DOC.replace(REPO + '/', '')}`);
