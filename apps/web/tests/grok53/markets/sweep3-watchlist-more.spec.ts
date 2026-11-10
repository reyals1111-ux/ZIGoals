import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

/**
 * Session AL sweep 3 (lane SW3, C-TK-20 from L1): favourites past the synced 8 are kept on this device
 * (`zigoals:markets-watchlist-more:v1`) and shown with the others on Markets. Desktop 1280 × 800, fresh profile, every
 * /api request answered 503. Written, not run here.
 */
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-11-05T09:00:00Z')});
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

test('C-TK-20: a ninth favourite is added (on this device), counted, listed under Favourites and removed with Undo', async ({page}) => {
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  const rows = page.locator('table.market-table tbody tr');
  await expect(rows.nth(9)).toBeVisible();
  const names: string[] = [];
  for (let i = 0; i < 9; i++) {
    const row = rows.nth(i), name = (await row.locator('th strong').innerText()).trim();
    names.push(name);
    await row.getByRole('button', {name: `Add ${name} favourite`}).click();
    await expect(row.getByRole('button', {name: `Remove ${name} favourite`})).toBeVisible();
  }
  await expect(page.locator('.markets-intro-card strong')).toHaveText('9 of 50');
  await expect(page.locator('.markets-intro-card')).toContainText('1 past the first 8 kept on this device');
  const extra = JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:markets-watchlist-more:v1')))!);
  expect(extra.version).toBe(1);
  expect(extra.items.map((i: {name: string}) => i.name)).toEqual([names[8]]);
  // After a reload, the ninth is still a favourite.
  await page.reload();
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  await expect(page.getByRole('button', {name: `Remove ${names[8]} favourite`})).toBeVisible();
  await page.getByRole('button', {name: `Remove ${names[8]} favourite`}).click();
  await expect(page.locator('.aa-toast')).toContainText(`${names[8]} removed from your favourites.`);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect(page.getByRole('button', {name: `Remove ${names[8]} favourite`})).toBeVisible();
  await expect(page.locator('.markets-intro-card strong')).toHaveText('9 of 50');
});
