#!/usr/bin/env node
// Session W Part 22 (owner addition E): where the packaged Alpha Worker spends its time, on this machine. The dry run's
// bundle runs in workerd through Miniflare, hermetic (outbound requests refused, no developer secrets). For each route,
// several rounds of: a fresh Worker (a cold isolate: the script's top level, then Next's server and the route's modules
// on the first request), the first request, then warm requests to the same Worker.
// The numbers are LOCAL WORKERD WALL TIME, NOT CLOUDFLARE CPU: they compare two builds and their routes on one machine,
// run one after another; they are not production figures. Never deploys or reaches a network.
//   pnpm --filter @zigoals/web build:alpha
//   pnpm --filter @zigoals/web exec wrangler deploy --config wrangler.alpha.jsonc --dry-run --outdir /tmp/zigoals-alpha-dry
//   ALPHA_PACKAGE_BUNDLE=/tmp/zigoals-alpha-dry/worker.js node scripts/perf/alpha-cold-warm.mjs --rounds 3 --warm 5
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {hermeticWorkerOptions} from '../run11/hermetic-wrangler.mjs';

// wrangler's own copy of miniflare: resolved from its real (pnpm) location, as Node does not follow the symlink here.
const require = createRequire(realpathSync(fileURLToPath(new URL('../../apps/web/node_modules/wrangler/package.json', import.meta.url))));
const {Miniflare, convertV4MiniflareOptions} = require('miniflare'), {unstable_getMiniflareWorkerOptions} = require('wrangler');
const root = new URL('../../', import.meta.url).pathname;
const ROUTES = ['/', '/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/markets', '/app/settings', '/app/help'];
const round = (n) => Math.round(n * 10) / 10;
export const median = (values) => { const s = [...values].sort((a, b) => a - b), n = s.length; return n ? round((s[Math.floor((n - 1) / 2)] + s[Math.floor(n / 2)]) / 2) : null; };

async function worker(script, app) {
  const started = performance.now();
  const mf = new Miniflare(convertV4MiniflareOptions({workers: [{name: 'zigoals-alpha', modules: true, script, compatibilityDate: app.compatibilityDate, compatibilityFlags: app.compatibilityFlags, assets: app.assets, bindings: app.bindings,
    serviceBindings: {WORKER_SELF_REFERENCE: {name: 'zigoals-alpha'}}, outboundService: (request) => { throw Error(`Outbound fixture refused ${new URL(request.url).host}`); }}]}));
  await mf.ready;
  return {mf, readyMs: performance.now() - started};
}
async function timed(mf, path) {
  const start = performance.now();
  const response = await mf.dispatchFetch(`https://alpha.zigoals.app${path}`, {headers: {'cf-connecting-ip': '192.0.2.44'}, redirect: 'manual'});
  await response.arrayBuffer();
  return {ms: performance.now() - start, status: response.status};
}
async function main() {
  const {values} = parseArgs({options: {rounds: {type: 'string', default: '3'}, warm: {type: 'string', default: '5'}, routes: {type: 'string'}}});
  const rounds = Number(values.rounds), warm = Number(values.warm), routes = values.routes ? values.routes.split(',') : ROUTES;
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10 || !Number.isInteger(warm) || warm < 1 || warm > 20) throw Error('Rounds 1–10, warm requests 1–20.');
  const bundle = process.env.ALPHA_PACKAGE_BUNDLE ?? '/tmp/zigoals-alpha-dry/worker.js', script = await readFile(bundle, 'utf8');
  const app = hermeticWorkerOptions(unstable_getMiniflareWorkerOptions, resolve(root, 'apps/web/wrangler.alpha.jsonc')).workerOptions;
  const result = {metric: 'local_workerd_wall_ms_not_cloudflare_cpu', recordedAt: new Date().toISOString(), bundleSha256: createHash('sha256').update(script).digest('hex').slice(0, 16), bundleBytes: Buffer.byteLength(script), rounds, warmRequests: warm, routes: []};
  for (const path of routes) {
    const ready = [], first = [], warmMs = [], statuses = new Set();
    for (let r = 0; r < rounds; r++) {
      const {mf, readyMs} = await worker(script, app);
      try {
        ready.push(readyMs);
        const cold = await timed(mf, path); first.push(cold.ms); statuses.add(cold.status);
        for (let i = 0; i < warm; i++) { const w = await timed(mf, path); warmMs.push(w.ms); statuses.add(w.status); }
      } finally { await mf.dispose(); }
    }
    result.routes.push({route: path, statuses: [...statuses], workerReadyMs: median(ready), firstRequestMs: median(first), warmRequestMs: median(warmMs), firstSamples: first.map(round), warmSamples: warmMs.map(round)});
  }
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main();
