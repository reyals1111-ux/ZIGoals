import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_COACH_KEY, MACRO_MODE_KEY, MICRO_TARGETS_KEY, MEASUREMENTS_CUSTOM_KEY} from '../lib/aa-device-keys';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AA-Local Part 3 (N1–N12 without the photo plate): the weight trend and the energy estimate from six weeks of
 * fictional readings and logs, the coach check-in's Keep and Adjust (the target written only on Adjust), micronutrient
 * targets edited on the device, the macro modes as a view, the planner's week grid with a recipe planned, logged in one
 * tap and its grocery list by aisle, a pasted recipe imported into foods and a recipe, a custom measurement, the sleep
 * score and the water ring, and the insight cards. Fictional data; the clock is fixed.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07';
const stamp = (d: string, t = '08:00') => `${d}T${t}:00.000Z`;
function health(): HealthData {
  const h = createEmptyHealth();
  h.targets = {kcal: 2200, proteinMg: 120000, carbsMg: 260000, fatMg: 73000, weightGrams: 70000, steps: 8000};
  h.foods.push({id: 'health_food-0001', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: {kcal: 1100, proteinMg: 60000, carbsMg: 120000, fatMg: 40000, fiberMg: 9000, ironMg: 4}, createdAt: stamp('2026-08-01'), updatedAt: stamp('2026-08-01')});
  h.foods.push({id: 'health_food-0002', name: 'Fictional lentils', brand: '', servingGrams: 100, nutrients: {kcal: 350, proteinMg: 25000, carbsMg: 60000, fatMg: 1000, fiberMg: 11000, ironMg: 7}, createdAt: stamp('2026-08-01'), updatedAt: stamp('2026-08-01')});
  h.recipes.push({id: 'health_recipe-0001', name: 'Fictional lentil soup', portionsMilli: 4000, ingredients: [{foodId: 'health_food-0002', quantityMilli: 2000, snapshot: {name: 'Fictional lentils', servingGrams: 100, nutrients: {kcal: 350, proteinMg: 25000, carbsMg: 60000, fatMg: 1000, fiberMg: 11000, ironMg: 7}}}], createdAt: stamp('2026-08-02'), updatedAt: stamp('2026-08-02')} as HealthData['recipes'][number]);
  for (let i = 0; i < 42; i++) { const d = addLocalDays(TODAY, -i); for (const [k, meal, t] of [['a', 'Lunch', '12:00'], ['b', 'Dinner', '19:00']] as const) h.diary.push({id: `health_diary-${String(i).padStart(3, '0')}${k}`, sourceId: 'health_food-0001', sourceKind: 'food', snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: {kcal: 1100, proteinMg: 60000, carbsMg: 120000, fatMg: 40000, fiberMg: 9000, ironMg: 4}}, date: d, meal, quantityMilli: 1000, createdAt: stamp(d, t), updatedAt: stamp(d, t)}); if (i % 2 === 0) h.weights.push({id: `health_weight-${String(i).padStart(3, '0')}`, date: d, grams: 72000 + i * 60, createdAt: stamp(d), updatedAt: stamp(d)}); }
  h.daily = {version: 1, favorites: [], savedMeals: [], plans: [], water: [{id: 'health_water-0001', date: TODAY, amountMilli: 500000, unit: 'ml', createdAt: stamp(TODAY), updatedAt: stamp(TODAY)}], waterOperations: [], copyOperations: [], preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: 2000, weightUnit: 'kg'}, groceryNotes: ''};
  return healthSchema.parse({...h, schemaVersion: 4});
}
async function seed(page: Page) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.request().url().includes('/api/recipe-import') ? route.fulfill({status: 400, json: {error: 'PRIVATE_HOST'}}) : route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HEALTH_STORAGE_KEY]: JSON.stringify(health()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const view = (page: Page, name: string) => page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name, exact: true}).click();

