#!/usr/bin/env node
// Session W Part 22: page weight budgets. For each page in scripts/weight-budgets.json, the gzip size (level 6) of the
// scripts its HTML loads, fetched from a running production build (`pnpm --filter @zigoals/web start`), and the "shell":
// the scripts every measured app page loads. A page or the shell over its budget fails the check; the table prints either
// way. Only a loopback origin is accepted, so the check never reaches a network.
//   node scripts/check-weight-budget.mjs http://127.0.0.1:3100
//   node scripts/check-weight-budget.mjs http://127.0.0.1:3100 --json   (the measured numbers, for updating the budgets)
import {gzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function loopbackOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Give the origin of a local production server, such as http://127.0.0.1:3100'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Only a loopback origin such as http://127.0.0.1:3100 is measured.');
  return url.origin;
}
/** The same-origin scripts a page's HTML loads, in order, each once. */
export function scriptSources(html, origin) {
  const out = [];
  for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), origin);
    if (url.origin !== origin || !url.pathname.startsWith('/_next/')) continue;
    if (!out.includes(url.pathname)) out.push(url.pathname);
  }
  return out;
}
export const gzipBytes = (bytes) => gzipSync(bytes, {level: 6}).length;
/** Pages and the shell against their budgets: the rows to print and the ones over. */
export function compare(measured, budgets) {
  const rows = [...Object.entries(measured.pages).map(([path, bytes]) => ({name: path, bytes, ...(budgets.pages[path] ?? {})})), {name: 'shell (on every page)', bytes: measured.shell, ...budgets.shell}];
  const missing = Object.keys(budgets.pages).filter(path => !(path in measured.pages));
  return {rows, over: rows.filter(r => typeof r.budget !== 'number' || r.bytes > r.budget), missing};
}
async function measure(origin, paths, skipMissing = false) {
  const sizes = new Map(), lists = {};
  for (const path of [...paths]) {
    const response = await fetch(origin + path, {redirect: 'manual', headers: {'cache-control': 'no-store'}});
    // --json on an older build (main) leaves out a page it does not have yet.
    if (response.status === 404 && skipMissing) { paths = paths.filter(p => p !== path); continue; }
    if (response.status !== 200) throw Error(`${path} answered ${response.status}; start the production build first.`);
    lists[path] = scriptSources(await response.text(), origin);
    for (const src of lists[path]) {
      if (sizes.has(src)) continue;
      const script = await fetch(origin + src);
      if (script.status !== 200) throw Error(`${src} answered ${script.status}.`);
      sizes.set(src, gzipBytes(Buffer.from(await script.arrayBuffer())));
    }
  }
  const sum = (list) => list.reduce((total, src) => total + sizes.get(src), 0);
  // The shell: what every app page loads (the landing page has its own, smaller set).
  const app = paths.filter(path => path === '/app' || path.startsWith('/app/'));
  const shared = app.length ? lists[app[0]].filter(src => app.every(path => lists[path].includes(src))) : [];
  return {pages: Object.fromEntries(paths.map(path => [path, sum(lists[path])])), shell: sum(shared)};
}
async function main() {
  const args = process.argv.slice(2), origin = loopbackOrigin(args.find(a => !a.startsWith('--')) ?? 'http://127.0.0.1:3100');
  const budgets = JSON.parse(await readFile(new URL('./weight-budgets.json', import.meta.url), 'utf8'));
  const measured = await measure(origin, Object.keys(budgets.pages), args.includes('--json'));
  if (args.includes('--json')) { console.log(JSON.stringify(measured, null, 2)); return; }
  const {rows, over, missing} = compare(measured, budgets), kb = (n) => typeof n === 'number' ? `${(n / 1000).toFixed(1)} kB` : '—';
  console.log(`Page weight (gzip level 6 of the scripts each page loads) at ${origin}`);
  for (const r of rows) console.log(`${r.bytes > r.budget ? 'OVER' : 'ok  '}  ${r.name.padEnd(24)} ${kb(r.bytes).padStart(9)}  budget ${kb(r.budget).padStart(9)}  main ${kb(r.main).padStart(9)}`);
  if (missing.length) console.log(`Not measured: ${missing.join(', ')}`);
  if (over.length) { console.error(`Over budget: ${over.map(r => r.name).join(', ')}. Make the page lighter, or raise its budget in scripts/weight-budgets.json with the reason in the same change.`); process.exitCode = 1; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
