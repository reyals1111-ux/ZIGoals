import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #198, #199; Lose It!'s diet plans that flag foods, Yazio's food ratings): Health → Foods
 * & recipes → "Eating style and food marks": choosing High protein marks "Fits high protein" on a food whose protein
 * gives a quarter of its calories, and "Show label levels" writes its fat and sugars per 100 g in words (never a
 * colour alone, never a Nutri-Score). At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: a food marked as fitting high protein, with its label levels`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Quick add a food that is not in your library', {exact: true}).click();
  const quick = page.getByRole('form', {name: 'Quick add a food'});
  await quick.getByLabel('Food name').fill('Fictional skyr');
  await quick.getByLabel('Calories (kcal)').fill('120');
  await quick.getByLabel('Portion weight (g)').fill('150');
  // Session AV lane 2 (the quick add names these fields “… (g, optional)”: their own names, exactly, deliberate)
  await quick.getByLabel('Protein (g, optional)', {exact: true}).fill('16');
  await quick.getByLabel('Fat (g, optional)', {exact: true}).fill('0.3');
  await quick.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByText('Fictional skyr logged and saved to your library.').first()).toBeVisible();

  await page.goto('/app/health?view=foods'); await hydrated(page);
  const row = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Fictional skyr'})});
  await expect(row).not.toContainText('Fits');
  await page.getByText('Eating style and food marks (optional)', {exact: true}).click();
  await page.getByLabel('Mark the foods that fit').selectOption('high-protein');
  await expect(page.getByText('Foods that fit high protein are marked in your list.')).toBeVisible();
  await expect(row).toContainText('Fits high protein');
  await page.getByLabel('Show label levels (fat, saturated fat, sugars, salt)').check();
  await expect(row).toContainText('Fat: low');
  await expect(row).not.toContainText(/Nutri-Score/);
  const findings = await axe(page, page.locator('.health-library-grid'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByLabel('Mark the foods that fit').selectOption('');
  await page.getByLabel('Show label levels (fat, saturated fat, sugars, salt)').uncheck();
  await expect(row).not.toContainText(/Fits|Fat: low/);
});