test('N1–N3: the trend, the energy estimate and the coach show from six weeks of logs; Keep records, Adjust writes the target', async ({page}) => {
  await seed(page); await page.goto('/app/health');
  const trend = page.getByRole('region', {name: 'Weight trend'});
  await expect(trend.getByText(/trend today · .*\/week/)).toBeVisible();
  await expect(trend.getByRole('img', {name: /^Trend 7\d\.\d kg, [−-]0\.\d kg a week, goal 70 kg; 21 readings in 42 days\.$/})).toBeVisible();
  const energy = page.getByRole('region', {name: 'Energy estimate'});
  await expect(energy.getByText(/kcal a day, about \d+–\d+/)).toBeVisible();
  await expect(energy.getByText('an estimate, not medical advice').first()).toBeVisible();
  const coach = page.getByRole('region', {name: 'Your coach'});
  await expect(coach.getByText(/^This week: −0\.\d kg\/week\.$/)).toBeVisible();
  await coach.getByRole('button', {name: 'Keep my target', exact: true}).click();
  await expect(coach.getByText('You kept your target this week.')).toBeVisible();
  await expect.poll(() => stored(page, HEALTH_COACH_KEY)).toMatchObject({version: 1, answers: {'2026-10-05': {answer: 'keep'}}});
  expect((await stored(page, HEALTH_STORAGE_KEY) as HealthData).targets.kcal).toBe(2200);
  await page.evaluate(k => localStorage.removeItem(k), HEALTH_COACH_KEY); await page.reload();
  const adjust = page.getByRole('region', {name: 'Your coach'}).getByRole('button', {name: /^Adjust to \d+ kcal$/});
  const kcal = Number(/\d+/.exec((await adjust.textContent()) ?? '')?.[0]);
  await adjust.click();
  await expect(page.getByRole('region', {name: 'Your coach'}).getByText('You adjusted your target this week.')).toBeVisible();
  await expect.poll(async () => ((await stored(page, HEALTH_STORAGE_KEY)) as HealthData).targets.kcal).toBe(kcal);
});

test('N4, N7: a micronutrient target edited on the device; unknown stays unknown; the macro mode is a view only', async ({page}) => {
  await seed(page); await page.goto('/app/health'); await view(page, 'Targets');
  const micro = page.getByRole('region', {name: 'Micronutrients'});
  await expect(micro.getByRole('progressbar', {name: /Iron: 8 of 18 mg/})).toBeVisible();
  await expect(micro.getByRole('progressbar', {name: /Calcium: unknown/})).toBeVisible();
  await micro.getByRole('button', {name: 'Edit Iron target'}).click();
  await micro.getByRole('textbox', {name: 'Iron target in mg'}).fill('12');
  await micro.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(micro.getByRole('progressbar', {name: /Iron: 8 of 12 mg/})).toBeVisible();
  await expect.poll(() => stored(page, MICRO_TARGETS_KEY)).toMatchObject({targets: {ironMg: 12}});
  await micro.getByRole('button', {name: 'Iron', exact: true}).click();
  await expect(micro.getByText('Fictional lentils')).toBeVisible();
  const macro = page.getByRole('region', {name: 'Macro mode'});
  await macro.getByRole('button', {name: 'Net carbs', exact: true}).click();
  await expect(macro.getByText(/Net carbs today: 222 g/)).toBeVisible();
  await expect.poll(() => stored(page, MACRO_MODE_KEY)).toMatchObject({mode: 'net-carbs'});
  expect((await stored(page, HEALTH_STORAGE_KEY) as HealthData).targets.carbsMg).toBe(260000);
});

test('N5: a recipe planned into the week grid, its grocery list by aisle with check-off, and one tap logs it', async ({page}) => {
  await seed(page); await page.goto('/app/health'); await view(page, 'Planner');
  const planner = page.getByRole('region', {name: 'Meal planner'});
  await planner.getByRole('button', {name: 'Plan Dinner on Wed 7'}).click();
  const form = planner.getByRole('form', {name: 'Plan Dinner on Wed 7'});
  await form.locator('select').nth(1).selectOption('health_recipe-0001'); // the second select: the recipe (the first picks recipe or food)
  await form.getByRole('button', {name: 'Plan', exact: true}).click();
  await expect(planner.locator('strong', {hasText: 'Fictional lentil soup'})).toBeVisible(); // the planned row's title, not the chooser's option
  const grocery = page.getByRole('region', {name: 'Grocery list'});
  await expect(grocery.getByRole('heading', {name: /Pantry/})).toBeVisible();
  await grocery.getByRole('checkbox', {name: 'Bought Fictional lentils'}).click(); // the box follows the saved record (a controlled input), so the tick lands after the write
  await expect(grocery.getByRole('checkbox', {name: 'Bought Fictional lentils'})).toBeChecked();
  await expect(grocery.getByText('1 of 1 bought')).toBeVisible();
  await grocery.getByLabel('Aisle for Fictional lentils').selectOption('Produce');
  await expect(grocery.getByRole('heading', {name: /Produce/})).toBeVisible();
  await planner.getByRole('button', {name: 'Log Fictional lentil soup for Dinner on Wed 7'}).click();
  await expect(planner.getByText('Fictional lentil soup · logged')).toBeVisible();
  const data = await stored(page, HEALTH_STORAGE_KEY) as HealthData;
  expect(data.diary.filter(d => d.date === TODAY && d.meal === 'Dinner' && d.snapshot.name === 'Fictional lentil soup')).toHaveLength(1);
  expect(data.daily!.plans[0]!.loggedAt).toBeTruthy();
});

