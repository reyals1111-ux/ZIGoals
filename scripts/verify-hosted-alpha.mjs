// Explicit manual public smoke. Never part of CI, never connects a wallet. Optional: EXPECTED_COMMIT=<40-hex SHA> (Session W).
// Status: PASS (exit 0), FAIL (1), COMPLETED_WITH_FINDINGS (2) or NEEDS_OWNER_REVIEW (3): an answer it could not check, or
// live prices that are not VERIFIED. The live price check runs first and never stops the rest (Session U Part 2b).
// Fresh ephemeral context; fictional browser-local data only; no mocks.
// Session AE (Part 0b, ADR-027): the stages live in lib/hosted-alpha-stages.mjs, in the order they run, and each opens its
// own page first. Optional: ZIGOALS_VERIFY_BASE=http://127.0.0.1:3101 (an https:// or http:// loopback origin) runs every
// app check against that base, a local production build, and skips the live-only checks it lists in `skipped`.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { REVIEWED_TESTNET_VERSIONS } from '../packages/chain-config/src/index.ts';
import { hostedStatus } from './lib/hosted-alpha-review.mjs';
import { LIVE_ORIGINS, SENTINELS, VERIFIER_STAGES, liveOnlySkips, setAsideUnboundApi, verifyBase } from './lib/hosted-alpha-stages.mjs';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const output = process.argv[2];
if (!output) throw Error('Provide a new evidence output directory.');
let target;
try { target = verifyBase(process.env.ZIGOALS_VERIFY_BASE); } catch (error) { console.error(error.message); process.exit(1); }
// `alpha` is the origin every app check uses: the live Alpha, or the local base.
const { base: alpha, live } = target;
await mkdir(output);
// Session T (ADR-012): the reviewed connect-src comes from the app's own data file, never a copy (lib/csp-compose.mjs
// composes the reviewed sources, Session W Part 1e).
const egressPolicy = JSON.parse(await readFile(new URL('../apps/web/lib/egress-policy.json', import.meta.url), 'utf8'));
const { apex } = LIVE_ORIGINS;
// Session W Part 1d: with EXPECTED_COMMIT set to a full SHA, every /app answer must name that build (x-zigoals-build).
const expectedBuild = /^[a-f0-9]{40}$/.test(process.env.EXPECTED_COMMIT ?? '') ? process.env.EXPECTED_COMMIT : null;
const report = { observedAt: new Date().toISOString(), evidenceSource: 'INDEPENDENT_HOSTED_SMOKE', expectedBuild, builds: [], review: [], sourceScript: fileURLToPath(import.meta.url), mocks: false, walletInteraction: false, freshEphemeralContext: true, responses: [], requestRecords: [], pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], layouts: [], stages: [], limits: ['Single client and small request sample; not load testing or Core Web Vitals.', 'This automated smoke does not inspect Cloudflare CPU/account metrics or private email settings.', 'No real wallet extension test; owner evidence remains separate.'] };
// A local base is never evidence of the live Alpha: its own evidence source, the base and what it skipped.
if (!live) Object.assign(report, { evidenceSource: 'LOCAL_BASE_SMOKE', base: alpha, skipped: liveOnlySkips(alpha) });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', permissions: [] });
const page = await context.newPage();
const captures = [];
page.on('request', request => captures.push(request.allHeaders().then(headers => ({ url: request.url(), method: request.method(), headers, body: request.postData() })).catch(error => ({ url: request.url(), method: request.method(), captureError: String(error) }))));
// Session AE Gate C: a request the leaving page starts in the instant of a navigation (a link prefetch after the layout
// samples resized the viewport) can lose its target before its headers are read; the capture check below then failed on
// the verifier's own timing (a local run: 2 of 1,226 requests, right after Settings' samples), not on the site. So every
// navigation and reload waits until the page has had no request in flight for half a second (at most 10 s). The check
// itself is unchanged: a capture that still fails fails the run, now with its URL.
const inFlight = new Set();
page.on('request', r => inFlight.add(r)); page.on('requestfinished', r => inFlight.delete(r)); page.on('requestfailed', r => inFlight.delete(r));
async function settled() { const end = Date.now() + 10000; let calm = 0; while (Date.now() < end) { calm = inFlight.size ? 0 : calm + 1; if (calm >= 5) return; await new Promise(r => setTimeout(r, 100)); } }
for (const name of ['goto', 'reload']) { const original = page[name].bind(page); page[name] = async (...args) => { await settled(); return original(...args); }; }
page.on('pageerror', e => report.pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({message:m.text(),location:m.location(),pageUrl:page.url()}); });
page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), failure: r.failure() }));
page.on('response', r => { if (r.status() >= 400) report.httpErrors.push({url:r.url(), status:r.status()}); });
const ctx = { base: alpha, live, origins: LIVE_ORIGINS, expectedCommit: expectedBuild, expect, report, reviewedVersions: REVIEWED_TESTNET_VERSIONS, egressPolicy, output };
try {
  let alphaCaptureCount = captures.length;
  for (const stage of VERIFIER_STAGES) {
    // Every request the page made before the landing stage was made on the Alpha (the origin allow-list below).
    if (stage.key === 'landing') alphaCaptureCount = captures.length;
    if (stage.liveOnly && !live) { report.stages.push({name:stage.name, status:'SKIPPED'}); continue; }
    await stage.run(page, ctx);
    if (!stage.reportsItself) report.stages.push({name:stage.name, status:'PASS'});
  }
  await page.waitForLoadState('networkidle');
  let drained=0; while(drained<captures.length) {const batch=captures.slice(drained); drained+=batch.length; report.requestRecords.push(...await Promise.all(batch));}
  assert(!report.requestRecords.some(r=>r.captureError));
  const egress=JSON.stringify(report.requestRecords);
  report.privacy={sentinels:SENTINELS, requestsInspected:report.requestRecords.length, completeHeaderCapture:'request.allHeaders()',matches:SENTINELS.filter(value=>egress.includes(value))};
  assert.deepEqual(report.privacy.matches,[]);
  report.requestOrigins=[...new Set(report.requestRecords.map(r=>new URL(r.url).origin))];
  report.alphaRequestOrigins=[...new Set(report.requestRecords.slice(0,alphaCaptureCount).map(r=>new URL(r.url).origin))];
  assert(report.alphaRequestOrigins.every(o=>[alpha,'https://testnet-rpc.zigchain.com','https://testnet-api.zigchain.com'].includes(o)));
  // Existing apex HTML explicitly loads Space Grotesk from Google Fonts; Alpha fonts are local.
  report.landingExternalResources=report.requestRecords.filter(r=>['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(r.url).origin)).map(r=>r.url);
  assert(report.requestOrigins.every(o=>[alpha,apex,'https://testnet-rpc.zigchain.com','https://testnet-api.zigchain.com','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(o)));
  assert(report.requestRecords.every(r=>r.method==='GET'));
  // A local build has none of the deployment's bindings: the base's own /api answers of 503 are set aside, not counted.
  if (!live) setAsideUnboundApi(report, alpha);
  assert.deepEqual(report.pageErrors,[]); assert.deepEqual(report.httpErrors,[]);
  report.status=hostedStatus(report);
  if (report.status !== 'PASS') process.exitCode=report.status==='NEEDS_OWNER_REVIEW'?3:2;
} catch(error) { report.status='FAIL'; report.failure=String(error); report.failureStack=error.stack; report.failurePage=await page.locator('body').innerText().catch(()=> 'unavailable'); await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{}); process.exitCode=1; }
finally {
  // The skipped checks are not findings: a local base whose only gaps are these ends PASS, and says so.
  if (!live) report.summary=`${report.status} on a local base (${alpha}); skipped as live only: ${report.skipped.map(s=>s.stage).join('; ')}`;
  report.completedAt=new Date().toISOString(); await writeFile(output+'/HOSTED_SMOKE.json',JSON.stringify(report,null,2)+'\n'); await context.close(); await browser.close();
}
console.log(JSON.stringify({status:report.status, ...(live ? {} : {summary:report.summary, base:alpha, skipped:report.skipped}), stages:report.stages, review:report.review, policyWindow:report.policyWindow?.text, failure:report.failure, output}));
