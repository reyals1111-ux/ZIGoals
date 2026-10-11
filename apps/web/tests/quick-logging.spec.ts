import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY, logHealthItem, saveFood, type HealthData} from '../lib/health';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {isPhone, openMealLog, closeFormSheet} from './phone-nav';

// Session W Part 9: quick logging on the diary — the day before in one tap, one-tap chips for pinned and usual items,
// the person's own water buttons — and Quick add's "slept 7h30" as a night in Sleep, placed by the wake time.
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07', YESTERDAY = '2026-10-06', AT = '2026-10-06T07:00:00.000Z';
function journal(): HealthData {
  let h = createEmptyHealth();
  for (const [id, name, kcal] of [['oats', 'Fictional oats', 380], ['coffee', 'Fictional coffee', 5], ['soup', 'Fictional lentil soup', 240], ['apple', 'Fictional apple', 52]] as const)
    h = saveFood(h, {id: `health_food-${id}`, name, brand: '', servingGrams: 100, nutrients: {kcal, proteinMg: 1000, carbsMg: 2000, fatMg: 500}, createdAt: AT, updatedAt: AT});
  const log = (n: number, id: string, date: string, meal: 'Breakfast' | 'Lunch' | 'Snacks', quantityMilli = 1000) => { h = logHealthItem(h, {id: `health_diary-fixture-${n}`, sourceId: `health_food-${id}`, sourceKind: 'food', date, meal, quantityMilli}, `${date}T0${n}:00:00.000Z`); };
  log(1, 'oats', '2026-10-05', 'Breakfast', 1500); log(2, 'oats', YESTERDAY, 'Breakfast', 1500); log(3, 'coffee', YESTERDAY, 'Breakfast'); log(4, 'soup', YESTERDAY, 'Lunch', 2000);
  return h;
}
async function seed(page: Page, health: HealthData | null = journal()) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(([settingsKey, settings, healthKey, healthValue]) => { localStorage.clear(); localStorage.setItem(settingsKey!, settings!); if (healthValue) localStorage.setItem(healthKey!, healthValue); },
    [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true}), HEALTH_STORAGE_KEY, health ? JSON.stringify(health) : ''] as const);
}
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<HealthData>;
const todays = async (page: Page) => (await stored(page)).diary.filter(e => e.date === TODAY).map(e => [e.meal, e.snapshot.name, e.quantityMilli]);
const noSideways = async (page: Page) => { if (await isPhone(page)) expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0); };

test('the day before in one tap: a meal, or the whole day; each only while there is nothing there yet', async ({page}) => {
  await seed(page);
  await page.goto('/app/health');
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  await expect(page.getByRole('button', {name: 'Repeat yesterday (3 entries in 2 meals)'})).toBeVisible();
  await breakfast.getByRole('button', {name: 'Copy yesterday’s breakfast (2 entries)'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Copied breakfast from yesterday: 2 entries.'})).toBeVisible();
  await expect(breakfast).toContainText('Fictional oats');
  await expect(breakfast.getByRole('button', {name: /^Copy yesterday/})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Repeat yesterday/})).toHaveCount(0);
  expect(await todays(page)).toEqual([['Breakfast', 'Fictional oats', 1500], ['Breakfast', 'Fictional coffee', 1000]]);
  // The lunch is still offered on its own; a copy keeps the entry exactly as logged (two servings).
  await page.getByRole('region', {name: 'Lunch diary'}).getByRole('button', {name: 'Copy yesterday’s lunch (1 entry)'}).click();
  await expect.poll(() => todays(page)).toContainEqual(['Lunch', 'Fictional lentil soup', 2000]);
  await noSideways(page);
});

