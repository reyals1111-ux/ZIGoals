import {test, type Page} from '@playwright/test';
import {desktopOnly, expect, hydrated, seedRecords, stored, ZONE} from './journey-helpers';
import {createHabit, emptyHabitData, HABITS_KEY} from '../../lib/habits';
import {CHECKLIST_KEY} from '../../lib/af-checklist-keys';
import {emptyChecklist} from '../../lib/checklist/schema';
import {addFavourite} from '../../lib/checklist/store';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../../lib/positions';

/**
 * Session AK F2, journey 4: offline. The app's own service worker controls the page (opted in here; the suite blocks
 * workers by default). Online, the person installs ZIGoals from Settings (the browser's own offer, MOCKED) and opens
 * each pillar once. Then the connection drops: Today, Habits, the Checklist, Health, Goals and Wealth still open from the
 * cache and still record on the device; a barcode asked for offline is kept. Back online, the kept barcode is OFFERED
 * (never looked up by itself), and a new version of the app waits for "Reload" without losing anything. Fictional data.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE, serviceWorkers: 'allow'});
desktopOnly();
const HABIT_ID = 'aaaaaaaa-0000-4000-8000-0000000000a4', HABIT = 'Fictional offline stretch', GOAL = 'Fictional quiet cabin';
const PILLARS = ['/app', '/app/habits', '/app/checklist', '/app/health', '/app/goals', '/app/wealth'];
const activeScript = (page: Page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? '');


test('@journey 4 offline: install, every pillar offline, back online, the update waits for Reload', async ({page, context}) => {
  test.setTimeout(180_000);
  // The app's /api answers (also for the worker's own requests) come from the fixture; nothing else leaves.
  // Offline, nothing answers (not even the fixture): the request fails as it would without a network.
  let disconnected = false;
  await context.route(url => url.pathname.startsWith('/api/'), route => disconnected ? route.abort('internetdisconnected') : route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  const stray: string[] = [];
  context.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname)) stray.push(r.url()); });
  const created = new Date(Date.now() - 10 * 86_400_000);
  const habits = createHabit(emptyHabitData(), {title: HABIT, category: 'Fictional', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, created, HABIT_ID);
  const path = addFavourite(emptyChecklist(), {kind: 'habit', habitId: HABIT_ID}, {id: 'ck_offline', at: created, section: 'morning'});
  const goal = privateGoalSchema.parse({id: '44', name: GOAL, type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '500000', notes: '', createdAt: created.toISOString(), milestones: []});
  await seedRecords(page, {[HABITS_KEY]: habits, [CHECKLIST_KEY]: path, [PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]}});

  // Online: the worker takes control.
  await page.goto('/app');
  await expect.poll(() => activeScript(page), {timeout: 30_000}).toMatch(/\/sw\.js\?v=[0-9a-z-]+$/);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 10_000}).toBe(true);

  // Install from Settings: the browser's own offer (MOCK of Chromium's event), one tap.
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(() => { const e = Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {prompt: async () => undefined, userChoice: Promise.resolve({outcome: 'accepted'})}); window.dispatchEvent(e); });
  const install = page.getByRole('region', {name: 'Install ZIGoals'});
  await expect(install.getByRole('status').first()).toHaveText('Your browser can install ZIGoals now.');
  await install.getByRole('button', {name: 'Install ZIGoals', exact: true}).click();
  await expect(install).toContainText('Installing. Open ZIGoals from its new icon.');

  // Each pillar opened once while online (as a person who used the app before), with Health's barcode fold too.
  for (const p of PILLARS) { await page.goto(p); await expect(page.locator('main h1').first()).toBeVisible(); }
  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  await expect(page.getByRole('region', {name: 'Barcode food lookup'})).toBeVisible();
  await page.goto('/app/wealth'); await expect(page.getByRole('form', {name: 'Log spending or income'})).toBeVisible();

  disconnected = true; await context.setOffline(true);
  try {
    // Today opens from the cache and says it is offline.
    await page.goto('/app');
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toBeVisible();
    // The Checklist opens with today's path (ticking the day's last dot offline: bug J4-1, below).
    await page.goto('/app/checklist'); await hydrated(page);
    await expect(page.getByRole('button', {name: `${HABIT}: not done yet`, exact: true})).toHaveAttribute('aria-pressed', 'false');
    // Habits: a check-in is recorded on the device.
    await page.goto('/app/habits'); await hydrated(page);
    const card = page.getByRole('article', {name: HABIT, exact: true});
    await card.getByRole('button', {name: `Complete ${HABIT}`, exact: true}).click();
    await expect(card.locator('.habit-result')).toHaveText('Complete');
    // Health: water, and a barcode that is kept for later.
    await page.goto('/app/health'); await hydrated(page);
    await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
    await expect.poll(async () => (await stored<{daily?: {water: unknown[]}}>(page, 'zigoals:health:v1'))?.daily?.water.length ?? 0).toBe(1);
    // A barcode asked for offline is kept for later: bug J4-2, below.
    // Goals: the goal opens.
    await page.goto('/app/goals'); await hydrated(page);
    await expect(page.getByRole('link', {name: GOAL}).first()).toBeVisible();
    // Wealth: spending is logged on the device.
    await page.goto('/app/wealth'); await hydrated(page);
    const spend = page.getByRole('form', {name: 'Log spending or income'});
    await spend.getByLabel('Amount').fill('4.20');
    await spend.getByLabel('Note — optional').fill('Fictional offline coffee');
    await spend.getByRole('button', {name: 'Save', exact: true}).click();
    await expect.poll(async () => (await stored<{entries: {note?: string}[]}>(page, 'zigoals:money-log:v1'))?.entries.map(e => e.note) ?? []).toEqual(['Fictional offline coffee']);
  } finally { disconnected = false; await context.setOffline(false); }

  // Back online: the page says so no more, and nothing ran by itself.
  await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toHaveCount(0, {timeout: 15_000});

  // A new version: it waits for Reload, and every record made offline is still there afterwards.
  await page.evaluate(() => new Promise(resolve => (window as Window & {requestIdleCallback: (cb: () => void, o: {timeout: number}) => void}).requestIdleCallback(() => setTimeout(resolve, 1500), {timeout: 5000})));
  await expect.poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/'); return !r?.installing && !r?.waiting; })).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js?v=journey-newer-build', {scope: '/', updateViaCache: 'none'}));
  const bar = page.getByRole('status').filter({hasText: 'A new version of ZIGoals is ready.'});
  await expect(bar).toBeVisible({timeout: 20_000});
  await Promise.all([page.waitForEvent('load', {timeout: 20_000}), bar.getByRole('button', {name: 'Reload'}).click()]);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '').catch(() => ''), {timeout: 20_000}).toMatch(/v=journey-newer-build$/);
  expect((await stored<{habits: {entries: unknown[]}[]}>(page, HABITS_KEY))!.habits[0]!.entries).toHaveLength(1);
  expect((await stored<{entries: unknown[]}>(page, 'zigoals:money-log:v1'))!.entries).toHaveLength(1);
  expect(stray).toEqual([]);
});

// Bug J4-1 (docs/review/session-ak/JOURNEY_BUGS.md): offline, a Checklist whose day is complete asks for the celebration's
// stylesheet chunk (never fetched online, so not in the worker's cache); the chunk fails and the whole page shows
// "This page could not be shown." instead of the done path.
test.fixme('@journey 4b bug J4-1: offline, the Checklist with its day complete still opens', async ({page, context}) => {
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  const created = new Date(Date.now() - 10 * 86_400_000);
  const habits = createHabit(emptyHabitData(), {title: HABIT, category: 'Fictional', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, created, HABIT_ID);
  await seedRecords(page, {[HABITS_KEY]: habits, [CHECKLIST_KEY]: addFavourite(emptyChecklist(), {kind: 'habit', habitId: HABIT_ID}, {id: 'ck_offline', at: created, section: 'morning'})});
  await page.goto('/app');
  await expect.poll(() => activeScript(page), {timeout: 30_000}).toMatch(/\/sw\.js/);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 10_000}).toBe(true);
  await page.goto('/app/checklist'); await hydrated(page); // visited online, with the day not yet done
  await context.setOffline(true);
  try {
    await page.goto('/app/checklist'); await hydrated(page);
    await page.getByRole('button', {name: `${HABIT}: not done yet`, exact: true}).click();
    await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 planet today');
    await page.goto('/app/checklist'); await hydrated(page);
    await expect(page.getByRole('heading', {name: 'This page could not be shown.'})).toHaveCount(0);
    await expect(page.getByRole('button', {name: `${HABIT}: done`, exact: true})).toBeVisible();
  } finally { await context.setOffline(false); }
});

// Bug J4-2 (docs/review/session-ak/JOURNEY_BUGS.md): the barcode kept offline needs lib/offline-queue/queue, which the
// barcode lookup imports only at the moment it finds the device offline; that chunk was never fetched online, so it fails
// to load, nothing is kept, and the page says "Food lookup is unavailable" instead of offering it again on reconnect.
test.fixme('@journey 4c bug J4-2: a barcode asked for offline is kept, and offered (never run) back online', async ({page, context}) => {
  let disconnected = false;
  await context.route(url => url.pathname.startsWith('/api/'), route => disconnected ? route.abort('internetdisconnected') : route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await seedRecords(page, {});
  await page.goto('/app');
  await expect.poll(() => activeScript(page), {timeout: 30_000}).toMatch(/\/sw\.js/);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 10_000}).toBe(true);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('Scan or look up a food barcode', {exact: true}).click(); // the fold, opened online once
  await expect(page.getByRole('region', {name: 'Barcode food lookup'})).toBeVisible();
  disconnected = true; await context.setOffline(true);
  try {
    await page.goto('/app/health'); await hydrated(page);
    await page.getByText('Scan or look up a food barcode', {exact: true}).click();
    const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
    await lookup.getByLabel('Product barcode', {exact: true}).fill('4006381333931');
    await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
    await expect(lookup).toContainText('You’re offline. ZIGoals will offer to look this barcode up when you’re back online.');
  } finally { disconnected = false; await context.setOffline(false); }
  const offer = page.locator('.aa-toast').filter({hasText: 'You’re back online. Look up barcode 4006381333931 now?'});
  await expect(offer).toBeVisible({timeout: 15_000});
  await offer.getByRole('link', {name: 'Look it up'}).click();
  await page.waitForURL(/\/app\/health\?barcode=4006381333931/);
  await expect(page.getByLabel('Product barcode', {exact: true})).toHaveValue('4006381333931');
});
