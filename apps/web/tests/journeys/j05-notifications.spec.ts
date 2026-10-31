import {test, type BrowserContext, type CDPSession, type Page, type Worker} from '@playwright/test';
import {desktopOnly, expect, hydrated, seedRecords, stored} from './journey-helpers';

/**
 * Session AK F2, journey 5: notifications on this device (the stubs mirror tests/pwa-ak.spec.ts: the browser's push
 * subscription is stubbed, the app's /api/push-device is answered here, and a push is delivered through the DevTools
 * protocol with no payload). The person makes a habit with a reminder and turns notifications on: only wake minutes leave
 * the device; the snapshot the worker reads stays on it. A push shows one notification with Done and Snooze 1 h. "Done"
 * is tapped twice: once while ZIGoals is open (applied at once, with Undo) and once while it is closed (applied when it
 * next opens, with Undo); a second tab never applies a tap again. "Snooze 1 h" moves the item an hour on and adds one
 * wake minute, sent with the device's own secret. The worker's notification taps are dispatched inside the worker as the
 * browser would (a tap needs a person; the event is the same).
 */
// The service worker runs on the real clock, and reminders inside quiet hours (the night) are refused by design: the
// journey runs in a fixed-offset zone where the real time now is around midday.
const OFFSET = (() => { let o = 12 - new Date().getUTCHours(); if (o > 14) o -= 24; if (o < -12) o += 24; return o; })();
const MIDDAY_ZONE = OFFSET === 0 ? 'UTC' : OFFSET > 0 ? `Etc/GMT-${OFFSET}` : `Etc/GMT+${-OFFSET}`;
test.use({actionTimeout: 20_000, timezoneId: MIDDAY_ZONE, serviceWorkers: 'allow'});
desktopOnly();
const PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const HABIT = 'Fictional reminder stretch';
/** The worker's global, as far as this journey uses it (the webworker types are not in the app's lib list). */
type SwScope = {registration: {getNotifications(): Promise<Notification[]>}; dispatchEvent(e: Event): boolean; NotificationEvent: new (type: string, init: {notification: Notification; action: string}) => Event};
type Put = {wakes: {m: number; d: number}[]; once?: number[]; id: string; secret: string};

