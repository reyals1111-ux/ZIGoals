#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';

/**
 * Session Z-Local Part 4 (ADR-020 L7): a run file's pass count per language (en, nl, and fr while it existed), for the
 * French-removal proof: gemma4 before (a worktree at the last commit with French) and after, EN and NL rows side by side.
 * Usage: node scripts/zigi/lang-split.mjs <run.json> [<run.json> …]   Prints one Markdown row per file and language.
 */
const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node scripts/zigi/lang-split.mjs <run.json> …'); process.exit(2); }
console.log('| Run | Model · host | Language | Pass |');
console.log('|---|---|---|---:|');
for (const file of files) {
  const {summary, runs} = JSON.parse(readFileSync(file, 'utf8'));
  const by = new Map();
  for (const r of runs) { const g = by.get(r.lang ?? '?') ?? {passed: 0, total: 0}; g.total++; if (r.pass) g.passed++; by.set(r.lang ?? '?', g); }
  for (const [lang, g] of [...by].sort()) console.log(`| \`${basename(file)}\` | \`${summary.model}\` · ${summary.host} | ${lang} | ${g.passed}/${g.total} · ${((100 * g.passed) / g.total).toFixed(1)} % |`);
}
