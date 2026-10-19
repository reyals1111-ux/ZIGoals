// Session AF (L5a, Part 10.13, ADR-028 H75): folds the theme parity results (apps/web/test-results/theme-parity/*.json,
// written by tests/theme-parity-af.spec.ts and tests/webkit-theme-parity.spec.ts) into one report: per route, state and
// project, how many differences each allowed class holds in Light and Dark, and every difference H75 does not allow
// (route · state · element · property · Nebula → theme). Empty at Gate C.
//
// Usage: node scripts/parity-report.mjs [<results dir> ...] [--out=docs/verification/session-af/theme-parity.md] [--label=<build>]
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const dirs = args.filter(a => !a.startsWith('--'));
if (!dirs.length) dirs.push(join(ROOT, 'apps', 'web', 'test-results', 'theme-parity'));
const out = flag('out') ?? join(ROOT, 'docs', 'verification', 'session-af', 'theme-parity.md');
const CLASSES = ['text', 'neutral', 'art-calm', 'theme-bar', 'DISALLOWED'];

export function fold(files) {
  const rows = [], disallowed = [], mismatches = [];
  for (const f of files) {
    for (const r of f.results) {
      rows.push({route: f.route, state: f.state, project: f.project, theme: r.theme, elements: f.elements, counts: r.counts});
      if (r.mismatch) mismatches.push(`${f.route} · ${f.state} · ${f.project} · ${r.theme}: ${r.mismatch}`);
      for (const d of r.disallowed) disallowed.push(`${f.route} · ${f.state} · ${f.project} · \`${d.desc}\` [${d.path}] · ${d.prop} · \`${String(d.nebula).slice(0, 140)}\` → ${r.theme}: \`${String(d.other).slice(0, 140)}\`${d.known ? ' — known: another lane’s file (tests/parity/known.ts)' : ''}`);
    }
  }
  rows.sort((a, b) => `${a.route}${a.state}${a.project}${a.theme}`.localeCompare(`${b.route}${b.state}${b.project}${b.theme}`));
  return {rows, disallowed, mismatches};
}

export function render({rows, disallowed, mismatches}, label = '') {
  const total = cls => rows.reduce((n, r) => n + (r.counts[cls] ?? 0), 0);
  return [
    '# Theme parity (Session AF, ADR-028 H75)', '',
    `Results of \`tests/theme-parity-af.spec.ts\`${rows.some(r => r.project === 'mobile') ? ' (computer and phone layouts)' : ''} and \`tests/webkit-theme-parity.spec.ts\`, folded by \`scripts/parity-report.mjs\`${label ? ` on ${label}` : ''}. Each row compares a route in a state with Nebula: the allowed classes are words (text), neutral and night surfaces, lines and shades (neutral; and the page's own ground), the calm of the named art layers (art-calm) and the theme bar; anything else, and any box that moves by more than half a pixel, is DISALLOWED.`, '',
    `Rows: ${rows.length}. Totals — ${CLASSES.map(c => `${c} ${total(c)}`).join(' · ')}.`, '',
    '| Route | State | Project | Theme | Elements | ' + CLASSES.join(' | ') + ' |', '|---|---|---|---|---|' + CLASSES.map(() => '---').join('|') + '|',
    ...rows.map(r => `| ${r.route} | ${r.state} | ${r.project} | ${r.theme} | ${r.elements} | ${CLASSES.map(c => r.counts[c] ?? 0).join(' | ')} |`), '',
    '## Disallowed differences', '', ...(disallowed.length ? disallowed.map(d => `- ${d}`) : ['None.']), '',
    '## Element mismatches (the DOM differed between themes)', '', ...(mismatches.length ? mismatches.map(m => `- ${m}`) : ['None.']), '',
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = dirs.flatMap(d => existsSync(d) ? readdirSync(d).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(join(d, n), 'utf8'))) : []);
  if (!files.length) { console.error(`no parity results in ${dirs.join(', ')}`); process.exit(2); }
  const folded = fold(files);
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, render(folded, flag('label') ?? ''));
  const unknown = folded.disallowed.filter(d => !d.includes('known: another lane')).length;
  console.log(`${out}: ${folded.rows.length} rows, ${folded.disallowed.length} disallowed (${unknown} not known), ${folded.mismatches.length} mismatches`);
  if (unknown || folded.mismatches.length) process.exitCode = 1;
}