async function stubPush(context: BrowserContext) {
  await context.grantPermissions(['notifications']);
  // The browser keeps its push subscription across page loads; the stub does too (in this origin's storage, shared by its tabs).
  await context.addInitScript(() => {
    const KEY = 'fixture-push-subscription', make = (endpoint: string) => ({endpoint, async unsubscribe() { localStorage.removeItem(KEY); return true; }, toJSON() { return {endpoint}; }});
    PushManager.prototype.subscribe = async function () { localStorage.setItem(KEY, 'https://fcm.googleapis.com/wp/fixture-journey'); return make(localStorage.getItem(KEY)!) as unknown as PushSubscription; };
    PushManager.prototype.getSubscription = async function () { const e = localStorage.getItem(KEY); return (e ? make(e) : null) as unknown as PushSubscription | null; };
  });
  const puts: Put[] = [], deletes: string[] = [];
  // context.route: the worker's own PUT (a snooze) is answered here too.
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await context.route('**/api/push-device', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({json: {enabled: true, publicKey: PUBLIC_KEY}});
    if (request.method() === 'PUT') { puts.push(request.postDataJSON()); return route.fulfill({json: {registered: true, next: null, wakes: 1}}); }
    deletes.push(request.postData() ?? ''); return route.fulfill({json: {deleted: true}});
  });
  return {puts, deletes};
}
const worker = async (context: BrowserContext): Promise<Worker> => { await expect.poll(() => context.serviceWorkers().length, {timeout: 20_000}).toBeGreaterThan(0); return context.serviceWorkers()[0]!; };
/** The device's notification snapshot, as the worker reads it (IndexedDB zigoals-notify-v1). */
const snapshot = (page: Page) => page.evaluate(() => new Promise<{items: {kind: string; id: string; at: number; label?: string}[]} | null>(resolve => {
  const r = indexedDB.open('zigoals-notify-v1');
  r.onerror = () => resolve(null);
  r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('kv')) { db.close(); resolve(null); return; } const g = db.transaction('kv', 'readonly').objectStore('kv').get('snapshot'); g.onsuccess = () => { db.close(); resolve(g.result ?? null); }; g.onerror = () => { db.close(); resolve(null); }; };
}));
async function registrationId(cdp: CDPSession) {
  return new Promise<string>(resolve => { cdp.on('ServiceWorker.workerRegistrationUpdated', ({registrations}: {registrations: {registrationId: string; scopeURL: string; isDeleted: boolean}[]}) => { const found = registrations.find(r => !r.isDeleted && r.scopeURL.endsWith('/')); if (found) resolve(found.registrationId); }); void cdp.send('ServiceWorker.enable'); });
}
/** A push with no payload, then the notification it showed (title and action names). */
async function push(page: Page, sw: Worker, cdp: CDPSession, id: string, origin: string) {
  await sw.evaluate(async () => { for (const n of await (self as unknown as SwScope).registration.getNotifications()) n.close(); });
  await cdp.send('ServiceWorker.deliverPushMessage', {origin, registrationId: id, data: ''});
  await expect.poll(() => sw.evaluate(async () => (await (self as unknown as SwScope).registration.getNotifications()).length), {timeout: 15_000}).toBe(1);
  return sw.evaluate(async () => { const [n] = await (self as unknown as SwScope).registration.getNotifications(); return {title: n!.title, body: n!.body, actions: ((n as Notification & {actions?: {action: string}[]}).actions ?? []).map(a => a.action)}; });
}
/** The person taps an action on the notification: the worker receives the same notificationclick event. */
const tap = (sw: Worker, action: 'done' | 'snooze') => sw.evaluate(async a => {
  const scope = self as unknown as SwScope, [n] = await scope.registration.getNotifications();
  scope.dispatchEvent(new scope.NotificationEvent('notificationclick', {notification: n!, action: a}));
}, action);
const habitDone = async (page: Page) => ((await stored<{habits: {entries: {count: number}[]}[]}>(page, 'zigoals:habits:v1'))!.habits[0]!.entries.reduce((s, e) => s + e.count, 0));
const actionsQueue = (page: Page) => page.evaluate(() => new Promise<{actionId: string; applied?: number}[]>(resolve => {
  const r = indexedDB.open('zigoals-notify-actions-v1');
  r.onerror = () => resolve([]);
  r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('actions')) { db.close(); resolve([]); return; } const g = db.transaction('actions', 'readonly').objectStore('actions').getAll(); g.onsuccess = () => { db.close(); resolve(g.result); }; };
}));

