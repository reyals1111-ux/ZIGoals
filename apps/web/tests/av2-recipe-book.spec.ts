import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #91, #200; MyFitnessPal's Plan tab, Yazio's recipes and cooking mode): Health → Foods &
 * recipes → "Recipes to start from": the vegan ones, in Dutch; "Linzen-tomatensoep" saved to my recipes with its
 * nutrition from the offline library; then "Cook" shows the ingredients and the method a step at a time (Next by the
 * arrow key too), and "Done cooking" brings the focus back. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. The library is the app's own offline data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: a built-in recipe saved in Dutch and cooked step by step`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=foods'); await hydrated(page);
  await page.getByText('Recipes to start from (English and Dutch)', {exact: true}).click();
  const list = page.getByRole('list', {name: 'Recipes to start from'});
  await expect(list.getByRole('listitem').filter({has: page.getByRole('heading', {level: 3})})).toHaveCount(20, {timeout: 20_000});
  await page.getByLabel('Style').selectOption('vegan');
  await page.getByLabel('Nederlands').check();
  await expect(list).toHaveAttribute('lang', 'nl');
  const soup = list.getByRole('listitem').filter({has: page.getByRole('heading', {name: 'Linzen-tomatensoep'})});
  await expect(soup).toContainText(/Per portie: \d+\+? kcal · P \d+\+? g/);
  await expect(list.getByRole('heading', {name: 'Omelet met spinazie en feta'})).toHaveCount(0);
  const findings = await axe(page, list);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await soup.getByRole('button', {name: 'Save Linzen-tomatensoep to my recipes'}).click();
  await expect(page.getByRole('status').filter({hasText: '“Linzen-tomatensoep” saved to your recipes'}).first()).toBeVisible();
  await expect(soup.getByRole('button', {name: 'Linzen-tomatensoep is in your recipes'})).toHaveAttribute('aria-disabled', 'true');

  const row = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Linzen-tomatensoep'})});
  const cook = row.getByRole('button', {name: 'Cook Linzen-tomatensoep, step by step'});
  await expect(cook).toHaveText('Cook (4 steps)');
  await cook.click();
  const view = page.getByRole('region', {name: 'Cooking: Linzen-tomatensoep'});
  await expect(view.getByRole('heading', {name: 'Cooking: Linzen-tomatensoep'})).toBeFocused();
  await expect(view).toContainText('Gather these first');
  await view.getByRole('button', {name: 'Start cooking'}).click();
  await expect(view.locator('.food-plus-cook-step')).toContainText('Snipper de ui');
  await page.keyboard.press('ArrowRight');
  await expect(view.locator('.food-plus-cook-step')).toContainText('Voeg de tomaten');
  await expect(view).toContainText('Step 2 of 4');
  expect(await axe(page, view).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);
  await view.getByRole('button', {name: 'Next step'}).click();
  await view.getByRole('button', {name: 'Next step'}).click();
  const done = view.getByRole('button', {name: 'Done cooking'});
  await expect(done).toBeFocused();
  await done.click();
  await expect(view).toHaveCount(0);
  await expect(cook).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
