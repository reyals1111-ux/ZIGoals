import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openInsight, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV, owner follow-up 1 (F-VS-LAST; Copilot, Rocket Money): Wealth → Spending → "This month vs last": each
 * category this month so far, last month by the same day, the difference and all of last month — at 390 and 1440, three
 * themes, axe-clean, the table scrolling in its own box at 320 (never the page). Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: groceries up €10 on last month by the same day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-02', '40.00'), entry('2026-11-10', '20.00', 'Dining'), entry('2026-10-10', '30.00'), entry('2026-10-20', '25.00'), entry('2026-10-05', '15.00', 'Dining')])});
  const panel = await openInsight(page, 'This month vs last');
  const table = panel.getByRole('table');
  await expect(table.getByRole('row', {name: /^Groceries/})).toContainText('€40.00€30.00+€10.00€55.00');
  await expect(table.getByRole('row', {name: /^Dining/})).toContainText('€20.00€15.00+€5.00€15.00');
  await expect(table.getByRole('row', {name: /^All categories/})).toContainText('€60.00€45.00+€15.00€70.00');
  await expect(panel).toContainText('the same point in the month');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
