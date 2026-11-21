import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';

/**
 * Session AV, owner follow-up 1 (F-MONTH-RECAP, F-FRESH-MONTH; Copilot's monthly review, YNAB's fresh start): on 14
 * November, Budgets by category → "Oct 2026 in short" says what October spent and took in and its largest categories;
 * "Start this month fresh" stops September's and October's leftovers carrying into November (Groceries available
 * €330 → €200), and Undo brings them back — at 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
const budgets: BudgetsRecord = {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: true, since: '2026-09'}]};
for (const theme of THEMES) test(`${theme}: October in short, then November started fresh and undone`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-09-10', '150.00'), entry('2026-10-03', '120.00'), entry('2026-10-12', '90.00', 'Fun', 'expense', 'Fictional concert'), entry('2026-10-25', '2500.00', 'Salary', 'income')]), [BUDGETS_KEY]: budgets});
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  const available = () => section.getByRole('row').filter({has: page.getByRole('rowheader', {name: /^Groceries/})}).getByRole('cell').nth(1);
  await expect(available()).toContainText('€330.00');
  await section.getByText('Oct 2026 in short').click();
  const recap = section.locator('.budgets-recap');
  await expect(recap).toContainText('Spent€210.00 · €60.00 more than the month before');
  await expect(recap).toContainText('Came in€2,500.00');
  await expect(recap).toContainText('Largest categoriesGroceries €120.00 · Fun €90.00');
  const findings = await axe(page, section);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await section.getByRole('button', {name: 'Start this month fresh'}).click();
  await expect(available()).toContainText('€200.00');
  await expect.poll(async () => (await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).budgets[0]!.freshFrom).toBe('2026-11');
  await expect(section.getByRole('button', {name: 'Start this month fresh'})).toHaveCount(0);
  // Session AV (fresh-agent check q2, rank 49): the pressed button is gone, so focus moves to the month heading, not <body>.
  await expect(section.getByRole('heading', {name: 'Nov 2026'})).toBeFocused();
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect(available()).toContainText('€330.00');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
