import {expect, test, type Page} from '@playwright/test';
import {PUSH_KEY} from '../lib/push/client';
import {isPhone} from './phone-nav';

// Push reminders (ADR-010): the Settings panel's states, turn on (one worker at /push-sw.js, no title or count sent),
// a reminder-time change re-sends the schedule, turn off unsubscribes and unregisters, nothing on view, never in Showcase.
// The account and the push route are fixtures; the browser's push subscription is stubbed (no push service is reachable
// here), while the service worker registration and the panel are real.
const ACCOUNT = '10000000-0000-4000-8000-000000000001';
// A real P-256 point (RFC 8291 Appendix A, the application server's public key), so the key bytes are valid.
const PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const SUBSCRIPTION_ID = '20000000-0000-4000-8000-000000000002';
type Row = {id: string; domain: string; revision: number; epoch: number; envelope: unknown; deleted: boolean};
/** The account API as a tiny in-memory cloud: sign-in, the session list, reads and writes of the vault (enough to create one). */
async function fixtureAccount(page: Page) {
  let signedIn = false, revision = 0, manifest: unknown = null;
  const rows = new Map<string, Row>();
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      const action = url.searchParams.get('action');
      if (action === 'status') return route.fulfill({json: signedIn ? {signedIn: true, accountId: ACCOUNT} : {signedIn: false}});
      if (action === 'sessions') return route.fulfill({json: {sessions: []}});
      if (action === 'rotation') return route.fulfill({json: {rotation: null}});
      const ids = url.searchParams.get('ids')?.split(',');
      const records = [...rows.values()].filter(row => !ids || ids.includes(row.id));
      return route.fulfill({json: {protocol: 1, revision, manifest, records, cursor: null}});
    }
    const body = request.postDataJSON();
    if (body.action === 'verify') { signedIn = true; return route.fulfill({json: {signedIn: true, accountId: ACCOUNT}}); }
    if (body.action === 'signout') { signedIn = false; return route.fulfill({json: {signedOut: true, remoteRevocationConfirmed: true}}); }
    if (body.action === 'session') return route.fulfill({json: {registered: true, id: '30000000-0000-4000-8000-000000000003'}});
    if (body.action === 'sync') {
      const op = body.operation;
      if (op.base !== revision) return route.fulfill({status: 409, json: {error: 'REVISION_CONFLICT'}});
      for (const row of op.changes ?? []) rows.set(row.id, row);
      if (op.manifest) manifest = op.manifest;
      revision = op.base + 1;
      return route.fulfill({json: {revision}});
    }
    return route.fulfill({json: {message: 'Fixture code requested; no email sent.'}});
  });
}
type PushCall = {action: string; body: Record<string, unknown>};
/** /api/push: the public key when `available`, the Worker's answers, and every forwarded body for the assertions. */
async function fixturePush(page: Page, available = true) {
  const calls: PushCall[] = [];
  await page.route('**/api/push', async route => {
    if (!available) return route.fulfill({status: 503, json: {error: 'PUSH_UNAVAILABLE', message: 'Reminders while ZIGoals is closed are not available in this build.'}});
    if (route.request().method() === 'GET') return route.fulfill({json: {publicKey: PUBLIC_KEY}});
    const body = route.request().postDataJSON();
    calls.push({action: body.action, body});
    if (body.action === 'subscribe') return route.fulfill({json: {subscriptionId: SUBSCRIPTION_ID, schedules: body.schedules.length, subscriptions: 1}});
    if (body.action === 'schedule') return route.fulfill({json: {subscriptionId: body.subscriptionId, schedules: body.schedules.length}});
    return route.fulfill({json: {deleted: true}});
  });
  return calls;
}
/** The browser's push subscription, stubbed: real registration, a fake endpoint and keys, unsubscribe that forgets it. */
async function stubPushManager(page: Page) {
  await page.addInitScript(() => {
    const state: {sub: Record<string, unknown> | null; subscribes: unknown[]} = {sub: null, subscribes: []};
    Object.assign(window, {__pushStub: state});
    const make = (options: PushSubscriptionOptionsInit) => ({
      endpoint: 'https://web.push.apple.com/fixture/' + Math.random().toString(36).slice(2),
      options: {userVisibleOnly: options.userVisibleOnly ?? false, applicationServerKey: options.applicationServerKey ?? null},
      toJSON() { return {endpoint: this.endpoint, keys: {p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg'}}; },
      async unsubscribe() { state.sub = null; return true; },
    });
    PushManager.prototype.subscribe = async function (options) { state.subscribes.push(options); state.sub = make(options ?? {}); return state.sub as unknown as PushSubscription; };
    PushManager.prototype.getSubscription = async function () { return state.sub as unknown as PushSubscription | null; };
  });
}
async function signIn(page: Page) {
  await page.getByLabel('Email address', {exact: true}).fill('fixture@example.com');
  await page.getByRole('button', {name: 'Send email code', exact: true}).click();
  await page.getByLabel('Email code', {exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Verify email code', exact: true}).click();
}
/** Sign in and create the vault (fixture cloud), which unlocks the account's records on this tab. */
async function signInAndUnlock(page: Page) {
  await page.goto('/app/settings');
  await signIn(page);
  await page.getByRole('button', {name: 'Turn on encrypted sync (recommended)', exact: true}).click();
  await expect(page.getByLabel('New vault recovery secret', {exact: true})).not.toHaveValue('');
  await page.getByLabel('I saved this vault recovery secret separately.').check();
  await page.getByRole('button', {name: 'Confirm and create vault', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
}
const panel = (page: Page) => page.getByRole('region', {name: 'Reminders on this phone, even when ZIGoals is closed.', exact: true});
const state = (page: Page) => panel(page).locator('.push-state');
const registrations = (page: Page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => (r.active ?? r.installing ?? r.waiting)?.scriptURL ?? ''));
const record = (page: Page) => page.evaluate(key => { const found = Object.entries(localStorage).find(([k]) => k.endsWith(key)); return found ? JSON.parse(found[1]) : null; }, PUSH_KEY);

test('without the fixture the panel says the build has no push, offers no button, and the reminder field shows no offer', async ({page}) => {
  await page.route('**/api/private-account*', route => route.fulfill({status: 503, json: {error: 'HOSTED_CONFIGURATION_REQUIRED'}}));
  await fixturePush(page, false);
  await page.goto('/app/settings');
  await expect(state(page)).toHaveText('Not available in this build.');
  await expect(panel(page).getByRole('button')).toHaveCount(0);
  await expect(panel(page)).toContainText('Never a habit’s name, a count, or anything you record.');
  await page.goto('/app/health');
  await expect(page.getByRole('form', {name: 'Water reminder'})).toBeVisible();
  await expect(page.getByRole('link', {name: /Get this on your phone even when ZIGoals is closed/})).toHaveCount(0);
});

test('signed out: off until an account is signed in; Showcase never offers it; nothing is written or sent on view', async ({page}) => {
  await fixtureAccount(page);
  const calls = await fixturePush(page);
  await page.goto('/app/settings');
  await expect(state(page)).toHaveText('Off. Sign in to your account first.');
  await expect(panel(page).getByRole('button', {name: 'Turn on on this device', exact: true})).toHaveCount(0);
  expect(calls).toEqual([]);
  expect(await record(page)).toBeNull();
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/settings');
  await expect(state(page)).toHaveText('Not available in Showcase.');
  expect(calls).toEqual([]);
});

test('turn on: permission, one worker at /push-sw.js, a subscribe call with times only; a reminder change re-sends the schedule; turn off deletes everything', async ({page, context}) => {
  const mobile = await isPhone(page);
  await context.grantPermissions(['notifications']);
  await stubPushManager(page);
  if (mobile) await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', {value: true, configurable: true}); });
  await fixtureAccount(page);
  const calls = await fixturePush(page);
  await signInAndUnlock(page);
  await page.goto('/app/settings');
  await expect(state(page)).toHaveText('Off.');
  const on = panel(page).getByRole('button', {name: 'Turn on on this device', exact: true});
  expect((await on.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await on.click();
  await expect(state(page)).toHaveText('On · reminder times checked today.');
  await expect(panel(page).getByRole('status').filter({hasText: 'Reminders while ZIGoals is closed are on for this device.'})).toBeVisible();
  expect(await registrations(page)).toEqual([new URL('/push-sw.js', page.url()).href]);
  expect(calls.map(c => c.action)).toEqual(['subscribe']);
  const subscribe = calls[0]!.body;
  expect(Object.keys(subscribe).sort()).toEqual(['action', 'auth', 'endpoint', 'p256dh', 'quiet', 'schedules', 'zone']);
  expect(subscribe.endpoint).toMatch(/^https:\/\/web\.push\.apple\.com\/fixture\//);
  expect(subscribe.quiet).toEqual({from: '22:00', to: '07:00'});
  expect(subscribe.schedules).toEqual([]);
  expect(JSON.stringify(subscribe)).not.toMatch(/title|count|habit|water|name/i);
  expect(await page.evaluate(() => (window as unknown as {__pushStub: {subscribes: {userVisibleOnly: boolean}[]}}).__pushStub.subscribes.map(s => s.userVisibleOnly))).toEqual([true]);
  expect(await record(page)).toMatchObject({version: 1, subscriptionId: SUBSCRIPTION_ID, quiet: {from: '22:00', to: '07:00'}});
  // A reminder time on this device re-sends the schedule: a time, the zone and the weekdays; still no title.
  await page.goto('/app/health');
  await expect(page.getByRole('link', {name: /Get this on your phone even when ZIGoals is closed/})).toHaveAttribute('href', '/app/settings#reminders');
  const form = page.getByRole('form', {name: 'Water reminder'});
  await form.getByLabel(/^Reminder time/).fill('20:15');
  await form.getByRole('button', {name: 'Save reminder time'}).click();
  await expect(form.getByRole('status')).toHaveText('Water reminder set for 20:15 on this device.');
  await expect.poll(() => calls.map(c => c.action), {timeout: 10_000}).toEqual(['subscribe', 'schedule']);
  const schedule = calls[1]!.body;
  expect(schedule.subscriptionId).toBe(SUBSCRIPTION_ID);
  expect(schedule.schedules).toEqual([{time: '20:15', zone: expect.stringMatching(/^[A-Za-z0-9_+\-/]+$/), weekdays: 127}]);
  expect(JSON.stringify(schedule)).not.toMatch(/title|count|habit|water|name/i);
  // Quiet hours are this device's choice and go with the next schedule call.
  await page.goto('/app/settings');
  await expect(state(page)).toHaveText('On · reminder times checked today.');
  await panel(page).getByLabel('Quiet from').fill('23:00');
  await panel(page).getByRole('button', {name: 'Save quiet hours', exact: true}).click();
  await expect(panel(page).getByRole('status').filter({hasText: 'Quiet hours 23:00–07:00 saved.'})).toBeVisible();
  expect(calls.at(-1)!.body.quiet).toEqual({from: '23:00', to: '07:00'});
  expect(await record(page)).toMatchObject({quiet: {from: '23:00', to: '07:00'}});
  // Turn off: unsubscribe on the server, no worker, no record.
  await panel(page).getByRole('button', {name: 'Turn off and delete from the server', exact: true}).click();
  await expect(state(page)).toHaveText('Off.');
  await expect(panel(page).getByRole('status').filter({hasText: 'Turned off. Nothing about this device is kept on the server.'})).toBeVisible();
  expect(calls.at(-1)).toEqual({action: 'unsubscribe', body: {action: 'unsubscribe', subscriptionId: SUBSCRIPTION_ID}});
  expect(await registrations(page)).toEqual([]);
  expect(await record(page)).toBeNull();
});

test('an iPhone browser tab is told to install first; a locked account is told to unlock', async ({page}) => {
  await fixtureAccount(page);
  await fixturePush(page);
  if (await isPhone(page)) {
    await page.goto('/app/settings');
    await expect(state(page)).toContainText('Add ZIGoals to your Home Screen first.');
    await expect(state(page).getByRole('link', {name: 'How to install →', exact: true})).toHaveAttribute('href', '/app/help#install');
    await expect(panel(page).getByRole('button')).toHaveCount(0);
  } else {
    await page.goto('/app/settings');
    await signIn(page);
    await expect(page.getByRole('button', {name: 'Turn on encrypted sync (recommended)', exact: true})).toBeVisible();
    await expect(state(page)).toHaveText('Unlock your account records first.');
    await expect(panel(page).getByRole('button')).toHaveCount(0);
  }
});
