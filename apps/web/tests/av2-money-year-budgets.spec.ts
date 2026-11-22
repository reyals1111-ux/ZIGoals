import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Year-to-Date Comparison, LEDGER #385): Budgets → "2026 so far against your
 * budgets": each budget's months so far beside what was spent (a shared cost by its share), the difference as a fact,
 * one budget's months on demand — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The
 * clock is Saturday 14 November 2026; fictional records.
 */
for (const theme of THEMES) test(`${theme}: this year so far against the budgets`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'}, {id: 'f', category: 'Fun', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-10'}]},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-06-10', '3000.00', 'Groceries'), {...entry('2026-11-02', '90.00', 'Groceries', 'expense', 'Dinner'), share: '30.00'}, entry('2026-10-04', '130.00', 'Fun')]),
  });
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  const fold = budgets.locator('.money-ytd-fold');
  await fold.locator('summary').click();
  const panel = fold.locator('.money-ytd');
  await expect(panel.locator('.money-ytd-total')).toHaveText('€3,160.00 spent against €3,400.00 budgeted in EUR — €240.00 under so far (2 budgets).');
  const rows = panel.locator('.money-ytd-table').first().locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('€30.00 over so far');
  await expect(rows.nth(1)).toContainText('€270.00 under so far');
  const fun = panel.getByRole('button', {name: 'Fun', exact: true});
  await fun.click();
  await expect(fun).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByRole('table', {name: /Fun in 2026, month by month/})).toBeVisible();
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
