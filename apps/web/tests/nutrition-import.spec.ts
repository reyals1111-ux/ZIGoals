import {expect, test, type Page} from '@playwright/test';
import {HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {IMPORT_UNDO_KEY} from '../lib/import/undo-schema';
import {isPhone} from './phone-nav';

// I1 (Session P): meals from a nutrition CSV; blank stays unknown; a food joins the library only with a serving measure.
const FIXTURE_A = 'Date,Meal,Food,Calories,Protein (g),Carbohydrates (g),Fat (g)\n2026-09-14,Breakfast,Oats,380,13,67,\n2026-09-14,Lunch,Rice bowl,520,18,80,12\n2026-09-15,Snacks,Apple,95,0.5,25,0.3\n';
const FIXTURE_B = 'Date,Meal,Food,Serving size,Calories,Protein (g)\n2026-09-14,Breakfast,Oats,100 g,380,13\n2026-09-14,Breakfast,Oats,100 g,380,13\n2026-09-15,Lunch,Rice,100 g,130,3\n';
const CELLS = ['Rice bowl', '520', 'Apple', 'Oats'];
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const health = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HEALTH_STORAGE_KEY)) ?? 'null') as HealthData | null;
async function openPanel(page: Page) {
  await page.goto('/app/health');
  await page.getByText('Import a nutrition CSV', {exact: true}).click();
  await page.getByRole('button', {name: 'Choose a file', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import meals', exact: true});
  await expect(panel).toBeVisible();
  if (await isPhone(page)) await expect(page.getByRole('dialog', {name: 'Import meals'})).toBeVisible();
  return panel;
}

test('fixture A: three entries on two days with an unknown serving measure, blank fat stays unknown, undo removes them', async ({page}) => {
  const seen: {url: string; body: string | null}[] = [];
  page.on('request', request => seen.push({url: request.url(), body: request.postData()}));
  const panel = await openPanel(page);
  await panel.getByLabel('CSV file').setInputFiles({name: 'diary.csv', mimeType: 'text/csv', buffer: Buffer.from(FIXTURE_A)});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await expect(panel.getByLabel(/^Date · required/)).toHaveValue('0');
  await expect(panel.getByLabel(/^Food · required/)).toHaveValue('2');
  await expect(panel.getByLabel(/^Calories/)).toHaveValue('3');
  await expect(panel.getByRole('radio', {name: 'the row’s serving'})).toBeChecked();
  await expect(panel.getByRole('group', {name: 'Meals in this file'})).toContainText('Breakfast');
  if (await isPhone(page)) expect(await panel.getByLabel(/^Food · required/).evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('0 foods will be added to your library · 3 diary entries on 2 days · 3 entries without a serving measure · 0 rows refused');
  await expect(panel.locator('.import-preview')).toContainText('2026-09-14 · Breakfast · Oats · 1 serving · 380 kcal · P 13 g · C 67 g · F Unknown g · serving measure unknown');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 3 entries', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('3 entries and 0 foods imported.');
  const data = (await health(page))!;
  expect(data.diary).toHaveLength(3); expect(data.foods).toHaveLength(0);
  expect(data.diary[0]).toMatchObject({date: '2026-09-14', meal: 'Breakfast', snapshot: {name: 'Oats', servingGrams: null, nutrients: {kcal: 380, proteinMg: 13000, carbsMg: 67000, fatMg: null}}});
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), IMPORT_UNDO_KEY))!).imports[0]).toMatchObject({kind: 'nutrition', createdIds: data.diary.map(e => e.id)});
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await page.getByLabel('Journal date').fill('2026-09-14');
  await expect(page.getByText('Oats', {exact: true}).first()).toBeVisible();
  await expect(page.getByText('Rice bowl', {exact: true}).first()).toBeVisible();
  await expect(page.getByText('Serving measure unknown').first()).toBeVisible();
  const banner = page.locator('.import-banner');
  await expect(banner).toContainText('3 entries and 0 foods imported.');
  const undo = banner.getByRole('button', {name: 'Undo', exact: true});
  expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await undo.click();
  await expect(banner).toHaveCount(0);
  expect((await health(page))!.diary).toEqual([]);
  expect(new Set(seen.map(r => new URL(r.url).hostname))).toEqual(new Set(['127.0.0.1']));
  for (const r of seen) for (const cell of CELLS) { expect(r.url).not.toContain(cell); expect(r.body ?? '').not.toContain(cell); }
});

test('fixture B: a serving size makes library foods, one per distinct food', async ({page}) => {
  const panel = await openPanel(page);
  await panel.getByLabel('CSV file').setInputFiles({name: 'diary.csv', mimeType: 'text/csv', buffer: Buffer.from(FIXTURE_B)});
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('2 foods will be added to your library · 3 diary entries on 2 days · 0 entries without a serving measure · 0 rows refused');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 3 entries', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('3 entries and 2 foods imported.');
  const data = (await health(page))!;
  expect(data.foods.map(f => [f.name, f.brand, f.servingGrams])).toEqual([['Oats', 'Imported', 100], ['Rice', 'Imported', 100]]);
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await page.getByRole('button', {name: 'Foods & recipes', exact: true}).click();
  await expect(page.getByText('Imported').first()).toBeVisible();
});

test('Showcase: the fictional example import is listed and viewing writes nothing', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), IMPORT_UNDO_KEY);
  expect(before).not.toBe('[]');
  const panel = await openPanel(page);
  const recent = panel.getByRole('region', {name: 'Recent imports', exact: true});
  await expect(recent).toContainText('SHOWCASE DATA · fictional example import');
  await expect(recent.getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
  expect(await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), IMPORT_UNDO_KEY)).toBe(before);
});
