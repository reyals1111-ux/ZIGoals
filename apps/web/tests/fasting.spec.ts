import {expect, test, type Page} from '@playwright/test';
import {FASTING_KEY} from '../lib/fasting/schema';
import {isPhone, openFold} from './phone-nav';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

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
const stored = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), FASTING_KEY)) ?? 'null') as {sessions: {endedAt: string | null; targetHours: number; stoppedBy: string}[]} | null;
async function openTimer(page: Page) {
  await page.goto('/app/health');
  if (await isPhone(page) && await page.getByRole('button', {name: /^Fasting timer/}).count()) await openFold(page, 'Fasting timer');
  await expect(page.getByRole('region', {name: 'Fasting timer', exact: true})).toBeVisible();
  return page.getByRole('region', {name: 'Fasting timer', exact: true});
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

test('Showcase: the fictional fast is labelled and viewing writes nothing; reduced motion keeps the bar still', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), FASTING_KEY);
  const timer = await openTimer(page);
  await expect(timer.getByRole('list')).toContainText('Showcase example');
  await expect(timer.getByRole('list')).toContainText('target 16 h · stopped by you');
  expect(await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), FASTING_KEY)).toBe(before);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '12:12', exact: true}).click();
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 0 h 00 min of 12 h');
  for (const el of await timer.locator('.fasting-track, .fasting-track *').all()) expect(await el.evaluate(node => getComputedStyle(node).transitionDuration)).toMatch(/^(0s|0s(, 0s)*)$/);
});
