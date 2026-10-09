import {expect, test, type Page} from '@playwright/test';
import {FASTING_KEY} from '../lib/fasting/schema';
import {isPhone} from './phone-nav';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {SYNC_WRITES} from '../lib/vault/sync-writes';

// HE6 (Session P): the fasting timer is a clock with a plain safety note; no streaks, no praise; stopped at 24 hours.
const SAFETY = 'Fasting isn’t for everyone. If you’re pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first. Stop if you feel unwell.';
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  // A person who uses Health has been through Today's first-run choice; Today's "For you" area needs that.
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
});
// Session U Part 9: with the sync writes on (lib/vault/sync-writes.ts), fasts live in Health (`fasting`) and the device
// key is never written; switched off, they live in the device key as before.
const HOME = SYNC_WRITES ? HEALTH_STORAGE_KEY : FASTING_KEY;
const stored = async (page: Page) => { const raw = JSON.parse((await page.evaluate(key => localStorage.getItem(key), HOME)) ?? 'null'); return (SYNC_WRITES ? raw?.fasting ?? null : raw) as {sessions: {endedAt: string | null; targetHours: number; stoppedBy: string}[]} | null; };
const deviceKey = (page: Page) => page.evaluate(key => localStorage.getItem(key), FASTING_KEY);
async function openTimer(page: Page) {
  await page.goto('/app/health');
  const region = page.getByRole('region', {name: 'Fasting timer', exact: true});
  // On a phone the module is folded until a fast runs; then it opens itself and shows no toggle (PhoneFold `expanded`).
  if (await isPhone(page)) await expect(async () => {
    if (await region.isVisible()) return;
    const toggle = page.locator('.phone-fold-toggle').filter({hasText: 'Fasting timer'}).first();
    if (await toggle.count()) await toggle.click();
    await expect(region).toBeVisible({timeout: 1500});
  }).toPass({timeout: 15000});
  await expect(region).toBeVisible();
  return region;
}

test('start, watch the clock, stop: the note is always visible, Today shows the line only while a fast runs', async ({page}) => {
  const timer = await openTimer(page);
  await expect(timer.getByRole('note')).toHaveText(SAFETY);
  const start = timer.getByRole('button', {name: 'Start fast', exact: true});
  if (await isPhone(page)) {
    expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await timer.getByRole('button', {name: 'Custom', exact: true}).click();
    expect(await timer.getByLabel(/^Target hours/).evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
  }
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '16:8', exact: true}).click();
  await start.click();
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 0 h 00 min of 16 h');
  expect((await stored(page))!.sessions).toMatchObject([{endedAt: null, targetHours: 16}]);
  await page.goto('/app');
  await expect(page.getByRole('region', {name: 'Fasting', exact: true})).toContainText('Fasting · 0 h 00 min of 16 h');
  const again = await openTimer(page);
  await page.clock.fastForward(3 * 3_600_000 + 20 * 60_000);
  await expect(again.locator('.fasting-clock')).toHaveText('Fasting · 3 h 20 min of 16 h');
  await again.getByRole('button', {name: 'Stop fast', exact: true}).click();
  await expect(again.getByRole('status')).toContainText('Stopped at 3 h 20 min. Your target was 16 h.');
  await expect(again.getByRole('list')).toContainText('3.3 h · target 16 h · stopped by you');
  expect((await stored(page))!.sessions).toHaveLength(1);
  expect((await stored(page))!.sessions[0]!.endedAt).not.toBeNull();
  if (SYNC_WRITES) expect(await deviceKey(page)).toBeNull();
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Fasting', exact: true})).toHaveCount(0);
});

test('a fast is stopped automatically at 24 hours, and the page never praises a long fast', async ({page}) => {
  const timer = await openTimer(page);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '16:8', exact: true}).click();
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.locator('.fasting-clock')).toContainText('of 16 h');
  await page.clock.fastForward(17 * 3_600_000);
  await expect(timer.locator('.fasting-clock')).toHaveText('Target reached · 16 h 00 min of 16 h');
  await timer.getByRole('button', {name: 'Stop fast', exact: true}).click();
  await expect(timer.getByRole('status')).toContainText('Stopped at 17 h 00 min. Your target was 16 h.');
  const text = (await timer.textContent())!.toLowerCase();
  expect(text).not.toMatch(/well done|congratulation|\brecord\b|streak|longest/);
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await page.clock.fastForward(25 * 3_600_000);
  await page.reload();
  const after = await openTimer(page);
  await expect(after.getByRole('status')).toContainText('This fast was stopped automatically at 24 hours.');
  await expect(after.getByRole('list')).toContainText('stopped at 24 h');
  expect((await stored(page))!.sessions.map(s => s.stoppedBy)).toEqual(['person', 'limit']);
});

