#!/usr/bin/env node
// Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): a local proof with two real production builds of this app, served one
// after the other on the same port to the same browser profile (service worker allowed), as a friend's phone meets a
// deploy. Not run in CI (it needs two builds); CI proves the same paths with interception (apps/web/tests/av-update.spec.ts).
//   node scripts/av/two-builds.mjs <build A's .next copy> <build B's .next copy> [port]
// It replaces apps/web/.next with each copy in turn (the original is put back at the end), starts `next start`, and checks:
//  1. A tab of A, open across the deploy, hears of the new version when it comes back to the front (the note), and a page
//     change loads B fully: no crash screen, no "module factory" or chunk error, Settings names B's commit.
//  2. Opening the app again after the deploy (A's worker still in control) shows B and never asks to reload for a version
//     the page already runs: B's worker takes over quietly.
// Fictional data only; every /api call answers 503; nothing leaves 127.0.0.1.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp, rename, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
const [aDir, bDir, portArg] = process.argv.slice(2);
if (!aDir || !bDir) { console.error('Usage: node scripts/av/two-builds.mjs <build A .next copy> <build B .next copy> [port]'); process.exit(2); }
const web = resolve(new URL('../../apps/web', import.meta.url).pathname), port = Number(portArg ?? 3109), origin = `http://127.0.0.1:${port}`;
const require = createRequire(join(web, 'package.json'));
const {chromium} = require('@playwright/test');
const live = join(web, '.next'), keep = join(web, '.next-av-original');
let server = null;
const exists = p => stat(p).then(() => true, () => false);
async function serve(dir) {
  if (server) { server.kill('SIGTERM'); await new Promise(r => server.once('exit', r)); server = null; }
  if (await exists(live)) await rm(live, {recursive: true, force: true});
  await (await import('node:fs/promises')).cp(resolve(dir), live, {recursive: true});
  server = spawn('pnpm', ['exec', 'next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {cwd: web, stdio: 'ignore'});
  for (let i = 0; i < 60; i++) { try { const r = await fetch(origin + '/app', {method: 'HEAD'}); if (r.ok) return r.headers.get('x-zigoals-build'); } catch { /* starting */ } await new Promise(r => setTimeout(r, 500)); }
  throw Error('the server did not start');
}
const results = [];
const check = (ok, what) => { results.push({ok, what}); console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); };
// The page's own build, as Settings' diagnostics print it ("App version / build commit"), read from the page's text (a
// folded group keeps its words in the page).
const settingsCommit = async page => {
  await page.goto(origin + '/app/settings').catch(() => {}); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  for (let i = 0; i < 20; i++) { const m = (await page.evaluate(() => document.body.textContent ?? '')).match(/build commit\s*[^·]*·\s*([0-9a-f]{40})/); if (m) return m[1]; await page.waitForTimeout(500); }
  return null;
};
let profile;
try {
  if (await exists(live)) await rename(live, keep);
  const buildA = await serve(aDir);
  profile = await mkdtemp(join(tmpdir(), 'av-two-builds-'));
  const context = await chromium.launchPersistentContext(profile, {channel: 'chrome', headless: true, serviceWorkers: 'allow', viewport: {width: 390, height: 844}, locale: 'en-US'});
  await context.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  const page = context.pages()[0] ?? await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/app');
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.reload();
  for (let i = 0; i < 60 && !(await page.evaluate(() => !!navigator.serviceWorker.controller)); i++) { await page.waitForTimeout(500); if (i === 20) await page.reload(); }
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), `build A (${buildA?.slice(0, 8)}) controls the tab with its worker`);
  check(await settingsCommit(page) === buildA, 'Settings names build A');
  await page.goto(origin + '/app/help'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});

  // The deploy.
  const buildB = await serve(bDir);
  check(!!buildB && buildB !== buildA, `the server now serves build B (${buildB?.slice(0, 8)})`);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const note = page.getByRole('status').filter({hasText: 'A new version of ZIGoals is ready.'});
  check(await note.waitFor({timeout: 10_000}).then(() => true, () => false), 'the open tab of A says a new version is ready');
  await note.getByRole('button', {name: 'Later'}).click().catch(() => {});
  const loads = [];
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) loads.push(r.url()); });
  await page.getByRole('link', {name: 'Notes', exact: true}).first().click().catch(async () => { await page.goto(origin + '/app/notes'); });
  await page.waitForURL('**/app/notes'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  check(loads.length >= 1, 'a page change across the deploy loads the new version fully');
  check(await page.getByRole('heading', {name: 'This page could not be shown.'}).count() === 0, 'no crash screen');
  check(await settingsCommit(page) === buildB, 'Settings names build B');

  // Opening the app again later: A's worker still controls; the page is B and does not ask to reload for itself.
  await page.goto(origin + '/app'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.waitForTimeout(8000);
  check(await note.count() === 0, 'a page already on build B never asks to reload for build B');
  const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '');
  check(controller.includes(`v=${buildB.slice(0, 12)}`), `build B's worker took over quietly (${controller.split('?')[1] ?? 'none'})`);
  check(!errors.some(e => /module factory|ChunkLoadError|Loading chunk|dynamically imported module/i.test(e)), `no chunk or module error on the page (${errors.length} page errors in all)`);
  await context.close();
} finally {
  if (server) { server.kill('SIGTERM'); await new Promise(r => server.once('exit', r)); }
  await rm(live, {recursive: true, force: true});
  if (await exists(keep)) await rename(keep, live);
  if (profile) await rm(profile, {recursive: true, force: true});
}
const failed = results.filter(r => !r.ok).length;
console.log(`${results.length - failed} of ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
