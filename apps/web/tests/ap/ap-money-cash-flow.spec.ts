import {expect, test} from '@playwright/test';
import {MONEY_LOG_KEY, entry, moneyLog, noSideScroll, openInsight, seedDevice} from './ap-money-fixtures';

/**
 * Session AP (feature 1, draft): Wealth → Spending → Your money over time. Month by month for the last 12 months with a
 * record (a month without records is a gap row, never zero), a table beside the chart, each currency on its own;
 * categories over a year; top payees this month beside last month.
 */
test.use({timezoneId: 'UTC'});
const LOG = moneyLog([
  entry('2026-08-01', '2000.00', 'Salary', 'income'), entry('2026-08-03', '400.00', 'Groceries', 'expense', 'Market'),
  entry('2026-11-02', '2100.00', 'Salary', 'income'), entry('2026-11-03', '60.00', 'Groceries', 'expense', 'Market'), entry('2026-11-04', '12.99', 'Subscriptions', 'expense', 'Netflix'),
  entry('2026-10-20', '9.00', 'Fun', 'expense', 'Arcade', 'USD'),
]);

test('month by month: a gap row, the net, and USD apart', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: LOG});
  const panel = await openInsight(page, 'Month by month');
  const eur = panel.getByRole('region', {name: 'Month by month in EUR'});
  await expect(eur.getByRole('img', {name: /^EUR: money received and spent each month/})).toBeVisible();
  const rows = eur.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('€2,000.00');
  await expect(rows.nth(0)).toContainText('+€1,600.00');
  await expect(rows.nth(1)).toContainText('No records');
  await expect(rows.nth(2)).toContainText('+€2,027.01');
  await expect(panel.getByRole('region', {name: 'Month by month in USD'})).toContainText('−$9.00');
  // Nothing in EUR counts the USD entry.
  await expect(eur).not.toContainText('9.00');
});
test('categories over a year and top payees', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: LOG});
  const panel = await openInsight(page, 'Categories over a year');
  const eur = panel.getByRole('region', {name: 'Categories over a year in EUR'});
  await eur.getByLabel('Month by month for').selectOption('Groceries');
  await expect(eur.locator('table')).toContainText('Groceries in EUR, Dec 2025 to Nov 2026');
  await expect(eur.locator('tbody tr').filter({hasText: 'Oct 2026'})).toContainText('No records');
  await expect(eur.locator('tbody tr').filter({hasText: 'Aug 2026'})).toContainText('€400.00');
  await page.getByRole('group', {name: 'Show'}).getByRole('button', {name: 'Top payees', exact: true}).click();
  const payees = page.locator('.money-insights-panel').getByRole('region', {name: 'Top payees in EUR'});
  await expect(payees.locator('tbody tr').first()).toContainText('Market');
  // October had no EUR record at all: a gap, not €0.00.
  await expect(payees.locator('tbody tr').first()).toContainText('No records');
});
test('no horizontal scroll at 320 px', async ({page}) => {
  await page.setViewportSize({width: 320, height: 720});
  await seedDevice(page, {[MONEY_LOG_KEY]: LOG});
  await openInsight(page, 'Month by month');
  expect(await noSideScroll(page)).toBe(true);
});
