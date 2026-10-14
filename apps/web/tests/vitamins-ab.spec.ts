import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_VITAMINS_KEY} from '../lib/ab-cloud-device-keys';

/**
 * Session AB-Cloud Part 4 (ADR-023 C20): vitamins entered on a food's label, read by the micronutrient view and by a
 * recipe, editable targets, unknown never zero, Health's own record untouched. Fictional data; the clock is fixed.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-13', stamp = (d: string, t = '08:00') => `${d}T${t}:00.000Z`;
function health(): HealthData {
  const h = createEmptyHealth();
  h.foods.push({id: 'health_food-orange1', name: 'Fictional orange', brand: '', servingGrams: 150, nutrients: {kcal: 70, proteinMg: 1000, carbsMg: 16000, fatMg: 0}, createdAt: stamp('2026-10-01'), updatedAt: stamp('2026-10-01')});
  h.foods.push({id: 'health_food-salmon1', name: 'Fictional salmon', brand: '', servingGrams: 100, nutrients: {kcal: 200, proteinMg: 22000, carbsMg: 0, fatMg: 12000}, createdAt: stamp('2026-10-01'), updatedAt: stamp('2026-10-01')});
  h.recipes.push({id: 'health_recipe-bowl01', name: 'Fictional bowl', portionsMilli: 1000, ingredients: [{foodId: 'health_food-orange1', quantityMilli: 1000, snapshot: {name: 'Fictional orange', servingGrams: 150, nutrients: {kcal: 70, proteinMg: 1000, carbsMg: 16000, fatMg: 0}}}, {foodId: 'health_food-salmon1', quantityMilli: 1000, snapshot: {name: 'Fictional salmon', servingGrams: 100, nutrients: {kcal: 200, proteinMg: 22000, carbsMg: 0, fatMg: 12000}}}], createdAt: stamp('2026-10-01'), updatedAt: stamp('2026-10-01')});
  h.diary.push({id: 'health_diary-orange1', sourceId: 'health_food-orange1', sourceKind: 'food', snapshot: {name: 'Fictional orange', servingGrams: 150, nutrients: {kcal: 70, proteinMg: 1000, carbsMg: 16000, fatMg: 0}}, date: TODAY, meal: 'Breakfast', quantityMilli: 2000, createdAt: stamp(TODAY), updatedAt: stamp(TODAY)});
  return healthSchema.parse(h);
}
async function seed(page: Page) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HEALTH_STORAGE_KEY]: JSON.stringify(health()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarding: undefined}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const view = (page: Page, name: string) => page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name, exact: true}).click();

test('vitamins on a food\'s label reach today\'s micronutrient view and the recipe; targets edit like the seven; Health\'s record is untouched', async ({page}) => {
  await seed(page); await page.goto('/app/health');
  const before = JSON.stringify(await stored(page, HEALTH_STORAGE_KEY));
  await view(page, 'Targets');
  const vitamins = page.getByRole('region', {name: 'Micronutrients'}).locator('[data-region="vitamins"]');
  // Nothing entered yet: every vitamin is unknown, never zero.
  await expect(vitamins.getByRole('progressbar', {name: 'Vitamin C: unknown'})).toBeVisible();
  // The orange's label: vitamin C 53.2 mg and vitamin A 11 µg per serving; the salmon's: vitamin D 11 µg, A 12 µg.
  await view(page, 'Foods & recipes');
  for (const [food, values] of [['Fictional orange', {'Vitamin C (mg)': '53.2', 'Vitamin A (µg)': '11'}], ['Fictional salmon', {'Vitamin D (µg)': '11', 'Vitamin A (µg)': '12', 'Vitamin B12 (µg)': '3.2'}]] as const) {
    await page.getByRole('button', {name: `Edit food ${food}`}).click();
    const fields = page.getByRole('group', {name: 'Vitamins (optional)'});
    for (const [label, v] of Object.entries(values)) await fields.getByRole('textbox', {name: label}).fill(v);
    await page.getByRole('button', {name: 'Save food'}).click();
    await expect(page.getByRole('heading', {name: 'Edit food'})).toHaveCount(0);
  }
  await expect.poll(() => stored(page, HEALTH_VITAMINS_KEY)).toMatchObject({foods: {'health_food-orange1': {cMg: 53200, aUg: 11000}, 'health_food-salmon1': {dUg: 11000, aUg: 12000, b12Ug: 3200}}});
  // A recipe knows a vitamin only when every ingredient gives it: A only.
  await expect(page.getByText('Vitamins per portion: A 23 µg')).toBeVisible();
  // Today: two oranges for breakfast.
  await view(page, 'Targets');
  await expect(vitamins.getByRole('progressbar', {name: 'Vitamin C: 106.4 of 90 mg'})).toBeVisible();
  await expect(vitamins.getByRole('progressbar', {name: 'Vitamin D: unknown'})).toBeVisible();
  await vitamins.getByRole('button', {name: 'Edit Vitamin C target'}).click();
  await vitamins.getByRole('textbox', {name: 'Vitamin C target in mg'}).fill('120');
  await vitamins.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(vitamins.getByRole('progressbar', {name: 'Vitamin C: 106.4 of 120 mg'})).toBeVisible();
  await expect.poll(() => stored(page, HEALTH_VITAMINS_KEY)).toMatchObject({targets: {cMg: 120000}});
  // Health's own record changed only by the food edits' own timestamps; no vitamin field entered it.
  const after = await stored(page, HEALTH_STORAGE_KEY) as HealthData;
  expect(JSON.stringify(after)).not.toMatch(/"(aUg|cMg|dUg|b12Ug)"/);
  expect(after.foods.map(f => f.nutrients)).toEqual((JSON.parse(before) as HealthData).foods.map(f => f.nutrients));
});