test('N6: pasted recipe text becomes confirmable rows, then foods and a recipe; the URL import refuses a private address with the reason', async ({page}) => {
  await seed(page); await page.goto('/app/health'); await view(page, 'Import');
  const panel = page.getByRole('region', {name: 'Import a recipe'});
  await panel.getByLabel('Recipe text').fill('Fictional chickpea stew\nServes 3\n\nIngredients\n400 g chickpeas\n1 onion, chopped\n2 tbsp olive oil\n100 g Fictional lentils\n\nMethod\n1. Cook.');
  await panel.getByRole('button', {name: 'Read the ingredients', exact: true}).click();
  await expect(panel.getByText('4 ingredients found, 1 steps left aside.')).toBeVisible();
  await expect(panel.getByRole('textbox', {name: 'Ingredient 1 name'})).toHaveValue('chickpeas');
  await expect(panel.getByRole('textbox', {name: 'Ingredient 4 grams'})).toHaveValue('100');
  await panel.getByRole('button', {name: 'Drop ingredient 2'}).click();
  await panel.getByRole('button', {name: 'Save recipe', exact: true}).click();
  await expect(page.getByText(/Recipe "Fictional chickpea stew" saved with 3 ingredients/)).toBeVisible();
  const data = await stored(page, HEALTH_STORAGE_KEY) as HealthData;
  expect(data.recipes.find(r => r.name === 'Fictional chickpea stew')!.ingredients).toHaveLength(3);
  expect(data.foods.map(f => f.name)).toEqual(expect.arrayContaining(['chickpeas', 'olive oil'])); expect(data.foods.filter(f => f.name === 'Fictional lentils')).toHaveLength(1);
  expect(data.foods.find(f => f.name === 'chickpeas')!.nutrients.kcal).toBeNull();
  await view(page, 'Import');
  await page.getByRole('button', {name: 'A web address', exact: true}).click();
  await page.getByLabel('Address (https)').fill('https://10.0.0.1/soup');
  await page.getByRole('button', {name: 'Read the page', exact: true}).click();
  await expect(page.getByText('That address is not a public website.')).toBeVisible();
});

test('N9–N12: a custom measurement, the sleep score, the water ring and the insight cards', async ({page}) => {
  await seed(page); await page.goto('/app/health');
  const water = page.getByRole('region', {name: /A sip at a time/});
  await expect(water.getByRole('img', {name: '500 mL of 2,000 mL today'})).toBeVisible();
  await water.getByRole('button', {name: '+ 250 mL', exact: true}).click();
  await expect(water.getByRole('img', {name: '750 mL of 2,000 mL today'})).toBeVisible();
  await view(page, 'Insights');
  await expect(page.getByRole('heading', {name: 'Best-protein days'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Weekdays and weekends'})).toBeVisible();
  await view(page, 'Measurements');
  await page.getByLabel('Add any measurement').fill('Neck');
  await page.getByRole('form', {name: 'Add a measurement kind'}).getByRole('button', {name: 'Add', exact: true}).click();
  await page.getByLabel('Your own measurement').selectOption('neck');
  await page.getByRole('form', {name: 'Add a reading'}).getByLabel('Value').fill('38.5');
  await page.getByRole('button', {name: 'Add reading', exact: true}).click();
  await expect.poll(() => stored(page, MEASUREMENTS_CUSTOM_KEY)).toMatchObject({kinds: [{id: 'neck', label: 'Neck', unit: 'cm'}], readings: [{kind: 'neck', valueMilli: 38500}]});
  await expect(page.getByRole('heading', {name: /Neck/})).toBeVisible();
  await page.goto('/app/health?view=sleep');
  await expect(page.getByRole('region', {name: 'Sleep score'}).getByText('Three logged nights of the last seven make a score; 0 so far.')).toBeVisible();
});
