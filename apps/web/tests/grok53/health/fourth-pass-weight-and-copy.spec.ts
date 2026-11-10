import {expect, test, type Page} from '@playwright/test';
import {freshHealth, healthView, openHealth, storedHealth} from './al-health-helpers';
import {createEmptyHealth, saveWeight, type HealthData} from '../../../lib/health';
import {addWater, dailyData} from '../../../lib/health-daily';
import {addLocalDays} from '../../../lib/local-date';

// Session AL lane L2, fourth pass: the replay of c521574f (GROK53_REPLAY_L2_1.md, steps 8, 13–17, 20–24, 27; the
// barcode rows) in Moscow's conditions: desktop 1280, Dark, en-GB, Brussels, the clock on 4 Nov 2026 at 04:00 (04:47
// for the lb journal), a fresh profile with the readings the bot typed.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
const DAY = '2026-11-04';
const lb = (v: number) => Math.round(v * 453.59237);
const id = (i: number) => `health_00000000-0000-4000-8000-${String(900000000000 + i)}`;
function journal(values: readonly number[], unit: 'kg' | 'lb', first = addLocalDays(DAY, -(values.length - 1))): HealthData {
  let h = createEmptyHealth();
  values.forEach((v, i) => { const date = addLocalDays(first, i); h = saveWeight(h, {id: id(i), date, grams: unit === 'lb' ? lb(v) : Math.round(v * 1000)}, `${date}T06:00:00.000Z`); });
  const daily = dailyData(h);
  return {...h, daily: {...daily, preferences: {...daily.preferences, weightUnit: unit}}};
}
async function start(page: Page, query: string, health?: HealthData, at = '2026-11-04T03:47:00.000Z') {
  await page.clock.install({time: new Date(at)});
  await freshHealth(page, health);
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'dark'})));
  await openHealth(page, query);
}
const MOSCOW_WEEK = [182.4, 181.7, 181.0, 180.3, 179.6, 178.9, 178.2];

test('MO-017: correcting today\'s 178.2 lb to 300 lb asks once against that same reading, to the tenth', async ({page}) => {
  await start(page, '?view=weight', journal(MOSCOW_WEEK, 'lb'));
  const form = page.getByRole('form', {name: 'Weight entry'});
  await form.getByLabel('Weight (lb)').fill('300');
  await form.getByRole('button', {name: 'Save weight'}).click();
  await expect(page.locator('#health-weight-check')).toHaveText('That is +121.8 lb from this day’s reading of 178.2 lb. If it is right, press Save weight again to keep it.');
});

test('X3-16: seven daily readings 182.4 → 178.2 lb: the trend card follows them (it read 181.2 lb)', async ({page}) => {
  await start(page, '?view=weight', journal(MOSCOW_WEEK, 'lb'));
  const figure = page.locator('.health-big').filter({hasText: 'trend today'}).first();
  await expect(figure).toBeVisible();
  const shown = Number((await figure.textContent())!.match(/([\d.]+) lb/)![1]);
  expect(shown).toBeGreaterThanOrEqual(178.2);
  expect(shown).toBeLessThan(178.7);
});

test('PR-074: in a lb journal the trend card and the coach say the same weekly rate', async ({page}) => {
  const values = Array.from({length: 21}, (_, i) => 80 - i * 0.04);
  await start(page, '?view=weight', journal(values, 'lb'));
  const card = (await page.locator('.health-big').filter({hasText: 'trend today'}).first().textContent())!;
  const coach = (await page.getByText(/^This week: /).first().textContent())!;
  const a = card.match(/([−+-]?[\d.]+) lb\/week/)?.[1]?.replace(/[−-]/, '-'), b = coach.match(/([−+-]?[\d.]+) lb\/week/)?.[1]?.replace(/[−-]/, '-');
  expect(a).toBeTruthy();
  expect(Math.abs(Number(a))).toBe(Math.abs(Number(b)));
});

test('N-MO-14, N-NB-10, MO-154: 70.55 kg is shown as typed and the focus stays on Save weight after the first save', async ({page}) => {
  await start(page, '?view=weight');
  const form = page.getByRole('form', {name: 'Weight entry'});
  await form.getByLabel('Weight (kg)').fill('70.55');
  await form.getByRole('button', {name: 'Save weight'}).click();
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('70.55 kg');
  await expect(page.getByRole('form', {name: 'Weight entry'}).getByRole('button', {name: 'Save weight'})).toBeFocused();
  await expect.poll(async () => (await storedHealth(page))?.weights[0]?.grams).toBe(70_550);
});

test('DV-143: Edit on a past reading says what is being edited and Cancel edit goes back', async ({page}) => {
  await start(page, '?view=weight', journal([81.2, 80.9], 'kg', '2026-11-02'));
  await page.getByRole('button', {name: 'Edit weight for 2 Nov 2026'}).click();
  const banner = page.locator('.health-editing-banner');
  await expect(banner.getByRole('status')).toHaveText('Editing the reading of 2 Nov 2026: 81.2 kg.');
  await banner.getByRole('button', {name: 'Cancel edit'}).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByLabel('Journal date')).toHaveValue(DAY);
});

