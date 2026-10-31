import {expect, test, type Page} from '@playwright/test';

// Session AK Parts 2–3 (ADR-036 Q3, Q4, A1–A4, QA-23): the app's one service worker in a real browser — registration,
// offline pages, no personal data or API answers in the cache, the update prompt — and Settings → Notifications, switched
// off and (with the route answered here) switched on, where only wake minutes leave the device and a push with no payload
// is composed on the device. The browser's push subscription is stubbed (no push service is reachable here).
test.use({serviceWorkers: 'allow'});
const PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const activeScript = (page: Page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? '');
const cachedPaths = (page: Page) => page.evaluate(async () => { const out: string[] = []; for (const k of await caches.keys()) if (k.startsWith('zigoals-')) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
async function controlled(page: Page) {
  await page.goto('/app');
  await expect.poll(() => activeScript(page), {timeout: 30_000}).toMatch(/\/sw\.js\?v=[0-9a-z-]+$/);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 10_000}).toBe(true);
}

test('the worker caches pages as they are visited; a visited page opens offline, an unvisited one says so plainly', async ({page, context}) => {
  await controlled(page);
  await page.goto('/app/habits');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect.poll(() => cachedPaths(page), {timeout: 10_000}).toEqual(expect.arrayContaining(['/app', '/app/habits']));
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toContainText('pages you opened before open too');
    await page.goto('/app/journey').catch(() => undefined);
    await expect(page.getByRole('heading', {name: 'You are offline'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Open Today'})).toHaveAttribute('href', '/app');
  } finally { await context.setOffline(false); }
});

test('the cache never holds an API answer or a record of yours', async ({page}) => {
  await controlled(page);
  // A habit with a name no page could show unless it came from this device's own storage.
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Sentinel AK7 habit');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Sentinel AK7 habit', exact: true})).toBeVisible();
  for (const path of ['/app', '/app/habits', '/app/today']) { await page.goto(path); await expect(page.locator('main h1').first()).toBeVisible(); }
  const entries = await page.evaluate(async () => {
    const out: {path: string; body: string}[] = [];
    for (const k of await caches.keys()) if (k.startsWith('zigoals-pages-')) { const c = await caches.open(k); for (const r of await c.keys()) out.push({path: new URL(r.url).pathname, body: await (await c.match(r))!.text()}); }
    return out;
  });
  expect(entries.length).toBeGreaterThan(0);
  for (const e of entries) expect(e.body, e.path).not.toContain('Sentinel AK7 habit');
  expect((await cachedPaths(page)).filter(p => p.startsWith('/api/'))).toEqual([]);
});

