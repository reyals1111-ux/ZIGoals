import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, type HabitInput} from '../lib/habits';
import {createEmptyHealth} from '../lib/health';
import {addWater} from '../lib/health-daily';
import {presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

// Session W Part 13: the evening wrap-up (off by default; settings v3 `wrapUp`, the mood in Health v4 `moods`), the
// next day's intention line, and Today's items leaving with a hidden page. Offline fixture; the clock is fixed.
test.use({timezoneId: 'Europe/Brussels'});
const SETTINGS = 'zigoals:settings:v1', HABITS = 'zigoals:habits:v1', HEALTH = 'zigoals:health:v1', W_REMINDERS = 'zigoals:w-reminders:v1';
const DAY = '2026-10-01', AT = '2026-10-01T06:00:00.000Z';
const input = (title: string): HabitInput => ({title, category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1});
function habits() {
  const created = new Date('2026-09-20T08:00:00.000Z');
  const data = createHabit(createHabit(emptyHabitData(), input('Fictional walk'), created, '59a35604-3696-4a78-b455-000000000001'), input('Fictional reading'), created, '59a35604-3696-4a78-b455-000000000002');
  return logHabitValue(data, '59a35604-3696-4a78-b455-000000000001', DAY, 1, {}, new Date('2026-10-01T07:00:00.000Z'));
}
const health = () => addWater(createEmptyHealth(), {id: 'health_water-fixture-0001', date: DAY, amountMilli: 500_000, unit: 'ml'}, AT);
const onboarded = (extra: object = {}) => ({...presetSettings('habits-health'), onboarded: true, ...extra});
const quietToday = {[WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, [W_REMINDERS]: {version: 1, chained: {}, contributions: {}, dismissed: {'journal-zone': DAY}}};
async function seed(page: Page, records: Record<string, unknown>, time: string) {
  await page.clock.install({time: new Date(time)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(values => {
    if (sessionStorage.getItem('w13-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('w13-fixture', '1');
  }, records);
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const wrapUpCard = (page: Page) => page.getByRole('article', {name: 'Your evening wrap-up'});
/** On a phone For you keeps one card open; the wrap-up, at the lowest priority, waits behind "Show more" when another is open. */
async function revealForYou(page: Page) {
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const more = page.getByRole('region', {name: 'For you'}).getByRole('button', {name: /^Show more/});
  if (await more.count()) await more.click();
}

test('the wrap-up: turned on in Settings, a calm card after 18:00 with the day in your records, the mood saved in Health, the intention shown the next day', async ({page}) => {
  await seed(page, {[SETTINGS]: onboarded(), [HABITS]: habits(), [HEALTH]: health(), ...quietToday}, '2026-10-01T16:30:00.000Z');
  await page.goto('/app/settings');
  const settings = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  await expect(settings.getByLabel('Show the evening wrap-up on Today')).not.toBeChecked();
  await settings.getByLabel('Show the evening wrap-up on Today').check();
  await settings.getByRole('button', {name: 'Save wrap-up', exact: true}).click();
  await expect(settings.getByRole('status')).toHaveText('The evening wrap-up shows on Today from 18:00.');
  expect(await stored(page, SETTINGS)).toMatchObject({schemaVersion: 3, wrapUp: {version: 1, enabled: {v: true}, days: {}}});
  await page.goto('/app');
  await revealForYou(page);
  const card = wrapUpCard(page);
  await expect(card).toContainText('Habits: 1 of 2 done today');
  await expect(card).toContainText('Water: 500 mL');
  await expect(card).not.toContainText(/missed|failed|only/i);
  await card.getByRole('button', {name: 'Good', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Saved for today: Good.');
  await expect(card.getByRole('button', {name: 'Good', exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(await stored(page, HEALTH)).toMatchObject({schemaVersion: 4, moods: {version: 1, days: {[DAY]: {mood: 4}}}});
  await card.getByLabel('One intention for tomorrow (optional)').fill('Fictional: call a friend');
  await card.getByRole('button', {name: 'Wrap up the day', exact: true}).click();
  await expect(card).toHaveCount(0);
  expect((await stored(page, SETTINGS)).wrapUp.days[DAY]).toEqual({intention: 'Fictional: call a friend', doneAt: expect.any(String), at: expect.any(String)});
  await page.clock.setFixedTime(new Date('2026-10-02T07:00:00.000Z'));
  await page.goto('/app');
  await expect(page.locator('.for-you-intention')).toHaveText('Your intention for today Fictional: call a friend');
  await expect(wrapUpCard(page)).toHaveCount(0);
});

test('before its time nothing shows; "Not today" puts it off for the day; while off it never shows', async ({page}) => {
  const wrapUp = {version: 1, enabled: {v: true, at: AT}, days: {}};
  await seed(page, {[SETTINGS]: onboarded({schemaVersion: 3, wrapUp}), [HABITS]: habits(), [HEALTH]: health(), ...quietToday}, '2026-10-01T14:59:00.000Z');
  await page.goto('/app');
  await revealForYou(page);
  await expect(wrapUpCard(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-10-01T16:05:00.000Z'));
  await page.reload();
  await revealForYou(page);
  await wrapUpCard(page).getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(wrapUpCard(page)).toHaveCount(0);
  expect((await stored(page, SETTINGS)).wrapUp.days[DAY]).toEqual({doneAt: expect.any(String), at: expect.any(String)});
  expect((await stored(page, HEALTH)).moods).toBeUndefined();
  await page.reload();
  await revealForYou(page);
  await expect(wrapUpCard(page)).toHaveCount(0);
});

test('a hidden page takes its Today items with it, kept for when it shows again; Customize names them', async ({page}) => {
  const pages = {version: 1, items: {health: {v: 'hidden', at: AT}}};
  await seed(page, {[SETTINGS]: onboarded({schemaVersion: 3, pages}), [HABITS]: habits(), [HEALTH]: health(), ...quietToday}, '2026-10-01T08:00:00.000Z');
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.placed-module[data-kind="widget"]')).toHaveCount(1);
  expect((await stored(page, SETTINGS)).widgets).toHaveLength(4);
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  await expect(page.getByText('is hidden with its page. Show the page again in Settings, under Your pages & buttons.').first()).toBeVisible();
  // The three Health widgets and Daily Health.
  await expect(page.locator('.dashboard-hidden-placeholder', {hasText: 'is hidden with its page'})).toHaveCount(4);
});
