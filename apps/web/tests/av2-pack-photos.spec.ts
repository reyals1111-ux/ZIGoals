import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #103; MacroFactor's custom food from product photos): a library food gets a
 * front-of-pack photo kept on this device (IndexedDB), shown beside its name in the Foods list, then removed with the
 * focus kept in the row. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional
 * data; every /api call answers 503; the photo is an 8×8 fixture.
 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', 'base64');
for (const theme of THEMES) test(`${theme}: a package photo kept with a food and removed`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  // A library food from Quick add (it is saved to the library).
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Quick add a food that is not in your library', {exact: true}).click();
  const quick = page.getByRole('form', {name: 'Quick add a food'});
  await quick.getByLabel('Food name').fill('Fictional oat bar');
  await quick.getByLabel('Calories (kcal)').fill('190');
  await quick.getByLabel('Portion weight (g)').fill('40');
  await quick.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByRole('region', {name: /diary$/}).filter({hasText: 'Fictional oat bar'}).first()).toBeVisible();

  await page.goto('/app/health?view=foods'); await hydrated(page);
  await page.getByText('Package photos (optional)', {exact: true}).click();
  const card = page.locator('#package-photos');
  await expect(card.getByLabel('Package photo')).toBeDisabled();
  await card.getByLabel('Food', {exact: true}).selectOption({label: 'Fictional oat bar'});
  await card.getByLabel('Package photo').setInputFiles({name: 'pack.png', mimeType: 'image/png', buffer: PNG});
  await expect(card.getByRole('status')).toContainText('Package photo kept with Fictional oat bar on this device');
  const row = page.locator('.health-library-row').filter({hasText: 'Fictional oat bar'});
  await expect(row.getByRole('img', {name: 'Package photo of Fictional oat bar'})).toBeVisible();
  const findings = await axe(page, page.locator('.health-library-grid'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // It stays after a reload (IndexedDB), and nothing went to localStorage.
  await page.reload(); await hydrated(page);
  await expect(page.locator('.health-library-row').filter({hasText: 'Fictional oat bar'}).getByRole('img', {name: 'Package photo of Fictional oat bar'})).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /photo/i.test(k) && (localStorage.getItem(k) ?? '').includes('data:image')))).toBe(false);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const again = page.locator('.health-library-row').filter({hasText: 'Fictional oat bar'});
  await again.getByRole('button', {name: 'Remove the package photo of Fictional oat bar'}).click();
  await expect(again.getByRole('img')).toHaveCount(0);
  await expect(again.getByRole('button', {name: 'Edit food Fictional oat bar'})).toBeFocused();
});
