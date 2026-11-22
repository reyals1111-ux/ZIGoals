import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #89; MyFitnessPal's Meal Planner): with a 2,000 kcal target and three recipes saved from
 * "Recipes to start from", Health → Planner → "Plan a day that fits my targets" shows breakfast, lunch and dinner with
 * servings and the day's total against the target; "Another plan" and "Plan this day" (plans only, nothing logged).
 * The empty state teaches first. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
for (const theme of THEMES) test(`${theme}: a day from my recipes that fits 2,000 kcal`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=planner'); await hydrated(page);
  await page.getByText('Plan a day that fits my targets', {exact: true}).click();
  await expect(page.getByText('Set a calorie target in Targets first')).toBeVisible();
  await page.goto('/app/health?view=targets'); await hydrated(page);
  const targets = page.getByRole('form', {name: 'Personal targets'});
  await targets.getByLabel('Calorie target (kcal)').fill('2000');
  await targets.getByRole('button', {name: 'Save targets'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Targets saved'}).first()).toBeVisible();
  await page.goto('/app/health?view=foods'); await hydrated(page);
  await page.getByText('Recipes to start from (English and Dutch)', {exact: true}).click();
  await page.getByLabel('English').check();
  for (const name of ['Overnight oats with blueberries', 'Chickpea salad with feta', 'Salmon with potatoes and broccoli']) {
    await page.getByRole('button', {name: `Save ${name} to my recipes`}).click({timeout: 20_000});
    await expect(page.getByRole('button', {name: `${name} is in your recipes`})).toBeVisible();
  }
  await page.goto('/app/health?view=planner'); await hydrated(page);
  await page.getByText('Plan a day that fits my targets', {exact: true}).click();
  const plan = page.getByRole('region', {name: /^Plan 1 of \d for /});
  await expect(plan.getByRole('row', {name: /^Breakfast Overnight oats with blueberries/})).toBeVisible();
  await expect(plan.getByRole('row', {name: /^Dinner /})).toBeVisible();
  await expect(plan.getByRole('row', {name: /^Day /})).toContainText(/Within 5 % of your target|kcal (over|under) your target/);
  const findings = await axe(page, page.locator('.food-plus-card').filter({has: plan}));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.getByRole('button', {name: 'Plan this day'}).click();
  await expect(page.getByRole('status').filter({hasText: 'planned:'}).first()).toContainText('Log each when you eat it.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