test('a new version waits for the person: "A new version of ZIGoals is ready · Reload" hands over without losing anything', async ({page}) => {
  await controlled(page);
  // The page registers its own build's version once the page is idle; wait for that first, as a real deploy's next
  // build arrives long after it (otherwise the test's own registration races the page's).
  await page.evaluate(() => new Promise(resolve => (window as Window & {requestIdleCallback: (cb: () => void, o: {timeout: number}) => void}).requestIdleCallback(() => setTimeout(resolve, 1500), {timeout: 5000})));
  await expect.poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/'); return !r?.installing && !r?.waiting; })).toBe(true);
  // The next build's worker, as a deploy would bring it (another version in the address).
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js?v=newer-build', {scope: '/', updateViaCache: 'none'}));
  const bar = page.getByRole('status').filter({hasText: 'A new version of ZIGoals is ready.'});
  await expect(bar).toBeVisible({timeout: 20_000});
  expect((await bar.getByRole('button', {name: 'Reload'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await Promise.all([page.waitForEvent('load', {timeout: 20_000}), bar.getByRole('button', {name: 'Reload'}).click()]);
  // The reloaded page is served by the version that took over (this page then registers its own build's version again,
  // as every page does).
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '').catch(() => ''), {timeout: 20_000}).toMatch(/v=newer-build$/);
  await expect(page.getByRole('status').filter({hasText: 'A new version of ZIGoals is ready.'})).toHaveCount(0);
});

test.describe('Settings → Notifications', () => {
  test('switched off on this build: it says notifications are being switched on, offers no Turn on, and the choices still save', async ({page}) => {
    await page.goto('/app/settings#notifications');
    const card = page.locator('#notifications');
    // On the iPhone project the browser tab is told to add ZIGoals to the Home Screen first (iOS needs the installed app).
    await expect(card.getByRole('status').first()).toHaveText(test.info().project.name === 'mobile' ? 'On iPhone and iPad, notifications work in ZIGoals saved to your Home Screen (iOS 16.4 or later). How to add ZIGoals to your Home Screen →' : 'Notifications are being switched on. Your reminders still show inside ZIGoals.');
    await expect(card.getByRole('button', {name: 'Turn on notifications'})).toHaveCount(0);
    const evening = card.getByRole('switch', {name: 'Evening wrap-up'});
    await expect(evening).toHaveAttribute('aria-checked', 'false');
    await evening.click();
    await expect(evening).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.endsWith('zigoals:notify:v1'))?.[1] ?? '')).toContain('"evening":true');
  });

  test('switched on: permission inside the tap, only wake minutes leave the device, and a push with no payload is composed here', async ({page, context}) => {
    test.skip(test.info().project.name === 'mobile', 'the iPhone project needs the Home Screen app; the desktop project covers the flow');
    await context.grantPermissions(['notifications']);
    await page.addInitScript(() => {
      const state: {sub: Record<string, unknown> | null} = {sub: null};
      PushManager.prototype.subscribe = async function () { state.sub = {endpoint: 'https://fcm.googleapis.com/wp/fixture-' + Math.random().toString(36).slice(2), async unsubscribe() { state.sub = null; return true; }, toJSON() { return {endpoint: this.endpoint}; }}; return state.sub as unknown as PushSubscription; };
      PushManager.prototype.getSubscription = async function () { return state.sub as unknown as PushSubscription | null; };
    });
    const puts: Record<string, unknown>[] = [];
    await page.route('**/api/push-device', async route => {
      const request = route.request();
      if (request.method() === 'GET') return route.fulfill({json: {enabled: true, publicKey: PUBLIC_KEY}});
      if (request.method() === 'PUT') { puts.push(request.postDataJSON()); return route.fulfill({json: {registered: true, next: null, wakes: 1}}); }
      return route.fulfill({json: {deleted: true}});
    });
    // A habit with a reminder, so the plan has something to wake for.
    await page.goto('/app/habits');
    await page.getByRole('button', {name: '+ New habit', exact: true}).click();
    await page.getByLabel('Habit title', {exact: true}).fill('Secret stretch');
    await page.getByLabel('Reminder time — on this device').fill('09:30');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    await expect(page.getByRole('article', {name: 'Secret stretch', exact: true})).toBeVisible();
    await page.goto('/app/settings#notifications');
    const card = page.locator('#notifications');
    const on = card.getByRole('button', {name: 'Turn on notifications'});
    expect((await on.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await on.click();
    await expect(card.getByRole('status').first()).toHaveText('On for this device.');
    expect(puts.length).toBeGreaterThanOrEqual(1);
    const body = puts.at(-1)!;
    expect(Object.keys(body).sort()).toEqual(['endpoint', 'id', 'once', 'quiet', 'secret', 'skips', 'wakes', 'zone']);
    expect(body.wakes).toEqual(expect.arrayContaining([{m: 9 * 60 + 30, d: 127}]));
    expect(JSON.stringify(body)).not.toMatch(/Secret stretch|habit|water|title|name/i);
    // A push with no payload: the worker reads this device's snapshot and shows one notification, written here.
    const cdp = await context.newCDPSession(page);
    const registrationId = await new Promise<string>(resolve => { cdp.on('ServiceWorker.workerRegistrationUpdated', ({registrations}: {registrations: {registrationId: string; scopeURL: string; isDeleted: boolean}[]}) => { const found = registrations.find(r => !r.isDeleted && r.scopeURL.endsWith('/')); if (found) resolve(found.registrationId); }); void cdp.send('ServiceWorker.enable'); });
    await cdp.send('ServiceWorker.deliverPushMessage', {origin: new URL(page.url()).origin, registrationId, data: ''});
    await expect.poll(() => page.evaluate(async () => (await (await navigator.serviceWorker.getRegistration('/'))!.getNotifications()).map(n => n.title)), {timeout: 15_000}).toEqual(['ZIGoals']);
    // Off again: the device's record is deleted with its own secret.
    await card.getByRole('button', {name: 'Turn off and delete from the server'}).click();
    await expect(card.getByRole('status').filter({hasText: 'Turned off.'})).toBeVisible();
  });
});
