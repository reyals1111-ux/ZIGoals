import {expect, test, type Locator, type Page} from '@playwright/test';
import {openMealLog} from './phone-nav';

// Session I, Part 9: on a phone the habit editor, Log a meal, and Staking's wallet reader and reward scenario open as
// bottom sheets (the #52 pattern). Desktop keeps them in the page.
async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'fixture offline'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
/** A sheet rests on the bottom edge, inside the screen, with phone-sized inputs and targets. */
async function isBottomSheet(sheet: Locator, page: Page) {
  await sheet.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => undefined))));
  const box = (await sheet.boundingBox())!, viewport = page.viewportSize()!;
  expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(2);
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.width).toBeLessThanOrEqual(viewport.width);
  for (const field of await sheet.locator('input:not([type=checkbox]):not([type=radio]), select, textarea').all()) if (await field.isVisible()) expect(parseFloat(await field.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  for (const button of await sheet.locator('button').all()) if (await button.isVisible()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test('phone: the habit editor is a bottom sheet; Escape and Close return focus, and Create closes it on the new habit', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone sheets; desktop is covered below.');
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/habits');
  const add = page.getByRole('button', {name: '+ New habit', exact: true});
  await add.click();
  const sheet = page.getByRole('dialog', {name: 'Create a habit'});
  await expect(sheet).toBeVisible();
  await isBottomSheet(sheet, page);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await sheet.getByLabel('Habit title', {exact: true}).fill('Fictional stretch');
  await sheet.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  const card = page.getByRole('article', {name: 'Fictional stretch', exact: true});
  await expect(card).toBeVisible();
  await expect(card).toBeFocused();
  await card.getByRole('button', {name: 'Edit Fictional stretch', exact: true}).click();
  const edit = page.getByRole('dialog', {name: 'Edit habit'});
  await expect(edit).toBeVisible();
  await edit.getByRole('button', {name: 'Close Edit habit', exact: true}).click();
  await expect(edit).toHaveCount(0);
});

test('phone: Log a meal opens from its button as a sheet and closes on a logged meal', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone sheets; desktop is covered below.');
  await showcase(page);
  await page.goto('/app/health');
  await expect(page.getByRole('form', {name: 'Log a meal'})).toHaveCount(0);
  const sheet = (await openMealLog(page))!;
  await isBottomSheet(sheet, page);
  const form = sheet.getByRole('form', {name: 'Log a meal'});
  await form.getByLabel('Food or recipe').selectOption({index: 1});
  await form.getByRole('button', {name: 'Log to diary', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'Meal logged.'})).toBeVisible();
});

test('phone: Staking opens the wallet reader and the reward scenario as sheets', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone sheets; desktop is covered below.');
  await showcase(page);
  await page.goto('/app/staking');
  const wallet = page.locator('.positions-wallet > summary');
  await wallet.click();
  const sheet = page.getByRole('dialog', {name: 'Track Wallet'});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Public ZIG address')).toBeVisible();
  await isBottomSheet(sheet, page);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(wallet).toBeFocused();
  await page.locator('.positions-scenario > summary').click();
  const scenario = page.getByRole('dialog', {name: 'Staking reward scenario'});
  await expect(scenario.getByLabel('Net APR assumption %')).toBeVisible();
  await isBottomSheet(scenario, page);
});

test('desktop: the forms stay in the page, no sheet opens', async ({page, isMobile}) => {
  test.skip(!!isMobile, 'Desktop layout only.');
  await showcase(page);
  await page.goto('/app/health');
  await expect(page.getByRole('form', {name: 'Log a meal'})).toBeVisible();
  await expect(page.locator('.phone-form-trigger')).toHaveCount(0);
  await page.goto('/app/staking');
  await page.locator('.positions-wallet > summary').click();
  await expect(page.locator('.positions-wallet')).toHaveAttribute('open', '');
  await expect(page.locator('.positions-wallet').getByLabel('Public ZIG address')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await expect(page.locator('.habit-editor')).toBeVisible();
  await expect(page.locator('dialog .habit-editor')).toHaveCount(0);
});
