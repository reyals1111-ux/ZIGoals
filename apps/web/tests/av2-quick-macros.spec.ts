import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

/**
 * Session AV lane 2 (food, LEDGER #86; q3 #3 check 8): "Just the calories" takes optional protein, carbs and fat
 * (MyFitnessPal, MacroFactor), and a meal's ⋯ menu in the Diary saves that meal ("Save this meal") — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, by keyboard, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
type Stored = {foods: unknown[]; diary: {meal: string; snapshot: {name: string; nutrients: {kcal: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null}}}[]; daily?: {savedMeals: {name: string; items: unknown[]}[]}} | null;
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<Stored>;
for (const theme of THEMES) test(`${theme}: 520 kcal with protein and carbs for lunch, then saved as a meal from its menu`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  const macros = form.getByRole('group', {name: 'Protein, carbs and fat (optional)'});
  await form.getByLabel('Calories (kcal)').fill('520');
  await form.getByLabel('Meal').selectOption('Lunch');
  await form.getByLabel('What was it? (optional)').fill('Fictional noodle bowl');
  await macros.getByLabel('Fat (g)').fill('2000');
  await form.getByRole('button', {name: 'Log calories'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Enter 0 to 1,000 g fat.'}).first()).toBeVisible();
  await macros.getByLabel('Fat (g)').fill('');
  await macros.getByLabel('Protein (g)').fill('32');
  await macros.getByLabel('Carbs (g)').fill('41.5');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Log calories'}).click();
  const lunch = page.getByRole('region', {name: 'Lunch diary'});
  await expect(lunch).toContainText('Fictional noodle bowl');
  await expect(lunch).toContainText('Quick add');
  await expect(lunch).toContainText('520 kcal · P 32 g · C 41.5 g · F not given');
  await expect(lunch).not.toContainText(/Unknown g/);
  const health = await stored(page);
  expect(health!.foods).toEqual([]);
  expect(health!.diary.map(e => [e.meal, e.snapshot.nutrients.kcal, e.snapshot.nutrients.proteinMg, e.snapshot.nutrients.carbsMg, e.snapshot.nutrients.fatMg])).toEqual([['Lunch', 520, 32_000, 41_500, null]]);
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');

  // "Save this meal" from Lunch's ⋯ menu, by keyboard.
  const options = lunch.getByRole('button', {name: /^Options for Lunch/});
  await options.focus();
  await page.keyboard.press('Enter');
  const item = page.getByRole('menuitem', {name: 'Save this meal'});
  await expect(item).toBeVisible();
  await item.press('Enter');
  const save = page.getByRole('form', {name: 'Save Lunch as a meal'});
  const name = save.getByLabel('Name for this saved meal');
  await expect(name).toBeFocused();
  expect(await axe(page, save).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);
  await name.fill('Fictional work lunch');
  await save.getByRole('button', {name: 'Save meal'}).click();
  await expect(page.getByText('“Fictional work lunch” saved: 1 item.').first()).toBeVisible();
  await expect(save).toHaveCount(0);
  await expect(options).toBeFocused();
  const after = await stored(page);
  expect(JSON.stringify(after)).toContain('Fictional work lunch');
  // An empty meal offers nothing to save.
  await page.getByRole('region', {name: 'Dinner diary'}).getByRole('button', {name: /^Options for Dinner/}).click();
  await expect(page.getByRole('menuitem', {name: 'Save this meal'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
