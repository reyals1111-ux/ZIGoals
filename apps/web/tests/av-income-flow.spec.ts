import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openInsight, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV, owner follow-up 1 (F-INCOME-FLOW; Monarch's Sankey): Wealth → Spending → "Where income went": this month's
 * income, each category by size and what is left, drawn and as a table — at 390 and 1440, three themes, axe-clean, no
 * sideways page scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: €2,000 in, €1,100 out, €900 left`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '2000.00', 'Salary', 'income'), entry('2026-11-02', '800.00', 'Home'), entry('2026-11-03', '250.00'), entry('2026-11-04', '50.00', 'Fun'), entry('2026-10-04', '70.00', 'Fun')])});
  const panel = await openInsight(page, 'Where income went');
  await expect(panel).toContainText('€2,000.00 came in (Salary €2,000.00); €1,100.00 went out. €900.00 is left, as your log shows it.');
  const rows = panel.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveText([/^Home\s*€800\.00\s*40%$/, /^Groceries\s*€250\.00\s*13%$/, /^Fun\s*€50\.00\s*3%$/, /^Left\s*€900\.00\s*45%$/]);
  await expect(panel.locator('svg.money-flow path')).toHaveCount(4);
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
