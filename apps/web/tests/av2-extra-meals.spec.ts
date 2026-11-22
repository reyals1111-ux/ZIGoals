import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {FOOD_PLUS_KEY} from '../lib/food-plus/schema';

/**
 * Session AV lane 2 (food, LEDGER #197; Lose It!'s own meals and snacks): a meal of the person's own is named in the
 * Diary's "Name your meals and set their times", gets its own Diary section (with a teaching empty state and its calorie
 * target), is offered in the meal choice, and its entries are stored as Snacks (the strict diary keeps its four meals)
 * with the extra meal kept in `zigoals:food-plus:v1`. Moving the entry to Snacks takes it out again; taking the meal off
 * returns focus to its name. 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data;
 * every /api call answers 503.
 */
type Stored = {diary: {id: string; meal: string; snapshot: {name: string}}[]} | null;
const health = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<Stored>;
const foodPlus = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), FOOD_PLUS_KEY) as Promise<{extraMeals?: {slots?: Record<string, unknown>; entries?: Record<string, string>}} | null>;
const serious = (findings: {impact?: string | null}[]) => findings.filter(v => v.impact === 'serious' || v.impact === 'critical');

for (const theme of THEMES) test(`${theme}: an afternoon snack of my own, logged to, moved to Snacks, then taken off`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);

  // Name the first extra meal.
  await page.locator('summary', {hasText: 'Name your meals and set their times'}).click();
  const row = page.getByRole('form', {name: 'Extra meal 1: name and time'});
  await expect(row).toBeVisible();
  await expect(row.getByLabel('Extra meal 1 name (blank for none)')).toHaveAttribute('placeholder', 'Afternoon snack');
  await row.getByLabel('Extra meal 1 usual time (optional)').fill('15:30');
  await row.getByRole('button', {name: 'Save extra meal 1'}).click();
  await expect(row.getByText('Give this meal a name first; its time and target belong to it.')).toBeVisible();
  await row.getByLabel('Extra meal 1 name (blank for none)').fill('Fictional afternoon snack');
  await row.getByLabel('Extra meal 1 calorie target (kcal, optional)').fill('200');
  await row.getByLabel('Extra meal 1 shows after').selectOption('Lunch');
  expect(serious(await axe(page, page.getByRole('region', {name: 'Meals of your own (up to two)'})))).toEqual([]);
  await row.getByRole('button', {name: 'Save extra meal 1'}).click();
  await expect(page.getByText('Fictional afternoon snack is in your Diary at 15:30, after Lunch. Its calorie target: 200 kcal.').first()).toBeVisible();
  await expect(page.getByRole('form', {name: 'Extra meal 1: name and time'}).getByRole('button', {name: 'Save extra meal 1'})).toBeFocused();

  // Its own section, after Lunch, with a teaching empty state and its target.
  const extra = page.getByRole('region', {name: 'Fictional afternoon snack diary'});
  await expect(extra.getByRole('heading', {level: 2})).toHaveText('Fictional afternoon snack · 15:30');
  await expect(extra).toContainText('Nothing logged yet. Choose Fictional afternoon snack as the meal when you log, or start here.');
  await expect(extra).toContainText('of 200 kcal');
  const order = await page.locator('.health-meal').evaluateAll(sections => sections.map(s => s.getAttribute('aria-label')));
  expect(order).toEqual(['Breakfast diary', 'Lunch diary', 'Fictional afternoon snack diary', 'Dinner diary', 'Snacks diary']);
  expect(serious(await axe(page, extra))).toEqual([]);

  // "Log to …" starts the form on that meal; log 150 kcal with Just the calories.
  await extra.getByRole('button', {name: 'Log to Fictional afternoon snack'}).click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  await expect(form.getByLabel('Meal')).toHaveValue('extra1');
  await expect(form.getByLabel('Meal').locator('option:checked')).toHaveText('Fictional afternoon snack · 15:30');
  await form.getByLabel('Calories (kcal)').fill('150');
  await form.getByLabel('What was it? (optional)').fill('Fictional rice cake');
  await form.getByRole('button', {name: 'Log calories'}).click();
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await expect(extra).toContainText('Fictional rice cake');
  await expect(extra).toContainText('150 kcal');
  await expect(page.getByRole('region', {name: 'Snacks diary'})).not.toContainText('Fictional rice cake');
  // Stored as Snacks for every older reader; the extra meal is this device's tag.
  const logged = await health(page);
  expect(logged!.diary.map(e => [e.meal, e.snapshot.name])).toEqual([['Snacks', 'Fictional rice cake']]);
  const id = logged!.diary[0]!.id;
  await expect.poll(async () => (await foodPlus(page))?.extraMeals?.entries).toEqual({[id]: 'extra1'});

  // Move it to Snacks with Edit: the tag goes, the entry shows in Snacks.
  await extra.getByRole('button', {name: 'Edit Fictional rice cake'}).click();
  const edit = page.getByRole('form', {name: 'Edit diary entry'});
  await expect(edit.getByLabel('Meal')).toHaveValue('extra1');
  await edit.getByLabel('Meal').selectOption('Snacks');
  await edit.getByRole('button', {name: 'Save entry'}).click();
  await expect(page.getByRole('region', {name: 'Snacks diary'})).toContainText('Fictional rice cake');
  await expect(extra).not.toContainText('Fictional rice cake');
  await expect.poll(async () => (await foodPlus(page))?.extraMeals?.entries).toBeUndefined();

  // Take it off: its section goes, focus lands on its name field.
  const again = page.getByRole('form', {name: 'Extra meal 1: name and time'});
  await again.getByRole('button', {name: 'Take Fictional afternoon snack off'}).click();
  await expect(page.getByText('Extra meal 1 is off. Its entries show in Snacks again.').first()).toBeVisible();
  await expect(extra).toHaveCount(0);
  await expect(page.getByRole('form', {name: 'Extra meal 1: name and time'}).getByLabel('Extra meal 1 name (blank for none)')).toBeFocused();
  expect((await foodPlus(page))?.extraMeals).toBeUndefined();

  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('a second extra meal before Breakfast’s neighbour, and the meal choice offers both in Diary order', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/health'); await hydrated(page);
  await page.locator('summary', {hasText: 'Name your meals and set their times'}).click();
  const second = page.getByRole('form', {name: 'Extra meal 2: name and time'});
  await second.getByLabel('Extra meal 2 name (blank for none)').fill('Fictional second breakfast');
  await second.getByLabel('Extra meal 2 shows after').selectOption('Breakfast');
  await second.getByRole('button', {name: 'Save extra meal 2'}).press('Enter');
  await expect(page.getByRole('region', {name: 'Fictional second breakfast diary'})).toBeVisible();
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const options = await page.getByRole('form', {name: 'Log just the calories'}).getByLabel('Meal').locator('option').allTextContents();
  expect(options).toEqual(['Breakfast', 'Fictional second breakfast', 'Lunch', 'Dinner', 'Snacks']);
  // Words alone go to the extra meal too (kept as Snacks words, with the extra meal as this device's tag).
  const words = page.getByRole('form', {name: 'Just describe it'}).first();
  await words.getByLabel('What did you eat?').fill('Fictional porridge with pear');
  await words.getByLabel('Meal').selectOption('extra2');
  await words.getByRole('button', {name: 'Log in words'}).click();
  await expect(words.getByRole('status')).toContainText('Logged in words for Fictional second breakfast');
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await expect(page.getByRole('region', {name: 'Fictional second breakfast diary'}).getByRole('list', {name: 'Fictional second breakfast in words'})).toContainText('Fictional porridge with pear');
  await expect(page.getByRole('region', {name: 'Snacks diary'})).not.toContainText('Fictional porridge with pear');
});
