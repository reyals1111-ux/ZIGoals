import {expect, test, type Page} from '@playwright/test';
import {freshHealth, healthView, openHealth} from './al-health-helpers';
import {createEmptyHealth, saveWeight, type HealthData} from '../../../lib/health';
import {dailyData} from '../../../lib/health-daily';
import {addLocalDays} from '../../../lib/local-date';
import {REMINDERS_PLAN_KEY} from '../../../lib/aa-device-keys';
import {emptyDevice, open} from '../l3-helpers';
import {hydrated} from '../../ah-helpers';

// Session AL lane L2, fifth pass: the replay of 37d2370c (GROK53_REPLAY_L2_2.md: STILL OPEN G-044, PR-014; CHANGED
// N-MO-14/N-NB-10, MO-007/MO-107, C-DVG-41; the small observations) in Moscow's conditions: desktop 1280, Dark, en-GB,
// Brussels, the clock on 4 Nov 2026 (12:00, outside the default quiet hours), a fresh profile with the bot's readings.
// The Checklist rows (LS-016, LS-056, PR-018) are in fifth-pass-checklist.spec.ts.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
const DAY = '2026-11-04', NOON = '2026-11-04T11:00:00.000Z';
const id = (i: number) => `health_00000000-0000-4000-8000-${String(950000000000 + i)}`;
function journal(readings: readonly [number, number][], unit: 'kg' | 'lb' = 'kg'): HealthData {
  let h = createEmptyHealth();
  readings.forEach(([daysAgo, kg], i) => { const date = addLocalDays(DAY, -daysAgo); h = saveWeight(h, {id: id(i), date, grams: Math.round(kg * 1000)}, `${date}T06:00:00.000Z`); });
  const daily = dailyData(h);
  return {...h, daily: {...daily, preferences: {...daily.preferences, weightUnit: unit}}};
}
async function start(page: Page, query: string, health?: HealthData, at = NOON) {
  await page.clock.install({time: new Date(at)});
  await freshHealth(page, health);
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'dark'})));
  await openHealth(page, query);
}

