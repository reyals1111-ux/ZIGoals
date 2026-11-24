import {expect, test, type Page} from '@playwright/test';
import {typeGoalName} from './goal-name';

/**
 * Session AV lane 2 ([TIER 3] (PWA), owner follow-up 8, ADR-045 D-CI2016-J04): "Reload" for a new version.
 * In a takeover that stalled, a request of the page (the router prefetching /app/settings) reached the old worker as
 * Chromium was stopping it, and the new worker never took over. Now the page's requests wait from the tap until the new
 * worker controls the page; if it has not in 5 s, the bar says how to finish by hand, and nothing reloads by itself.
 * Proven with Playwright's request interception only, as Part 2's proof (av-update): the newer worker's script and a
 * probe request are answered here. Fictional data; every /api call answers 503.
 */
test.use({serviceWorkers: 'allow'});
const NOTE = 'A new version of ZIGoals is ready.', LATE = 'Almost there: close ZIGoals and open it again to finish the update.';
const activeScript = (page: Page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? '');

async function open(page: Page, path: string) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto(path);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  // The app's own worker controls the page first, as for a friend who has used ZIGoals before.
  await expect.poll(() => activeScript(page), {timeout: 30_000}).toMatch(/\/sw\.js\?v=[0-9a-z-]+$/);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {timeout: 30_000}).toBe(true);
}
/** A newer version is deployed: its worker installs and waits, and the bar offers "Reload". */
async function newerVersion(page: Page, version: string) {
  await page.evaluate(v => navigator.serviceWorker.register(`/sw.js?v=${v}`, {scope: '/', updateViaCache: 'none'}), version);
  const bar = page.getByRole('status').filter({hasText: NOTE});
  await expect(bar).toBeVisible({timeout: 30_000});
  return bar;
}
const documentsOf = (page: Page) => { const seen = {n: 0}; page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) seen.n += 1; }); return seen; };

test('"Reload": a request the page makes during the takeover waits until the new worker controls the page', async ({page, isMobile}) => {
  test.skip(isMobile, 'the takeover is the same on a phone; once is enough');
  test.setTimeout(120_000);
  await open(page, '/app/goals');
  const times: Record<string, number> = {};
  await page.exposeFunction('takeoverSeen', (name: string) => { times[name] ??= Date.now(); });
  await page.evaluate(() => navigator.serviceWorker.addEventListener('controllerchange', () => { void (window as unknown as {takeoverSeen: (n: string) => void}).takeoverSeen('controlled'); }));
  await page.route('**/takeover-probe.txt', async route => { times.probe ??= Date.now(); await route.fulfill({status: 200, body: 'probe'}); });
  const bar = await newerVersion(page, 'takeover-hold');
  const loaded = page.waitForEvent('load', {timeout: 20_000});
  await bar.getByRole('button', {name: 'Reload'}).click();
  // As the router's prefetch did in the stalled takeovers: a request right after the tap.
  await page.evaluate(() => { void fetch('/takeover-probe.txt').catch(() => undefined); }).catch(() => undefined);
  await loaded;
  await expect.poll(() => activeScript(page), {timeout: 20_000}).toMatch(/v=takeover-hold$/);
  expect(times.controlled, 'the new worker took over').toBeTruthy();
  // The probe went out only once the takeover was over (or not at all, if the reload came first): never during it.
  if (times.probe) expect(times.probe).toBeGreaterThanOrEqual(times.controlled!);
});

test('"Reload" and the new version does not take over: after 5 s the bar says how to finish; nothing reloads; the typed name stays', async ({page, context, isMobile}) => {
  test.skip(isMobile, 'the takeover is the same on a phone; once is enough');
  test.setTimeout(120_000);
  // This newer worker never takes over (its script, answered here, ignores the takeover message), as in a stalled takeover.
  await context.route(url => url.pathname === '/sw.js' && url.searchParams.get('v') === 'never-takes-over', async route => {
    const real = await route.fetch();
    const script = (await real.text()).replace("if (type === 'zigoals:sw-reload') event.waitUntil(self.skipWaiting());", '');
    await route.fulfill({response: real, body: script, headers: {...real.headers(), 'content-type': 'text/javascript'}});
  });
  await open(page, '/app/goals/new');
  await typeGoalName(page, 'Fictional cabin by the lake');
  const documents = documentsOf(page);
  const bar = await newerVersion(page, 'never-takes-over');
  const tapped = Date.now();
  await bar.getByRole('button', {name: 'Reload'}).click();
  const late = page.getByRole('status').filter({hasText: LATE});
  await expect(late).toBeVisible({timeout: 10_000});
  expect(Date.now() - tapped, 'the note comes after the 5 s the takeover is given').toBeGreaterThanOrEqual(4_900);
  await expect(late.getByRole('button', {name: 'Reload'})).toHaveCount(0);
  // Nothing reloaded, nothing open was touched, and the page still answers (the held requests went on).
  expect(documents.n).toBe(0);
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Fictional cabin by the lake');
  expect(await page.evaluate(async () => (await fetch('/manifest.webmanifest')).status)).toBe(200);
  await page.waitForTimeout(3_000);
  expect(documents.n, 'never a reload by itself, never a loop').toBe(0);
  await late.getByRole('button', {name: 'OK'}).click();
  await expect(page.getByRole('status').filter({hasText: LATE})).toHaveCount(0);
});
