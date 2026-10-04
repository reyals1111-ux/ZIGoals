import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, createHabit, emptyHabitData, type HabitData} from '../lib/habits';
import {HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {isPhone} from './phone-nav';

// A2 (Session P): the Quick-add line: one typed line, an exact preview, nothing saved before Save.
const TODAY = '2026-09-15';
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const habits = createHabit(emptyHabitData(), {title: 'Meditate', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 10, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-09-01T08:00:00.000Z'), '11111111-1111-4111-8111-111111111111');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HABITS_KEY]: JSON.stringify(habits), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})}); // the balanced preset keeps the financial domain, whose Today hero carries Quick add on desktop
});
const health = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HEALTH_STORAGE_KEY)) ?? 'null') as HealthData | null;
const habits = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS_KEY))!) as HabitData;
async function openQuickAdd(page: Page) {
  await page.goto('/app');
  // The Today hero's trigger (desktop) or the phone top bar's.
  await page.locator(await isPhone(page) ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await expect(dialog).toBeVisible();
  return {dialog, line: dialog.getByRole('form', {name: 'Type a line'}), field: dialog.getByRole('textbox', {name: 'Type a line'})};
}

test('water: preview first, then Save writes one entry and the dialog stays open for the next line', async ({page}) => {
  const {dialog, line, field} = await openQuickAdd(page);
  if (await isPhone(page)) expect(await field.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
  await dialog.getByRole('button', {name: 'Close Quick add', exact: true}).focus();
  await page.keyboard.press('Tab');
  await expect(field).toBeFocused();
  await field.fill('drank 2 glasses of water');
  await page.keyboard.press('Enter');
  await expect(line).toContainText('Will save: Water · 2 glasses (500 mL) · today');
  await expect(line).toContainText('A glass is counted as 250 mL.');
  expect(await health(page)).toBeNull();
  const save = line.getByRole('button', {name: 'Save', exact: true});
  expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await save.click();
  await expect(line.getByRole('status')).toContainText('Saved: Water · 500 mL · today');
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();
  await expect(dialog).toBeVisible();
  const water = (await health(page))!.daily!.water;
  expect(water).toHaveLength(1);
  expect(water[0]).toMatchObject({date: TODAY, amountMilli: 500_000, unit: 'ml'});
  await field.fill('hello');
  await line.getByRole('button', {name: 'Preview', exact: true}).click();
  await expect(line.getByRole('status')).toContainText('I didn’t understand that yet. Try: drank 2 glasses of water · weight 78.4 · ran 5k in 28 min');
  expect((await health(page))!.daily!.water).toHaveLength(1);
  await dialog.getByRole('button', {name: 'Close Quick add', exact: true}).click();
  await page.goto('/app/health');
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('500 mL recorded');
});

test('a habit by its name: "meditated" logs one check-in on today', async ({page}) => {
  const {line, field} = await openQuickAdd(page);
  await field.fill('meditated');
  await page.keyboard.press('Enter');
  await expect(line).toContainText('Will save: Meditate · +1 time · today');
  expect((await habits(page)).habits[0]!.entries).toEqual([]);
  await line.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(line.getByRole('status')).toContainText('Saved: Meditate · 1 of 10 times today');
  expect((await habits(page)).habits[0]!.entries).toMatchObject([{date: TODAY, count: 1, disposition: 'logged'}]);
  await page.keyboard.press('Escape');
  await page.goto('/app/habits');
  await expect(page.getByRole('article', {name: 'Meditate', exact: true}).locator('.habit-count')).toHaveText('1 / 10 times per day');
});