test('@journey 5 notifications: the snapshot stays here, wake minutes leave, Done (open and closed) with Undo, Snooze, nothing doubled', async ({page, context}) => {
  test.setTimeout(180_000);
  const {puts} = await stubPush(context);
  await seedRecords(page, {}, {settings: 'habits-health'});
  // A habit with a reminder a minute from now (in the journey's zone), so a push now finds it due.
  const soon = new Date(Date.now() + 60_000 + OFFSET * 3_600_000), hhmm = `${String(soon.getUTCHours()).padStart(2, '0')}:${String(soon.getUTCMinutes()).padStart(2, '0')}`;
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(HABIT);
  await page.getByLabel('Reminder time — on this device').fill(hhmm);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: HABIT, exact: true})).toBeVisible();

  // Turn on: only wake minutes and the device's own id and secret leave; no name, no title.
  await page.goto('/app/settings#notifications'); await hydrated(page);
  const card = page.locator('#notifications');
  await card.getByRole('button', {name: 'Turn on notifications'}).click();
  await expect(card.getByRole('status').first()).toHaveText('On for this device.');
  await expect.poll(() => puts.length).toBeGreaterThanOrEqual(1);
  const minute = soon.getUTCHours() * 60 + soon.getUTCMinutes();
  expect(puts.at(-1)!.wakes).toEqual(expect.arrayContaining([{m: minute, d: 127}]));
  expect(JSON.stringify(puts)).not.toContain(HABIT);
  // The snapshot is on this device: the habit, due at that minute.
  await expect.poll(async () => (await snapshot(page))?.items.filter(i => i.kind === 'habit' && Math.abs(i.at - Date.now()) < 40 * 60_000).length ?? 0, {timeout: 15_000}).toBe(1);

  const sw = await worker(context), cdp = await context.newCDPSession(page), id = await registrationId(cdp), origin = new URL(page.url()).origin;

  // Path 1, ZIGoals open: Done is applied at once, with Undo; Undo puts the habit back.
  await page.goto('/app/habits'); await hydrated(page);
  const shown = await push(page, sw, cdp, id, origin);
  expect(shown).toMatchObject({title: 'ZIGoals', actions: ['done', 'snooze']});
  expect(shown.body).toBe('1 habit due'); // names only when the person opted in
  await tap(sw, 'done');
  const toast = page.locator('.aa-toast').filter({hasText: `${HABIT} marked done from a notification`});
  await expect(toast).toBeVisible({timeout: 15_000});
  await expect.poll(() => habitDone(page)).toBe(1);
  // (The open Habits page does not show it until reopened: bug J5-1, below.)
  await toast.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(() => habitDone(page)).toBe(0);
  // Nothing doubled: a reload does not apply the same tap again.
  await page.reload(); await hydrated(page);
  await page.waitForTimeout(2000); // the page applies queued taps once it is idle; give it that moment
  expect(await habitDone(page)).toBe(0);

  // The snapshot holds the habit again (Undo re-wrote it); Path 2, ZIGoals closed: the tap waits in the queue.
  await expect.poll(async () => (await snapshot(page))?.items.filter(i => i.kind === 'habit' && Math.abs(i.at - Date.now()) < 40 * 60_000).length ?? 0, {timeout: 15_000}).toBe(1);
  await push(page, sw, cdp, id, origin);
  await page.goto('/robots.txt'); // no ZIGoals page is open
  await tap(sw, 'done');
  await expect.poll(async () => (await actionsQueue(page)).filter(a => a.applied === undefined).length).toBe(1);
  expect(await habitDone(page)).toBe(0);
  await page.goto('/app/habits'); await hydrated(page);
  const later = page.locator('.aa-toast').filter({hasText: `${HABIT} marked done from a notification`});
  await expect(later).toBeVisible({timeout: 15_000});
  await expect.poll(() => habitDone(page)).toBe(1);
  // A second tab opens: the tap was claimed once, so nothing is applied twice.
  const second = await context.newPage();
  await second.goto('/app/habits'); await hydrated(second);
  await second.waitForTimeout(2000);
  await expect(second.locator('.aa-toast').filter({hasText: 'marked done from a notification'})).toHaveCount(0);
  expect(await habitDone(page)).toBe(1);
  await second.close();
  await later.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(() => habitDone(page)).toBe(0);
  // The snapshot is written again when the page next refreshes it (here: opened again; without that, bug J5-1 below).
  await page.reload(); await hydrated(page);

  // Snooze 1 h: one wake minute an hour on is added, sent with the device's own secret.
  await expect.poll(async () => (await snapshot(page))?.items.filter(i => i.kind === 'habit' && Math.abs(i.at - Date.now()) < 40 * 60_000).length ?? 0, {timeout: 15_000}).toBe(1);
  const before = puts.length;
  await push(page, sw, cdp, id, origin);
  await tap(sw, 'snooze');
  await expect.poll(() => puts.length, {timeout: 15_000}).toBeGreaterThan(before);
  const snoozed = puts.at(-1)!;
  expect(snoozed.once?.length).toBe(1);
  expect(Math.abs(snoozed.once![0]! * 60_000 - (Date.now() + 3_600_000))).toBeLessThan(5 * 60_000);
  expect(snoozed.secret).toBeTruthy();
  // (The snoozed item an hour on survives the open page's next snapshot: journey 5c, bug J5-2, fixed.)
  expect(await habitDone(page)).toBe(0); // a snooze changes no record
});

