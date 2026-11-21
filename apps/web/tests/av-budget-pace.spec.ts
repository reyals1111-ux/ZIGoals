import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';

/**
 * Session AV, owner follow-up 1 (F-BUDGET-PACE; Copilot's category pace, Rocket Money's near-limit notice): on 14 November
 * (47 % of the month gone) Budgets by category says Groceries is near its limit (85 % spent, €30 left for 17 days) and
 * Fun runs faster than the month (70 %); Dining at 25 % says nothing. Today's money line names Groceries near its
 * limit. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
const budget = (id: string, category: string, monthly: string) => ({id, category, currency: 'EUR', monthly, rollover: false, since: '2026-11'});
for (const theme of THEMES) test(`${theme}: Groceries near its limit, Fun faster than the month, Dining quiet`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-04', '170.00'), entry('2026-11-08', '70.00', 'Fun'), entry('2026-11-09', '50.00', 'Dining')]),
    [BUDGETS_KEY]: {version: 1, budgets: [budget('b1', 'Groceries', '200.00'), budget('b2', 'Fun', '100.00'), budget('b3', 'Dining', '200.00')]}});
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  // Deliberate change (Session AV, fresh-agent check q2, rank 37): the pace line moved from the narrow Category cell to
  // the budget's own full-width row right under it; the same exact texts are asserted on that row.
  const row = (name: string) => section.getByRole('row').filter({has: page.getByRole('rowheader', {name: new RegExp(`^${name}`)})}).locator('xpath=following-sibling::tr[1]');
  await expect(row('Groceries').locator('.budgets-pace')).toHaveText('Near the limit: 85% spent, €30.00 left for 17 days.');
  await expect(row('Fun').locator('.budgets-pace')).toHaveText('70% spent with 47% of the month gone: faster than the month.');
  await expect(row('Dining').locator('.budgets-pace')).toHaveCount(0);
  const findings = await axe(page, section.locator('.budgets-table'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.goto('/app'); await hydrated(page);
  // Deliberate change (Session AV, fresh-agent check q2, rank 20): Today also names a budget spent faster than the month.
  const line = page.getByRole('region', {name: 'Money that asks for a look'});
  await expect(line).toHaveText('Money: Groceries near its limit · Fun faster than the month →');
  // Wealth's ?view= intent scrolls to its section and then rests on the section's own anchor (#budgets), so the address
  // is read as either (a phone run caught the second, mobile dark); the link itself is checked first.
  const fast = line.getByRole('link', {name: 'Fun faster than the month'});
  await expect(fast).toHaveAttribute('href', '/app/wealth?view=budgets');
  await fast.click();
  await expect(page).toHaveURL(/\/app\/wealth(?:\?view=budgets|#budgets)$/);
});
