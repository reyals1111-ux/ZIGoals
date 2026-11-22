import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

/**
 * Session AV lane 2 (food, LEDGER #87, #95, #104; MyFitnessPal, Cronometer and MacroFactor's recipe importers): a pasted
 * recipe's ingredients that match none of your foods are matched to the offline food library; the first match is
 * chosen and named ("From the offline food library, check it: …"), another library food or "A new food" can be picked,
 * and Save makes the foods with the library's values per 100 g — at 390 and 1440 in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. The library is the app's own offline data; every /api call answers 503.
 */
const RECIPE = 'Fictional lentil soup\nServes 4\n\nIngredients\n200 g red lentils\n1 onion\n2 tbsp olive oil\n1 pinch of fictional dust';
for (const theme of THEMES) test(`${theme}: a pasted recipe's ingredients matched to the offline library`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=import'); await hydrated(page);
  const paste = page.getByRole('form', {name: 'Paste a recipe'});
  await paste.getByLabel('Recipe text').fill(RECIPE);
  await paste.getByRole('button', {name: 'Read the ingredients'}).click();
  const confirm = page.getByRole('form', {name: 'Confirm the recipe'});
  await expect(confirm.getByText(/From the offline food library, check it: Lentil/).first()).toBeVisible({timeout: 20_000});
  await expect(confirm.getByText(/From the offline food library, check it: Onion/).first()).toBeVisible({timeout: 20_000});
  // The made-up ingredient has no library match: a new food with its nutrition unknown.
  await expect(confirm.getByLabel('Food for ingredient 4')).toHaveValue('', {timeout: 20_000});
  await expect(confirm.getByLabel('Food for ingredient 1').locator('optgroup[label="From the offline food library"] option')).not.toHaveCount(0);
  const findings = await axe(page, confirm);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await confirm.getByRole('button', {name: 'Save recipe'}).click();
  await expect(page.getByRole('status').filter({hasText: 'from the offline food library'}).first()).toContainText(/saved with 4 ingredients, 3 from the offline food library/);
  const health = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HEALTH_STORAGE_KEY) as {foods: {name: string; brand: string; servingGrams: number; nutrients: {kcal: number | null}}[]};
  const lentil = health.foods.find(f => /^Lentil/i.test(f.name))!;
  expect(lentil.servingGrams).toBe(100);
  expect(lentil.nutrients.kcal).toBeGreaterThan(0);
  expect(health.foods.find(f => f.name === 'fictional dust')?.nutrients.kcal ?? null).toBeNull();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
