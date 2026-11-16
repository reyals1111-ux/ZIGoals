import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {saveMealFromRecipe, saveMealPlan} from '../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

/**
 * Session AR (6a, "the checkbox flash"): a box controlled by a stored value whose save is async (it waits for the cross-tab
 * lock) keeps the person's tick from the end of the click (components/use-held-tick.ts). `el.click()` then `el.checked`
 * in one task reads the box exactly where React leaves it after the click event. One test per family of sites: Health's
 * grocery checkoff (fixed here; no Undo on that site, so unticking puts the box and the record back), and the Settings
 * switch that already held its own choice (the evening wrap-up; the pages' switches hold theirs the same way). Goal milestones, now on the same
 * hook, keep their own spec (tests/grok53/release/aq-milestone-tick.spec.ts). Fictional data.
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1920, height: 1113}});
test.skip(({isMobile}) => isMobile, 'computer width: runs in the desktop project');
const TODAY = '2026-10-07', AT = `${TODAY}T08:00:00.000Z`;
const ticksAtOnce = (el: HTMLInputElement) => { el.click(); return el.checked; };
const fullFor = async (page: Page, key: string) => page.evaluate(k => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (name: string, value: string) { if (name === k) throw new DOMException('full', 'QuotaExceededError'); return orig.call(this, name, value); }; }, key);
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
async function seed(page: Page, values: Record<string, string>) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00.000Z`));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, {...values, 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})});
}

function health(): HealthData {
  const h = createEmptyHealth();
  const lentils = {name: 'Fictional lentils', servingGrams: 100, nutrients: {kcal: 350, proteinMg: 25000, carbsMg: 60000, fatMg: 1000}};
  h.foods.push({id: 'health_food-0001', brand: '', ...lentils, createdAt: AT, updatedAt: AT} as HealthData['foods'][number]);
  h.recipes.push({id: 'health_recipe-0001', name: 'Fictional lentil soup', portionsMilli: 4000, ingredients: [{foodId: 'health_food-0001', quantityMilli: 2000, snapshot: lentils}], createdAt: AT, updatedAt: AT} as HealthData['recipes'][number]);
  const parsed = healthSchema.parse({...h, schemaVersion: 4});
  return saveMealPlan(saveMealFromRecipe(parsed, 'health_saved-0001', 'health_recipe-0001', 1000, AT), {id: 'health_plan-0001', savedMealId: 'health_saved-0001', date: TODAY, meal: 'Dinner'}, AT);
}
async function grocery(page: Page) {
  await seed(page, {[HEALTH_STORAGE_KEY]: JSON.stringify(health())});
  await page.goto('/app/health'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Meals & planning', exact: true}).click();
  const list = page.getByRole('region', {name: 'Grocery list', exact: true});
  const box = list.getByRole('checkbox', {name: 'Bought Fictional lentils', exact: true});
  await expect(box).toBeVisible(); await expect(box).not.toBeChecked();
  return box;
}
const bought = async (page: Page) => ((await stored(page, HEALTH_STORAGE_KEY)) as HealthData).daily?.groceryEdits?.find(e => e.name === 'Fictional lentils')?.checked ?? false;

test('Health grocery checkoff: the tick shows at the end of the click; unticking puts the box and the record back; a refused save puts the box back and says why', async ({page}) => {
  const box = await grocery(page);
  expect(await box.evaluate(ticksAtOnce)).toBe(true);
  await expect(box).toBeChecked();
  await expect.poll(() => bought(page)).toBe(true);
  expect(await box.evaluate(ticksAtOnce)).toBe(false);
  await expect(box).not.toBeChecked();
  await expect.poll(() => bought(page)).toBe(false);
  await page.reload(); await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Meals & planning', exact: true}).click();
  await expect(box).not.toBeChecked();
  // Refused: storage full for Health's record.
  await fullFor(page, HEALTH_STORAGE_KEY);
  expect(await box.evaluate(ticksAtOnce)).toBe(true);
  await expect(box).not.toBeChecked();
  await expect(page.getByRole('alert').or(page.getByRole('status')).filter({hasText: /save|space|full|storage/i}).first()).toBeVisible();
  expect(await bought(page)).toBe(false);
});

test('Settings: the evening wrap-up already holds the choice at once; a refused save puts the box back and says why', async ({page}) => {
  await seed(page, {});
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const wrap = page.getByRole('checkbox', {name: 'Show the evening wrap-up on Today', exact: true});
  await wrap.scrollIntoViewIfNeeded(); await expect(wrap).not.toBeChecked();
  expect(await wrap.evaluate(ticksAtOnce)).toBe(true);
  await expect(wrap).toBeChecked();
  expect(await wrap.evaluate(ticksAtOnce)).toBe(false);
  await expect(wrap).not.toBeChecked();
  await fullFor(page, DASHBOARD_SETTINGS_KEY);
  expect(await wrap.evaluate(ticksAtOnce)).toBe(true);
  await expect(wrap).not.toBeChecked();
  await expect(page.locator('#wrap-up').getByRole('alert')).toBeVisible();
});
