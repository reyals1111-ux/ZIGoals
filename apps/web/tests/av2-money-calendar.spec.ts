import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openInsight, reopenInsight, seedDevice, spending} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's calendar, LEDGER #338): Wealth → Spending → Your money over time →
 * "A calendar of the month": each day's spending and income, the larger days shaded, a day opening its entries in
 * "Search all your entries" — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock
 * is Saturday 14 November 2026; fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a calendar of the month opens a day in search`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([
    entry('2026-10-20', '12.00', 'Fun'),
    entry('2026-11-01', '2000.00', 'Salary', 'income', 'Employer'), entry('2026-11-03', '42.10', 'Groceries', 'expense', 'Market'), entry('2026-11-03', '7.90', 'Food & drink', 'expense', 'Café'),
    entry('2026-11-05', '120.00', 'Home', 'expense', 'Hardware store'),
  ])});
  const panel = await openInsight(page, 'A calendar of the month');
  await expect(panel.getByRole('heading', {name: 'A calendar of the month'})).toBeVisible();
  await expect(panel.locator('.money-cal-total')).toContainText('Nov 2026 in EUR: spent €170.00, received €2,000.00');
  await expect(panel.locator('.money-cal-total')).toContainText('the largest day Nov 5, 2026');
  await expect(panel.locator('td.level-3')).toHaveCount(1);
  let findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // A day with entries opens them in search (on a phone from the list under the grid).
  const day = isMobile ? panel.locator('.money-cal-list').getByRole('button', {name: /Tue, Nov 3, 2026/}) : panel.getByRole('button', {name: /^Tue, Nov 3, 2026: spent €50\.00 \(2 entries\)\. Open these entries in search$/});
  await day.click();
  await expect(spending(page).locator('.money-drill-note')).toHaveText('Entries on Nov 3, 2026, from the calendar of the month.');
  const results = spending(page).getByRole('list', {name: 'Entries found'});
  await expect(results.getByRole('listitem')).toHaveCount(2);
  await expect(spending(page).locator('.money-search-fold > summary')).toBeFocused();
  // Paging back to October and forward again; focus stays on the pager.
  const earlier = panel.getByRole('button', {name: 'Earlier month: Oct 2026'});
  await earlier.click();
  await expect(panel.locator('.money-cal-total')).toContainText('Oct 2026 in EUR: spent €12.00');
  await expect(panel.getByRole('button', {name: /^Earlier month/})).toHaveAttribute('aria-disabled', 'true');
  await panel.getByRole('button', {name: 'Later month: Nov 2026'}).click();
  await expect(panel.getByRole('button', {name: /^Later month/})).toHaveAttribute('aria-disabled', 'true');
  findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  await reopenInsight(page, 'A calendar of the month'); // fix2011; deliberate (tests/ap/ap-money-fixtures.ts)
  await expect(panel.locator('.money-cal-list')).toBeVisible();
  expect(await noSideScroll(page)).toBe(true);
});