// Session Y Part 2 (ADR-018): `:66` failed alone on the owner's Mac (Brussels) and passed in CI. With the sync writes on,
// the page showed the 24-hour stop only once its write had landed, so a stop saved late, or not at all, left a running
// clock and no note. The page now shows the stop from the time itself and saves it as before; this test takes the save
// away after the reload and moves the clock without firing the page's minute tick.
test('the automatic stop shows right after a reload, even when saving it fails', async ({page}) => {
  const timer = await openTimer(page);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '16:8', exact: true}).click();
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 0 h 00 min of 16 h');
  const before = await page.evaluate(key => localStorage.getItem(key), HOME);
  await page.addInitScript(key => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) { if (name === key) throw new DOMException('fixture: storage refused', 'QuotaExceededError'); return set.call(this, name, value); };
  }, HOME);
  await page.clock.setSystemTime(new Date(Date.parse('2026-09-15T10:00:00.000Z') + 25 * 3_600_000));
  await page.reload();
  const after = await openTimer(page);
  await expect(after.getByRole('status')).toHaveText('This fast was stopped automatically at 24 hours.');
  await expect(after.locator('.fasting-clock')).toHaveCount(0);
  await expect(after.getByRole('list')).toContainText('24.0 h · target 16 h · stopped at 24 h');
  await expect(after.getByRole('button', {name: 'Start fast', exact: true})).toBeEnabled();
  // Nothing was saved (the fixture refused it): the stored fast is still the running one.
  expect(await page.evaluate(key => localStorage.getItem(key), HOME)).toBe(before);
});

// Session Y Part 2 follow-up (ADR-018): a fast starts when Start is tapped. Its save waits for the storage lock; while it
// waits, two hours pass on the clock; the fast still counts from the tap (it began when the save ran before).
test('a fast starts at the tap, even when its save waits its turn', async ({page}) => {
  const timer = await openTimer(page);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '16:8', exact: true}).click();
  await page.evaluate(() => {
    const w = window as unknown as {__held: (() => void)[]; __request: LockManager['request']};
    w.__held = []; w.__request = LockManager.prototype.request;
    LockManager.prototype.request = function (this: LockManager, ...args: unknown[]) { return new Promise<unknown>(resolve => { w.__held.push(() => resolve((w.__request as (...a: unknown[]) => Promise<unknown>).apply(this, args))); }); } as unknown as LockManager['request'];
  });
  const tapped = await page.evaluate(() => Date.now());
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__held: unknown[]}).__held.length)).toBeGreaterThan(0);
  await page.clock.fastForward(2 * 3_600_000);
  await page.evaluate(() => { const w = window as unknown as {__held: (() => void)[]; __request: LockManager['request']}; LockManager.prototype.request = w.__request; for (const release of w.__held.splice(0)) release(); });
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 2 h 00 min of 16 h');
  const started = (await stored(page))!.sessions.at(-1)! as {startedAt?: string};
  expect(started.startedAt).toBeDefined();
  // From the tap (the clock runs on by itself for the few seconds the test takes), never from the save two hours later.
  expect(Date.parse(started.startedAt!) - tapped).toBeGreaterThanOrEqual(0);
  expect(Date.parse(started.startedAt!) - tapped).toBeLessThan(60_000);
});

test('Showcase: the fictional fast is labelled and viewing writes nothing; reduced motion keeps the bar still', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), HOME);
  const timer = await openTimer(page);
  await expect(timer.getByRole('list')).toContainText('Showcase example');
  await expect(timer.getByRole('list')).toContainText('target 16 h · stopped by you');
  expect(await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), HOME)).toBe(before);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '12:12', exact: true}).click();
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 0 h 00 min of 12 h');
  for (const el of await timer.locator('.fasting-track, .fasting-track *').all()) expect(await el.evaluate(node => getComputedStyle(node).transitionDuration)).toMatch(/^(0s|0s(, 0s)*)$/);
});
