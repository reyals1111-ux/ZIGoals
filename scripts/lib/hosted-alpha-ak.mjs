// Session AK Part 14 (ADR-036; TIER 3 (verifier)): the hosted verifier's AK stage, number 11, appended after every
// existing stage (no stage is renumbered). Read-only and browser-local: nothing is typed or stored, no wallet.
//
// It checks what AK ships on a deployed build: the new pages open (/app/music; Wealth's bills section by ?view=bills;
// the Chess page's "Play here" opens without signing in); the PWA (the manifest's Today and Log weight shortcuts and its
// screenshots; /sw.js answers as a script and the app's one worker takes the page); WalletConnect's relay and verify
// hosts in /app's connect-src; and two switches that may be off and then say so: notifications on a device (GET
// /api/push-device answers "being switched on" until the owner activates them) and the food lookup binding (a 503
// PROVIDER_SETUP_REQUIRED until the food Worker is deployed). An off switch is recorded under report.ak.off, never a
// failure. `expect` is Playwright's, passed in by the caller. No import.meta and no top-level await.
import assert from 'node:assert/strict';

export const AK_PATHS = Object.freeze({music: '/app/music', bills: '/app/wealth?view=bills', chess: '/app/chess'});
/** The WalletConnect hosts the app's connect-src carries (lib/egress-policy.json csp.app.connect, Session AK 1a). */
export const WALLETCONNECT_CONNECT = Object.freeze(['wss://relay.walletconnect.org', 'https://verify.walletconnect.org', 'https://verify.walletconnect.com']);
/** The manifest shortcuts AK added (Part 3), by their address. */
export const AK_SHORTCUTS = Object.freeze(['/app/today', '/app/health?shortcut=weight#weight']);

/** The manifest's AK parts; a plain sentence for each problem ([] when complete). */
export function manifestProblems(manifest) {
  const out = [], urls = new Set((manifest?.shortcuts ?? []).map(s => s?.url));
  for (const url of AK_SHORTCUTS) if (!urls.has(url)) out.push(`manifest: no shortcut to ${url}`);
  const shots = manifest?.screenshots ?? [];
  if (!shots.some(s => s?.form_factor === 'wide') || !shots.some(s => s?.form_factor !== 'wide')) out.push('manifest: screenshots need one wide and one narrow');
  return out;
}
/** The connect-src directive of a Content-Security-Policy header, as a list ([] when absent). */
export function connectSrc(csp) {
  const part = String(csp ?? '').split(';').map(s => s.trim()).find(s => s.startsWith('connect-src '));
  return part ? part.split(/\s+/).slice(1) : [];
}
/** GET /api/push-device: 'on', 'off' (being switched on), or a problem sentence. */
export function pushState(status, body) {
  if (status === 200 && body?.enabled === true && typeof body.publicKey === 'string' && /^[A-Za-z0-9_-]{80,100}$/.test(body.publicKey)) return 'on';
  if (status === 200 && body?.enabled === false) return 'off';
  return `push-device: unexpected answer ${status} ${JSON.stringify(body).slice(0, 120)}`;
}
/** GET /api/food-lookup?code=…: 'bound' (the Worker answered: a product or NOT_FOUND), 'unbound' (not deployed yet), or a problem. */
export function foodState(status, body) {
  if (status === 200 || (status === 404 && body?.error === 'NOT_FOUND')) return 'bound';
  if (status === 503 && body?.error === 'PROVIDER_SETUP_REQUIRED') return 'unbound';
  if (status === 429) return 'bound';
  return `food-lookup: unexpected answer ${status} ${JSON.stringify(body).slice(0, 120)}`;
}

async function ak(page, {base, expect, report}) {
  report.ak = {off: [], problems: []};
  // 1. The music page, opened first (every browser stage opens its own page first).
  await page.goto(base + AK_PATHS.music);
  await expect(page.locator('main h1').first()).toBeVisible();
  // 2. The PWA: the manifest, the worker script, and the app's one worker taking the page.
  const manifest = await (await fetch(base + '/manifest.webmanifest')).json();
  report.ak.problems.push(...manifestProblems(manifest));
  const sw = await fetch(base + '/sw.js');
  if (sw.status !== 200 || !/javascript/.test(sw.headers.get('content-type') ?? '')) report.ak.problems.push(`/sw.js answered ${sw.status} ${sw.headers.get('content-type')}`);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? ''), {timeout: 30_000}).toMatch(/\/sw\.js\?v=[0-9a-z-]+$/);
  // 3. WalletConnect's hosts in /app's connect-src (the header the page itself was served with).
  const app = await fetch(base + '/app');
  const connect = connectSrc(app.headers.get('content-security-policy'));
  for (const host of WALLETCONNECT_CONNECT) if (!connect.includes(host)) report.ak.problems.push(`connect-src lacks ${host}`);
  // 4. Bills by ?view=bills, and the Chess page's "Play here" (opens without signing in).
  await page.goto(base + AK_PATHS.bills);
  await expect(page.locator('#bills')).toBeVisible({timeout: 20_000});
  await page.goto(base + AK_PATHS.chess);
  await expect(page.locator('main h1').first()).toBeVisible();
  // 5. The two switches: recorded when off, never a failure.
  const push = await fetch(base + '/api/push-device', {cache: 'no-store'});
  const pushAnswer = pushState(push.status, await push.json().catch(() => null));
  if (pushAnswer === 'off') report.ak.off.push('notifications on a device: being switched on (docs/run11/PUSH_PUBLIC_ALPHA.md)'); else if (pushAnswer !== 'on') report.ak.problems.push(pushAnswer);
  const food = await fetch(base + '/api/food-lookup?code=4006381333931', {cache: 'no-store'});
  const foodAnswer = foodState(food.status, await food.json().catch(() => null));
  if (foodAnswer === 'unbound') report.ak.off.push('barcode lookup: the food Worker is not bound yet (docs/run11/FOOD_WORKER_PUBLIC_ALPHA.md)'); else if (foodAnswer !== 'bound') report.ak.problems.push(foodAnswer);
  assert.deepEqual(report.ak.problems, [], 'AK stage');
}

export const AK_STAGE = {number: 11, key: 'ak', name: 'AK: music, bills, chess, the PWA, WalletConnect hosts, and the push and food switches', browser: true, liveOnly: false, reportsItself: false, run: ak};
