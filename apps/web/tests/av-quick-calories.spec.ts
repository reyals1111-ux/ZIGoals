import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

/**
 * Session AV, owner follow-up 1 (F-QUICK-KCAL; MyFitnessPal, MacroFactor): Health → Log a meal → "Just the calories":
 * a number and the meal, logged to the day without a food in the library, macros left unknown — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<{foods: unknown[]; diary: {meal: string; snapshot: {name: string; nutrients: {kcal: number | null; proteinMg: number | null}}}[]} | null>;
for (const theme of THEMES) test(`${theme}: 450 kcal for lunch, nothing added to the library`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  await form.getByLabel('Calories (kcal)').fill('0');
  await form.getByRole('button', {name: 'Log calories'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Enter 1 to 10,000 kcal.'}).first()).toBeVisible();
  await form.getByLabel('Calories (kcal)').fill('450');
  await form.getByLabel('Meal').selectOption('Lunch');
  await form.getByLabel('What was it? (optional)').fill('Fictional canteen lunch');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Log calories'}).click();
  await expect(page.getByRole('region', {name: 'Lunch diary'})).toContainText('Fictional canteen lunch');
  // q3 #18 (Minor): the entry reads "Calories only · 450 kcal · macros not given", never "Serving measure unknown" or "P Unknown g".
  await expect(page.getByRole('region', {name: 'Lunch diary'})).toContainText('Calories only');
  await expect(page.getByRole('region', {name: 'Lunch diary'})).toContainText('450 kcal · macros not given');
  await expect(page.getByRole('region', {name: 'Lunch diary'})).not.toContainText(/Serving measure unknown|Unknown g/);
  const health = await stored(page);
  expect(health!.foods).toEqual([]);
  expect(health!.diary.map(e => [e.meal, e.snapshot.name, e.snapshot.nutrients.kcal, e.snapshot.nutrients.proteinMg])).toEqual([['Lunch', 'Fictional canteen lunch', 450, null]]);
  await expect(form.getByLabel('Calories (kcal)')).toHaveValue('');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