test('PR-014: the Health views are one tablist of 11 tabs with a panel; arrows, Home and End move; deep links choose the tab', async ({page}) => {
  await start(page, '?view=weight');
  const list = page.getByRole('tablist', {name: 'Health views'});
  await expect(list).toHaveCount(1);
  await expect(list.getByRole('tab')).toHaveCount(11);
  await expect(page.getByRole('navigation', {name: 'Health views'})).toHaveCount(0);
  const weight = healthView(page, 'Weight');
  await expect(weight).toHaveAttribute('aria-selected', 'true');
  await expect(weight).toHaveAttribute('tabindex', '0');
  await expect(healthView(page, 'Diary')).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('tabpanel', {name: 'Weight'})).toBeVisible();
  await weight.focus();
  await page.keyboard.press('ArrowRight');
  await expect(healthView(page, 'Measurements')).toBeFocused();
  await expect(healthView(page, 'Measurements')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/[?&]view=measurements/);
  await page.keyboard.press('End');
  await expect(healthView(page, 'Journal settings')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(healthView(page, 'Diary')).toBeFocused();
  await expect(healthView(page, 'Diary')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(healthView(page, 'Diary')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(healthView(page, 'Journal settings')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', {name: 'Journal settings'})).toBeVisible();
});

test('N-MO-14, N-NB-10: 70.55 kg reads 70.55 on the trend card, the chart\'s first observation and the 30-day average', async ({page}) => {
  await start(page, '?view=weight', journal([[0, 70.55]]));
  const main = page.locator('main');
  await expect(main.getByText(/^Latest reading 70\.55 kg · 4 Nov\./)).toBeVisible();
  await expect(page.locator('.evidence-first')).toContainText('70.55');
  await expect(main.getByText(/Average 70\.55 kg\./)).toBeVisible();
  await expect(main).not.toContainText('70.6 kg');
});

test('the trend card writes a fall with the minus sign, as the coach does', async ({page}) => {
  await start(page, '?view=weight', journal([[21, 72.4], [14, 72], [7, 71.6], [0, 71.2]]));
  await expect(page.locator('.health-big').first()).toBeVisible();
  const text = await page.locator('main').innerText();
  expect(text).toMatch(/−\d/);
  expect(text).not.toMatch(/(^|[\s(])-\d+(\.\d+)? (kg|lb)/m);
});

test('Measurements: a weight range error goes when the type changes to Waist; an lb journal opens the timed weight in lb', async ({page}) => {
  await start(page, '?view=measurements', journal([[1, 80]], 'lb'));
  const form = page.getByRole('form', {name: 'Body measurement entry'}), value = form.getByLabel('Measurement value');
  await expect(form.getByLabel('Measurement unit', {exact: true})).toHaveValue('lb');
  await value.fill('5000'); await form.getByRole('button', {name: 'Save measurement'}).click();
  await expect(value).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Measurement history type').selectOption('waist');
  await expect(value).not.toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('.field-error')).toHaveCount(0);
  await expect(form.getByLabel('Measurement unit', {exact: true})).toHaveValue('in');
});

test('MO-007, MO-107: the 13-digit code 0000000000000 is kept as typed; a wrong check digit is said before the lookup', async ({page}) => {
  await start(page, '?view=diary');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const area = page.getByRole('region', {name: 'Barcode food lookup'}), code = area.getByLabel('Product barcode', {exact: true}), look = area.getByRole('button', {name: 'Look up barcode', exact: true});
  await code.fill('3017620422004');
  await expect(area.getByText('The last digit of this EAN-13 code does not match the others (its check digit). Check the number on the package.')).toBeVisible();
  await expect(look).toBeDisabled();
  await code.fill('0000000000000');
  await look.click();
  await expect(area.getByText('Barcode 0000000000000 could not be looked up here.', {exact: false})).toBeVisible();
  await expect(area).not.toContainText(/Barcode 0{8}(?!0)/);
  await expect(area.getByRole('heading', {name: 'Add it yourself'})).toBeVisible();
});

test('C-DVG-41: the fasting card switches on the fasting reminder; Today shows it once the fast reaches its target', async ({page}) => {
  await start(page, '');
  const timer = page.getByRole('region', {name: 'Fasting timer', exact: true});
  const remind = timer.getByLabel('Remind me on Today when a fast reaches its target');
  await remind.check();
  await expect(timer.getByText('Fasting reminder on: Today shows a card when your fast reaches its target.')).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.items?.['fasting-end']?.on, REMINDERS_PLAN_KEY)).toBe(true);
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.getByRole('button', {name: 'Stop fast', exact: true})).toBeVisible();
  // 17 hours later (05:00 the next day is inside the default quiet hours, so the card waits until 08:00).
  await page.clock.setSystemTime(new Date(Date.parse(NOON) + 21 * 3_600_000));
  await page.goto('/app'); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Reminder: Fasting end'})).toContainText('Your fast has reached its target hours.');
});

test('G-044: your own measure in hours refuses a 30-hour day and asks once about 21 hours', async ({page}) => {
  await emptyDevice(page, {theme: 'dark'});
  await open(page, '/app/goals/average/new');
  await page.getByLabel('Name', {exact: true}).fill('Less screen time');
  await page.getByRole('combobox', {name: 'Measure', exact: true}).selectOption('custom');
  await page.getByRole('combobox', {name: 'Keep it', exact: true}).selectOption('at-most');
  await page.getByLabel('Target', {exact: true}).fill('2');
  await page.getByLabel('Unit', {exact: true}).fill('hours');
  await page.getByRole('button', {name: 'Save goal'}).click();
  await page.waitForURL(/\/app\/goals\/average\/(?!new)/); await hydrated(page);
  const value = page.getByRole('textbox', {name: /^Less screen time: value for /}), save = page.getByRole('button', {name: 'Save the day'});
  await value.fill('30'); await save.click();
  await expect(page.getByText('A day holds at most 24 hours. Enter from 0 to 24 hours.')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('30 hours');
  await value.fill('21'); await save.click();
  await expect(page.getByText('21 hours is most of a day. If it is right, press Save again to keep it.')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('21 hours ·');
  await save.click();
  await expect(page.locator('.average-goal-overview')).toContainText('21');
});