test('"Repeat yesterday" copies every meal at once', async ({page}) => {
  await seed(page);
  await page.goto('/app/health');
  await page.getByRole('button', {name: 'Repeat yesterday (3 entries in 2 meals)'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Copied 3 entries from yesterday.'})).toBeVisible();
  expect(await todays(page)).toEqual([['Breakfast', 'Fictional oats', 1500], ['Breakfast', 'Fictional coffee', 1000], ['Lunch', 'Fictional lentil soup', 2000]]);
});

test('one tap: what you usually have at a meal, and an item you pinned, on every meal', async ({page}) => {
  await seed(page);
  await page.goto('/app/health');
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  const chips = breakfast.getByRole('group', {name: 'One tap for breakfast'});
  await expect(chips.getByRole('button')).toHaveText(['+ Fictional oats · 1.5', '+ Fictional coffee · 1']);
  await chips.getByRole('button', {name: 'Log Fictional oats, 1.5 servings, to breakfast'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Fictional oats logged to breakfast: 1.5 servings.'})).toBeVisible();
  await expect(chips.getByRole('button')).toHaveText(['+ Fictional coffee · 1']);
  // Pin the apple from the quick picks: it is then one tap on every meal.
  await openMealLog(page);
  await page.getByRole('button', {name: 'All', exact: true}).click();
  await page.getByRole('button', {name: 'Pin Fictional apple', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Unpin Fictional apple', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await closeFormSheet(page);
  const snacks = page.getByRole('region', {name: 'Snacks diary'}).getByRole('group', {name: 'One tap for snacks'});
  await snacks.getByRole('button', {name: 'Log Fictional apple, 1 serving, to snacks'}).click();
  await expect.poll(() => todays(page)).toEqual([['Breakfast', 'Fictional oats', 1500], ['Snacks', 'Fictional apple', 1000]]);
  expect((await stored(page)).schemaVersion).toBe(4);
  expect((await stored(page) as HealthData & {quick?: {pinned: unknown[]}}).quick?.pinned).toEqual([{sourceId: 'health_food-apple', sourceKind: 'food'}]);
  await noSideways(page);
});

test('your own water buttons, in your unit; back to the usual two', async ({page}) => {
  await seed(page);
  await page.goto('/app/health');
  const water = page.getByRole('region', {name: 'Water journal'});
  await expect(water.getByRole('button', {name: /^Add \d/})).toHaveText(['Add 250 mL', 'Add 500 mL']);
  await water.getByRole('button', {name: 'Change these buttons', exact: true}).click();
  const form = water.getByRole('form', {name: 'Your water buttons'});
  await form.getByLabel(/Your water buttons/).fill('330, 750, 3');
  await form.getByRole('button', {name: 'Save buttons', exact: true}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Each size is between 10 and 5,000 mL.'})).toBeVisible();
  await form.getByLabel(/Your water buttons/).fill('330, 750');
  await form.getByRole('button', {name: 'Save buttons', exact: true}).click();
  await expect(water.getByRole('button', {name: /^Add \d/})).toHaveText(['Add 330 mL', 'Add 750 mL']);
  await water.getByRole('button', {name: 'Add 330 mL', exact: true}).click();
  await expect(water).toContainText('330 mL recorded');
  await water.getByRole('button', {name: 'Change these buttons', exact: true}).click();
  await water.getByRole('button', {name: 'Back to 250 and 500 mL', exact: true}).click();
  await expect(water.getByRole('button', {name: /^Add \d/})).toHaveText(['Add 250 mL', 'Add 500 mL']);
});

test('Quick add: "slept 7h30" asks when you woke up, then becomes a night in Sleep (no movement minutes)', async ({page}) => {
  await seed(page, null);
  await page.goto('/app');
  await page.locator(await isPhone(page) ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'}), line = dialog.getByRole('form', {name: 'Type a line'});
  await dialog.getByRole('textbox', {name: 'Type a line'}).fill('slept 7h30');
  await page.keyboard.press('Enter');
  await expect(line).toContainText('Will save: Sleep · 7 h 30 min · today');
  const save = line.getByRole('button', {name: 'Save', exact: true});
  await expect(save).toBeDisabled();
  await line.getByLabel('When did you wake up (today)?').fill('07:00');
  await expect(line).toContainText('A night in Sleep: in bed from 23:30, worked out from your wake time and how long you slept.');
  await save.click();
  await expect(line.getByRole('status')).toContainText('Saved to Sleep: 7 h 30 min · woke 07:00 · today');
  const health = await stored(page) as HealthData & {sleep?: {nights: {kind: string; start: string; end: string; timeZone: string}[]}};
  expect(health.activity).toEqual([]);
  expect(health.sleep?.nights).toMatchObject([{kind: 'night', start: '2026-10-06T21:30:00.000Z', end: '2026-10-07T05:00:00.000Z', timeZone: 'Europe/Brussels'}]);
});