test('MO-028: the hero\'s primary button is the log still missing (food first, then water)', async ({page}) => {
  await start(page, '');
  const hero = page.locator('.health-heading');
  await expect(hero.getByRole('button', {name: 'Log food'})).toHaveClass(/primary/);
  await expect(hero.getByRole('button', {name: 'Log water'})).toHaveClass(/secondary/);
  await expect(hero.getByRole('button', {name: 'Log weight'})).toHaveClass(/secondary/);
});

test('B-161: with water logged and no target, the water card points to Journal settings, not Targets', async ({page}) => {
  const h = addWater(createEmptyHealth(), {id: id(50), date: DAY, amountMilli: 500_000, unit: 'ml'}, `${DAY}T02:30:00.000Z`);
  await start(page, '', h, '2026-11-04T03:00:00.000Z');
  const water = page.getByRole('region', {name: 'Water journal'});
  await expect(water).toContainText('Set a daily water target in Journal settings.');
  await expect(water).not.toContainText('Set a daily goal in Targets.');
});

test('D-075, PR-021: Measurements with daily weights says where they are, in plain words, with no chart jargon', async ({page}) => {
  await start(page, '?view=measurements', journal([81.2, 80.9, 80.6], 'kg'));
  await expect(page.getByText('No timed weight readings yet.')).toBeVisible();
  await expect(page.getByText('Your 3 daily readings are in the Weight view.', {exact: false})).toBeVisible();
  await expect(page.getByText(/Real observations and recorded contributions/)).toHaveCount(0);
  await expect(page.getByText('No weight readings here yet: add two to show a change.')).toHaveCount(0);
});

test('MO-007, MO-107, C-MO-01, C-DVG-35: with no lookup provider a valid code says so and opens "Add it yourself" with the code', async ({page}) => {
  // freshHealth answers every /api/** with 503, as this build's lookup does without a provider.
  await start(page, '');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
  await lookup.getByLabel('Product barcode').fill('3017620422003');
  await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(lookup).toContainText('Barcode lookup is not available in this version yet, so 3017620422003 could not be looked up.');
  await expect(lookup.getByRole('heading', {name: 'Add it yourself'})).toBeVisible();
  await expect(lookup).toContainText('Barcode 3017620422003 could not be looked up here.');
});

test('PR-088: Today\'s Health card on a partial day shows what is known with a "+", never "Unknown kcal logged"', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T03:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '');
  const quick = page.getByText('Quick add a food that is not in your library');
  await quick.click();
  const form = page.getByRole('form', {name: 'Quick add a food'});
  await form.getByLabel('Food name').fill('Toast'); await form.getByLabel('Calories (kcal)').fill('200'); await form.getByLabel('Portion weight (g)').fill('50');
  await form.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByText('Toast logged and saved to your library.')).toBeVisible();
  // a second entry with no protein: quick add without the optional macros keeps them unknown
  await form.getByLabel('Food name').fill('Mystery soup'); await form.getByLabel('Calories (kcal)').fill('100'); await form.getByLabel('Portion weight (g)').fill('300');
  await form.getByLabel('Protein (g, optional)').fill('5');
  await form.getByRole('button', {name: 'Log and save food'}).click();
  await page.goto('/app');
  const card = page.getByRole('region', {name: 'Today\'s health'});
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('Unknown kcal logged');
  await expect(card).toContainText('5+ g');
  await expect(card).toContainText('Partial · 1 of 2 entries');
});

test('MO-014: the vitamin tiles count what is known in neutral words', async ({page}) => {
  await start(page, '?view=targets');
  await expect(page.getByText(/entries have no value/)).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'More micronutrients'})).toContainText('Magnesium, zinc, B vitamins and omega-3 show here');
});

test('C-MO-04: Targets estimate maintenance calories, labelled, and use them only on request', async ({page}) => {
  await start(page, '?view=targets', journal([70], 'kg'));
  await page.getByText('Estimate my maintenance calories (optional)').click();
  const form = page.getByRole('form', {name: 'Estimate my maintenance calories'});
  await form.getByLabel('Sex for the equation').selectOption('female');
  await form.getByLabel('Age (years)').fill('30'); await form.getByLabel('Height (cm)').fill('165'); await form.getByLabel('Weight (kg)').fill('60');
  await form.getByLabel('How active you are').selectOption('sedentary');
  await form.getByRole('button', {name: 'Estimate'}).click();
  await expect(form.getByRole('status')).toContainText('About 1,580 kcal a day');
  expect((await storedHealth(page))?.targets.kcal ?? null).toBeNull();
  await form.getByRole('button', {name: 'Use 1,580 kcal as my calorie target'}).click();
  await expect.poll(async () => (await storedHealth(page))?.targets.kcal).toBe(1580);
  await healthView(page, 'Diary').click();
});
