import {gzipSync} from 'node:zlib';
import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {createEmptyHealth, saveFood, saveRecipe, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {planFromRecipe} from '../lib/health-aa/planner';
import {FOOD_PLUS_KEY} from '../lib/food-plus/schema';
import {GROCERY_KEY} from '../lib/grocery/schema';
import {buildStoredZip} from '../lib/export/zip';

/**
 * Session AW (X5, LEDGER #449–#455; Paprika): Tom's kitchen. The cooking view scales the recipe (For 4, Half, Double),
 * ticks the ingredients, shows the whole method beside the large step with the current one marked, offers "Start 5 min
 * timer" from a step's words (an in-page countdown until #440's Timers are merged; several at once) and "Made it
 * today"; the recipe row then says when it was last made, takes the person's stars, and the list sorts by them. The
 * Planner's grocery list puts "Use soon" first from the pantry's use-by days; a week of meals is kept as a menu and
 * placed on the next week, with Undo. A Paprika export (a .paprikarecipes ZIP of gzip JSON, made here with Node's zlib)
 * and a Markdown recipe are read on the device, planned first, checked line by line, saved and undone. At 390 (the phone
 * project) and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320, still under Motion Off. Fictional
 * data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-25T10:00:00+01:00'), TODAY = '2026-11-25', AT = '2026-11-20T08:00:00.000Z';
const SOUP = 'health_recipe-x5-soup', PIE = 'health_recipe-x5-pie';
function kitchen(): HealthData {
  let h = createEmptyHealth();
  for (const [id, name, grams] of [['health_food-x5-peas', 'Fictional split peas', 100], ['health_food-x5-leek', 'Fictional leek', 100], ['health_food-x5-salt', 'Fictional salt', 1]] as const)
    h = saveFood(h, {id, name, brand: 'Fictional kitchen', servingGrams: grams, nutrients: {kcal: 100, proteinMg: 1000, carbsMg: 1000, fatMg: 1000}, createdAt: AT, updatedAt: AT});
  h = saveRecipe(h, {id: SOUP, name: 'Fictional pea soup', portionsMilli: 2000, items: [{foodId: 'health_food-x5-peas', quantityMilli: 2_000}, {foodId: 'health_food-x5-leek', quantityMilli: 1_000}, {foodId: 'health_food-x5-salt', quantityMilli: 3_000}]}, AT);
  h = saveRecipe(h, {id: PIE, name: 'Fictional leek pie', portionsMilli: 4000, items: [{foodId: 'health_food-x5-leek', quantityMilli: 3_000}]}, AT);
  return h;
}
const METHOD = {[SOUP]: ['Rinse the peas.', 'Soften the leek for 5 minutes.', 'Simmer for 40–45 minutes.', 'Blend and season.']};
async function seed(page: Page, records: Record<string, string>) {
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(r => { for (const [k, v] of Object.entries(r)) localStorage.setItem(k, v); }, records);
}
async function clean(page: Page, scope = page.locator('main')) {
  const findings = await axe(page, scope);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const noSideways = async (page: Page) => { await page.setViewportSize({width: 320, height: 720}); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); };

for (const theme of THEMES) test(`${theme}: cooking — scaled, ticked, the method beside the step, a timer from the words, made it, stars and sort`, async ({page, isMobile}) => {
  await page.clock.install({time: NOW});
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seed(page, {[HEALTH_STORAGE_KEY]: JSON.stringify(kitchen()), [FOOD_PLUS_KEY]: JSON.stringify({version: 1, steps: METHOD})});
  await page.goto('/app/health?view=foods'); await hydrated(page);
  const row = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Fictional pea soup'})});
  await row.getByRole('button', {name: 'Cook Fictional pea soup, step by step'}).click();
  const view = page.getByRole('region', {name: 'Cooking: Fictional pea soup'});
  await expect(view).toContainText('Makes 2 servings. Gather these first:');
  const list = view.getByRole('list', {name: 'Ingredients for Fictional pea soup'});
  await expect(list.getByRole('listitem')).toHaveText(['200 g Fictional split peas', '100 g Fictional leek', '3 g Fictional salt']);
  // #450: for 4 doubles the amounts shown; the saved recipe is unchanged.
  const cookFor = view.getByRole('group', {name: 'Cook for'});
  await cookFor.getByRole('button', {name: 'For 4'}).click();
  await expect(cookFor.getByRole('button', {name: 'For 4'})).toHaveAttribute('aria-pressed', 'true');
  await expect(view.getByRole('status').filter({hasText: 'For 4 servings (the recipe makes 2): amounts × 2.'})).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveText(['400 g Fictional split peas', '200 g Fictional leek', '6 g Fictional salt']);
  await cookFor.getByRole('button', {name: 'Half'}).click();
  await expect(list.getByRole('listitem').first()).toHaveText('100 g Fictional split peas');
  expect((await stored(page, HEALTH_STORAGE_KEY)).recipes[0].ingredients[0].quantityMilli).toBe(2_000);
  // #451: ticks for this cooking only.
  await list.getByRole('checkbox', {name: /Fictional leek/}).check();
  await expect(view).toContainText('Gather these first (1 of 3 ticked):');
  await clean(page, view);
  await view.getByRole('button', {name: 'Start cooking'}).click();
  const method = view.getByRole('list', {name: 'The method'});
  await expect(method.getByRole('button')).toHaveCount(4);
  await expect(method.locator('[aria-current="step"]')).toContainText('Rinse the peas.');
  await expect(view.getByRole('button', {name: /^Start .* timer/})).toHaveCount(0);
  await method.getByRole('button', {name: /Step 2: .*Soften the leek/}).click();
  await expect(view.locator('.food-plus-cook-step')).toContainText('Soften the leek for 5 minutes.');
  await expect(method.locator('[aria-current="step"]')).toContainText('Soften the leek');
  // #449: the step's own words make the timer; two run at once.
  await view.getByRole('button', {name: 'Start 5 min timer: Fictional pea soup · Soften the leek'}).click();
  await expect(view.getByRole('status').filter({hasText: 'Started: Fictional pea soup · Soften the leek, 5 min.'})).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(view.getByRole('button', {name: 'Start 45 min timer'})).toBeVisible();
  await view.getByRole('button', {name: 'Start 45 min timer'}).click();
  // Session AW (x5-paprika, deliberate; integration): with X1's named timers merged, the cooking view's timers run in
  // Timers (lib/aw-x5/timer-adapter.ts), so they show in the strip on every page, not in the view's in-page fallback
  // list (which stays away). The same checks: two at once, the first 5:00 left, its end said, cleared with one left.
  await expect(view.getByRole('list', {name: 'Timers in this cooking'})).toHaveCount(0);
  const timers = page.getByRole('group', {name: 'Timers running'});
  await expect(timers.getByRole('listitem')).toHaveCount(2);
  await expect(timers.getByRole('listitem').first()).toContainText('Fictional pea soup · Soften the leek');
  await expect(timers.getByRole('listitem').first()).toContainText(/5:00|4:5\d/);
  await page.clock.runFor(5 * 60_000 + 2_000);
  await expect(timers.getByRole('listitem').first()).toContainText('Done');
  await expect(page.getByRole('status').filter({hasText: 'Timer done: “Fictional pea soup · Soften the leek”.'})).toBeVisible();
  await timers.getByRole('button', {name: 'Stop Fictional pea soup · Soften the leek'}).click();
  await expect(timers.getByRole('listitem')).toHaveCount(1);
  await expect(view.getByRole('group', {name: 'Cook for'}).getByRole('button', {name: 'Half'})).toHaveAttribute('aria-pressed', 'true');
  await clean(page, view);
  // Motion Off: the view is still (only the numbers change).
  await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'off'); window.dispatchEvent(new Event('zigoals-motion')); });
  expect(await view.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  // #455: "Made it today" at the last step.
  await method.getByRole('button', {name: /^Step 4: /}).click();
  await view.getByRole('button', {name: 'Made it today'}).click();
  await expect(view.getByRole('button', {name: 'Made it today'})).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page, FOOD_PLUS_KEY)).made).toEqual({[SOUP]: [TODAY]});
  await view.getByRole('button', {name: 'Done cooking'}).click();
  await expect(view).toHaveCount(0);
  await expect(row).toContainText('Made today · once');
  await row.getByLabel('Your stars for Fictional pea soup').selectOption('4');
  expect((await stored(page, FOOD_PLUS_KEY)).stars).toEqual({[SOUP]: 4});
  const pie = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Fictional leek pie'})});
  await pie.getByLabel('Your stars for Fictional leek pie').selectOption('5');
  const recipes = page.locator('.health-library-row h3');
  await expect(recipes).toContainText(['Fictional pea soup', 'Fictional leek pie']);
  await page.getByLabel('Sort recipes').selectOption('stars');
  await expect(recipes).toContainText(['Fictional leek pie', 'Fictional pea soup']);
  await page.getByLabel('Sort recipes').selectOption('last-made');
  await expect(recipes).toContainText(['Fictional pea soup', 'Fictional leek pie']);
  await clean(page);
  await noSideways(page);
});

test('the grocery list puts “Use soon” first; a use-by day per item at home; a week kept as a menu and placed on the next, with Undo', async ({page, isMobile}) => {
  await page.clock.install({time: NOW});
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  let h = kitchen();
  h = planFromRecipe(h, SOUP, '2026-11-24', 'Dinner', AT, 'health_plan-x5-0001');
  h = planFromRecipe(h, PIE, '2026-11-26', 'Lunch', AT, 'health_plan-x5-0002');
  await seed(page, {[HEALTH_STORAGE_KEY]: JSON.stringify(h), [GROCERY_KEY]: JSON.stringify({version: 1, pantry: {'fictional yoghurt': AT, 'fictional spinach': AT}, useBy: {'fictional yoghurt': '2026-11-26', 'fictional spinach': '2026-11-23'}})});
  await page.goto('/app/health?view=planner'); await hydrated(page);
  const grocery = page.getByRole('region', {name: 'Grocery list'});
  const soon = grocery.getByRole('region', {name: 'Use soon'});
  await expect(soon.getByRole('listitem')).toHaveText(['Fictional yoghurt: use by tomorrow', 'Fictional spinach: past its use-by day, 2 days ago']);
  await grocery.getByText(/^Already at home \(2\)$/).click();
  const home = grocery.getByRole('form', {name: 'Add what you have at home'});
  await home.getByLabel('Item at home').fill('Fictional rice');
  await home.getByLabel('Use by (optional)').fill('2026-11-27');
  await home.getByRole('button', {name: 'Add'}).click();
  await expect(soon.getByRole('listitem')).toHaveText(['Fictional yoghurt: use by tomorrow', 'Fictional rice: use by Nov 27 (in 2 days)', 'Fictional spinach: past its use-by day, 2 days ago']);
  await grocery.getByLabel('Use by: Fictional spinach').fill('');
  await expect(soon.getByRole('listitem')).toHaveCount(2);
  expect((await stored(page, GROCERY_KEY)).useBy).toEqual({'fictional yoghurt': '2026-11-26', 'fictional rice': '2026-11-27'});
  await clean(page, grocery);
  // #454: keep this week as a menu, then place it on the next week.
  await page.getByText('Menus: keep a week of meals, place it on another week').click();
  const keep = page.getByRole('form', {name: 'Keep this week as a menu'});
  await keep.getByLabel('Menu name').fill('Fictional soup week');
  await keep.getByRole('button', {name: 'Keep this week as a menu'}).click();
  const menus = page.getByRole('list', {name: 'Your menus'});
  await expect(menus.getByRole('listitem')).toContainText(['Fictional soup week 2 meals on 2 days']);
  await clean(page, page.locator('#health-menus'));
  await page.getByRole('button', {name: 'Next week'}).click();
  await menus.getByRole('button', {name: /^Place Fictional soup week on the week of Mon 30$/}).click();
  await expect(page.getByRole('status').filter({hasText: '“Fictional soup week” placed on the week of Mon 30: 2 meals planned.'}).first()).toBeVisible();
  const plans = async () => ((await stored(page, HEALTH_STORAGE_KEY)).daily.plans as {date: string; meal: string; loggedAt?: string}[]).map(p => [p.date, p.meal, p.loggedAt ?? null]);
  expect(await plans()).toEqual([['2026-11-24', 'Dinner', null], ['2026-11-26', 'Lunch', null], ['2026-12-01', 'Dinner', null], ['2026-12-03', 'Lunch', null]]);
  await page.locator('#health-menus').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(plans).toEqual([['2026-11-24', 'Dinner', null], ['2026-11-26', 'Lunch', null]]);
  await noSideways(page);
});

test('a Paprika export and a Markdown recipe: planned first, checked line by line, saved with its method and stars, and undone', async ({page, isMobile}) => {
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seed(page, {});
  const at = new Date('2026-11-20T08:00:00Z');
  const one = (r: Record<string, unknown>) => new Uint8Array(gzipSync(Buffer.from(JSON.stringify(r))));
  const zip = buildStoredZip([
    {name: 'Fictional lasagne.paprikarecipe', data: one({name: 'Fictional lasagne', servings: '4 servings', rating: 5, ingredients: '500 g fictional mince\nFor the sauce:\n2 tbsp fictional oil', directions: '1. Brown the mince for 10 minutes.\n2. Bake 40-45 min.', photo_data: 'aGVsbG8='}), modified: at},
    {name: 'Fictional soup.paprikarecipe', data: one({name: 'Fictional tomato soup', servings: 'Serves 2', ingredients: '400 g fictional tomatoes', directions: 'Simmer for 20 minutes.'}), modified: at},
  ]);
  await page.goto('/app/health?view=import'); await hydrated(page);
  await page.getByRole('button', {name: 'A recipe file'}).click();
  await page.getByLabel(/^Recipe file/).setInputFiles({name: 'Fictional.paprikarecipes', mimeType: 'application/octet-stream', buffer: Buffer.from(zip)});
  const file = page.getByRole('list', {name: 'Recipes in Fictional.paprikarecipes'});
  await expect(file.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('status').filter({hasText: 'Fictional.paprikarecipes: 2 recipes; 1 photo left out.'})).toBeVisible();
  await expect(file.getByRole('listitem').first()).toContainText('Fictional lasagne 2 ingredients · 2 steps · 5 stars');
  await clean(page);
  await file.getByRole('button', {name: 'Check and save Fictional lasagne'}).click();
  const confirm = page.getByRole('form', {name: 'Confirm the recipe'});
  await expect(confirm.getByLabel('Recipe name')).toHaveValue('Fictional lasagne');
  await expect(confirm.getByLabel('Servings')).toHaveValue('4');
  await expect(confirm.getByLabel('Ingredient 1 name')).toHaveValue('fictional mince');
  await expect(confirm.getByLabel('Ingredient 2 name')).toHaveValue('fictional oil');
  await expect(confirm.getByLabel('Ingredient 3 name')).toHaveCount(0);
  await expect(confirm).toContainText('2 steps kept for the cooking view');
  await confirm.getByRole('button', {name: 'Drop ingredient 2'}).click();
  await confirm.getByRole('button', {name: 'Save recipe'}).click();
  await expect(file.getByRole('listitem').first()).toContainText('Saved');
  const health = async () => (await stored(page, HEALTH_STORAGE_KEY)) as {recipes: {id: string; name: string}[]; foods: {name: string}[]};
  await expect.poll(async () => (await health()).recipes.map(r => r.name)).toEqual(['Fictional lasagne']);
  const id = (await health()).recipes[0]!.id, food = await stored(page, FOOD_PLUS_KEY);
  expect(food.steps[id]).toEqual(['Brown the mince for 10 minutes.', 'Bake 40-45 min.']);
  expect(food.stars[id]).toBe(5);
  await page.getByRole('button', {name: 'Undo this import'}).click();
  await expect.poll(async () => (await health()).recipes.length).toBe(0);
  expect((await health()).foods).toEqual([]); // the foods it added go with it
  await expect(file.getByRole('button', {name: 'Check and save Fictional lasagne'})).toBeVisible();
  // A Markdown recipe goes straight to its check.
  await page.getByLabel(/^Recipe file/).setInputFiles({name: 'pancakes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Fictional pancakes\n\nServes 2\n\n## Ingredients\n\n- 200 g fictional flour\n- **2** fictional eggs\n\n## Method\n\n1. Whisk for 1 minute.\n')});
  await expect(confirm.getByLabel('Recipe name')).toHaveValue('Fictional pancakes');
  await expect(confirm.getByLabel('Ingredient 2 name')).toHaveValue('fictional eggs');
  await clean(page);
  await noSideways(page);
});
