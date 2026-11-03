import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_LOG_KEY, entry, freshDevice, moneyLog, openWealth, spending} from './g1b-fixtures';

/** Session AK, BUILD list 2 #18: Wealth → Spending → Map, a hand-made treemap with a table that always lists every category. */
test.use({timezoneId: 'UTC'});

test('a fresh start has no map to show', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await expect(spending(page)).toContainText('No spending logged this month.');
  await expect(spending(page).getByRole('button', {name: 'Map', exact: true})).toHaveCount(0);
});
test('the map, its table and a category\'s entries, by keyboard; currencies never mixed', async ({page}) => {
  // 1 November: this month's entries are today's.
  await freshDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('a', 0, '60.00', 'Groceries', 'expense', 'Market'), entry('b', 0, '30.00', 'Fun', 'expense', 'Cinema'), entry('c', 0, '10.00', 'Transport', 'expense', 'Tram'), entry('d', 0, '5.00', 'Fun', 'expense', 'Arcade', 'USD')])});
  await openWealth(page);
  await spending(page).getByRole('button', {name: 'Map', exact: true}).click();
  const map = spending(page).locator('.spending-map');
  await expect(map.getByRole('table', {name: 'EUR spending this month by category'})).toBeVisible();
  await expect(map.getByRole('table', {name: 'USD spending this month by category'})).toBeVisible();
  await expect(map.getByRole('table', {name: 'EUR spending this month by category'}).locator('tbody th')).toHaveText(['Groceries', 'Fun', 'Transport']);
  const cells = map.locator('.spending-map-cell');
  await expect(cells).toHaveCount(4);
  const groceries = map.getByRole('button', {name: /^Groceries: €60\.00, 60% of this month's EUR spending/});
  await groceries.focus();
  await page.keyboard.press('Enter');
  await expect(map.locator('.spending-map-entries')).toContainText('Market');
  await expect(map.locator('.spending-map-entries')).not.toContainText('Cinema');
  await map.getByRole('button', {name: 'Show all categories'}).click();
  await expect(map.locator('.spending-map-entries')).toHaveCount(0);
  await spending(page).getByRole('button', {name: 'List', exact: true}).click();
  await expect(map).toHaveCount(0);
});
test('no horizontal scroll at 320 px', async ({page}) => {
  await page.setViewportSize({width: 320, height: 720});
  await freshDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('a', 0, '60.00', 'Groceries'), entry('b', 0, '30.00', 'Fun')])});
  await openWealth(page);
  await spending(page).getByRole('button', {name: 'Map', exact: true}).click();
  await expect(spending(page).locator('.spending-map-svg')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
test('the Showcase: this month as a map', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await spending(page).getByRole('button', {name: 'Map', exact: true}).click();
  await expect(spending(page).getByRole('table', {name: 'EUR spending this month by category'})).toBeVisible();
});