// Bug J5-1 (docs/review/session-ak/JOURNEY_BUGS.md): "Done" from a notification and its "Undo" write the habits through
// lib/notify/actions.ts, which sends no change event: the open Habits page keeps showing "Due" under the toast that says
// the habit was marked done, and after Undo the device's snapshot is not rewritten, so until the page is reopened,
// refocused or the 10-minute refresh comes, the next push finds nothing due for that habit.
test('@journey 5b bug J5-1: Done from a notification shows on the open page, and its Undo puts the habit back in the snapshot', async ({page, context}) => {
  await stubPush(context);
  await seedRecords(page, {}, {settings: 'habits-health'});
  const soon = new Date(Date.now() + 60_000 + OFFSET * 3_600_000), hhmm = `${String(soon.getUTCHours()).padStart(2, '0')}:${String(soon.getUTCMinutes()).padStart(2, '0')}`;
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(HABIT);
  await page.getByLabel('Reminder time — on this device').fill(hhmm);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await page.goto('/app/settings#notifications'); await hydrated(page);
  await page.locator('#notifications').getByRole('button', {name: 'Turn on notifications'}).click();
  const due = async () => (await snapshot(page))?.items.filter(i => i.kind === 'habit' && Math.abs(i.at - Date.now()) < 40 * 60_000).length ?? 0;
  await expect.poll(due, {timeout: 15_000}).toBe(1);
  const sw = await worker(context), cdp = await context.newCDPSession(page), id = await registrationId(cdp);
  await page.goto('/app/habits'); await hydrated(page);
  await push(page, sw, cdp, id, new URL(page.url()).origin);
  await tap(sw, 'done');
  const toast = page.locator('.aa-toast').filter({hasText: 'marked done from a notification'});
  const card = page.getByRole('article', {name: HABIT, exact: true});
  await expect(card.locator('.habit-result')).toHaveText('Complete');
  await toast.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(card.locator('.habit-result')).toHaveText('Due');
  await expect.poll(due, {timeout: 15_000}).toBe(1);
});

// Bug J5-2 (docs/review/session-ak/JOURNEY_BUGS.md): "Snooze 1 h" moves the item an hour on in the worker's snapshot, but
// the open page answers the worker's message by rebuilding the snapshot from the records (lib/notify/device.ts
// refreshNotifications), which know nothing of the snooze: the item is back at its first time, so the push an hour later
// finds nothing due. Any ZIGoals page opened during that hour does the same.
test('@journey 5c bug J5-2: a snoozed reminder is still due an hour later, with a ZIGoals page open', async ({page, context}) => {
  await stubPush(context);
  await seedRecords(page, {}, {settings: 'habits-health'});
  const soon = new Date(Date.now() + 60_000 + OFFSET * 3_600_000), hhmm = `${String(soon.getUTCHours()).padStart(2, '0')}:${String(soon.getUTCMinutes()).padStart(2, '0')}`;
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(HABIT);
  await page.getByLabel('Reminder time — on this device').fill(hhmm);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await page.goto('/app/settings#notifications'); await hydrated(page);
  await page.locator('#notifications').getByRole('button', {name: 'Turn on notifications'}).click();
  await expect.poll(async () => (await snapshot(page))?.items.filter(i => i.kind === 'habit' && Math.abs(i.at - Date.now()) < 40 * 60_000).length ?? 0, {timeout: 15_000}).toBe(1);
  const sw = await worker(context), cdp = await context.newCDPSession(page), id = await registrationId(cdp);
  await page.goto('/app/habits'); await hydrated(page);
  await push(page, sw, cdp, id, new URL(page.url()).origin);
  await tap(sw, 'snooze');
  await page.waitForTimeout(3000); // the open page's answer to the worker's message
  expect((await snapshot(page))!.items.some(i => i.kind === 'habit' && Math.abs(i.at - (Date.now() + 3_600_000)) < 5 * 60_000)).toBe(true);
});
