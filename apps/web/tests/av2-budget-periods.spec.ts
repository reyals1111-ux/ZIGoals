import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';

/**
 * Session AV lane 2 (Money N11, LEDGER #212, #213; Goodbudget): Budgets → "Pay periods and fills": the budget month from
 * payday, a weekly budget, a saved paycheck fill offered when income is logged (Use the fill, Undo) — at 390 and 1440 in
 * three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline. Today is 14 Nov 2026 (fixtures).
 */
const budgets = {version: 1, budgets: [{id: 'b-food', category: 'Groceries', currency: 'EUR', monthly: '520.00', rollover: false, since: '2026-01'}]};
for (const theme of THEMES) test(`${theme}: a payday month, a weekly budget and a paycheck fill`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '40.00', 'Groceries'), entry('2026-11-12', '2500.00', 'Salary', 'income')]), [BUDGETS_KEY]: budgets});
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  const fold = section.locator('details.budgets-periods');
  await fold.locator('summary').click();
  await fold.getByRole('combobox', {name: 'My budget month starts on day'}).selectOption('25');
  await expect(fold.locator('summary')).toHaveText('Pay periods and fills · month from day 25');
  const list = fold.getByRole('list', {name: 'Budgets in their own period'});
  await expect(list).toContainText('Oct 25 – Nov 24');
  await list.getByRole('combobox', {name: 'Period of Groceries'}).selectOption('week');
  await expect(list).toContainText('Nov 9 – Nov 15');
  await fold.getByRole('textbox', {name: 'Groceries (EUR)'}).fill('600');
  await fold.getByRole('button', {name: 'Save the fill'}).click();
  await expect(fold.getByRole('button', {name: 'Use the fill'})).toBeVisible();
  await fold.getByRole('button', {name: 'Use the fill'}).click();
  await expect.poll(async () => (await readRecord<{budgets: {monthly: string}[]}>(page, BUDGETS_KEY)).budgets[0]!.monthly).toBe('600.00');
  await expect(fold.getByRole('button', {name: 'Use the fill'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(async () => (await readRecord<{budgets: {monthly: string}[]}>(page, BUDGETS_KEY)).budgets[0]!.monthly).toBe('520.00');
  const f = await axe(page, section);
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideScroll(page)).toBe(true);
});
