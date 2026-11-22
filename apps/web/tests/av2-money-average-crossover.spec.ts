import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openInsight, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Actual's average ranges and crossover report, LEDGER #343, #345): Your money over
 * time → "Categories over a year" shows the 3-, 6- or 12-month average as a dashed line and in words beside this month
 * so far (a fact, never a target); "Month by month" → "Investment income beside spending": the person marks Interest
 * and Dividends, and each month's investment income is set beside its spending as a share — at 390 and 1440 in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
for (const theme of THEMES) test(`${theme}: the monthly average and investment income beside spending`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([
    entry('2026-06-05', '100.00'), entry('2026-07-05', '200.00'), entry('2026-09-05', '150.00'), entry('2026-10-05', '150.00'), entry('2026-11-02', '120.00'),
    entry('2026-10-01', '9.00', 'Interest', 'income', 'Savings interest'), entry('2026-11-01', '6.00', 'Dividends', 'income', 'Fund'), entry('2026-11-01', '2000.00', 'Salary', 'income', 'Employer'),
  ])});
  const trend = await openInsight(page, 'Categories over a year');
  await expect(trend.locator('.money-avg-all')).toContainText('Nov 2026 so far €120.00, €30.00 below your 6-month average of €150.00 (over the 4 months with records).');
  await trend.getByRole('button', {name: '3-month average'}).click();
  await expect(trend.getByRole('button', {name: '3-month average'})).toHaveAttribute('aria-pressed', 'true');
  await expect(trend.locator('.money-avg-all')).toContainText('Nov 2026 so far €120.00, €30.00 below your 3-month average of €150.00 (over the 2 months with records).');
  await expect(trend.locator('.money-insights-spark .avg').first()).toBeAttached();
  await expect(trend.locator('tfoot')).toContainText('3-month average');
  let findings = await axe(page, trend);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const flow = await openInsight(page, 'Month by month');
  const cross = flow.locator('.money-cross');
  await expect(cross.getByRole('heading', {name: 'Investment income beside spending'})).toBeVisible();
  await cross.getByRole('checkbox', {name: 'Interest'}).check();
  await cross.getByRole('checkbox', {name: 'Dividends'}).check();
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).investIncome).toEqual(['Interest', 'Dividends']);
  await expect(cross.locator('.money-saved-total')).toHaveText('EUR, the last 24 months (5 with records): €15.00 investment income beside €720.00 spending — it covers 2.1% of spending. In Oct 2026: 6%.');
  await expect(cross.getByRole('row', {name: /Oct 2026/})).toContainText('€9.00');
  await expect(cross).not.toContainText(/years to|will cover/i);
  findings = await axe(page, flow);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
