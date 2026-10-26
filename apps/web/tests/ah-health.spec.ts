import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

// Session AH Part 6 (C11, HE5, C9): Health on a new device. Fictional data only.
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<{foods: {name: string; servingGrams: number | null}[]; diary: {meal: string; snapshot: {name: string; nutrients: {kcal: number | null}}}[]} | null>;
/** On a phone the meal form opens in a sheet. */
async function openMealForm(page: Page) {
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
}

test('C11: a food that is not in the library is logged in one step, and saved for next time', async ({page}) => {
  await page.goto('/app/health'); await hydrated(page);
  await openMealForm(page);
  await page.getByText('Quick add a food that is not in your library', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Quick add a food'});
  await form.getByLabel('Food name').fill('Fictional street taco');
  await form.getByLabel('Calories (kcal)').fill('230');
  await form.getByLabel('Portion weight (g)').fill('120');
  await form.getByLabel('Meal').selectOption('Lunch');
  await form.getByLabel('Protein (g, optional)').fill('11');
  await form.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByRole('region', {name: 'Lunch diary'})).toContainText('Fictional street taco');
  const health = await stored(page);
  expect(health!.foods.map(f => [f.name, f.servingGrams])).toEqual([['Fictional street taco', 120]]);
  expect(health!.diary.map(e => [e.meal, e.snapshot.name, e.snapshot.nutrients.kcal])).toEqual([['Lunch', 'Fictional street taco', 230]]);
});

test('HE5: an impossible label is refused with the reason, and nothing is saved', async ({page}) => {
  await page.goto('/app/health'); await hydrated(page);
  await openMealForm(page);
  await page.getByText('Quick add a food that is not in your library', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Quick add a food'});
  await form.getByLabel('Food name').fill('Fictional impossible bar');
  await form.getByLabel('Calories (kcal)').fill('5000');
  await form.getByLabel('Portion weight (g)').fill('100');
  await form.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'more than pure fat holds (900 kcal per 100 g)'}).first()).toBeVisible();
  expect((await stored(page))?.diary ?? []).toEqual([]);
});

test('HE5: "Log water" goes to the water journal', async ({page}) => {
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('button', {name: 'Log water', exact: true}).first().click();
  await expect(page.getByRole('region', {name: 'Water journal'})).toBeInViewport();
});

test('C9: every Health view answers to ?tab=', async ({page}) => {
  await page.goto('/app/health?tab=workouts'); await hydrated(page);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Train with a plan.');
  await page.goto('/app/health?tab=planner'); await hydrated(page);
  await expect(page.getByRole('button', {name: 'Planner', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('HE7: each wrong custom fasting target says what is wrong, and nothing starts', async ({page}) => {
  await page.goto('/app/health'); await hydrated(page);
  const timer = page.getByRole('region', {name: 'Fasting timer', exact: true});
  // On a phone the module is folded until a fast runs.
  const fold = page.locator('.phone-fold-toggle').filter({hasText: 'Fasting timer'}).first();
  await expect(timer.or(fold).first()).toBeVisible();
  if (!await timer.isVisible()) await fold.click();
  await timer.getByRole('button', {name: 'Custom', exact: true}).click();
  const target = timer.getByLabel(/^Target hours/), start = timer.getByRole('button', {name: 'Start fast', exact: true});
  for (const [typed, said] of [['', 'Enter a target in whole hours.'], ['16.5', 'Enter whole hours, like 16.'], ['30', 'Choose a target from 1 to 18 hours.']] as const) {
    await target.fill(typed); await start.click();
    await expect(timer.getByRole('alert')).toHaveText(said);
  }
  await expect(timer.getByRole('button', {name: 'Stop fast'})).toHaveCount(0);
});
