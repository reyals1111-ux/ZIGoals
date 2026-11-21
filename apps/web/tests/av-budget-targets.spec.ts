import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';

/**
 * Session AV, owner follow-up 1 (F-BUDGET-TARGETS; YNAB targets): a budget saving towards an amount by a month — set in
 * the form (rollover kept on), said under the budget's name (set aside, to go, a month from next month, on track or short),
 * stopped again — at 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: Gifts at €40 a month towards €200 by February 2027`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-05', '10.00', 'Gifts')])});
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  await budgets.getByRole('button', {name: '+ Set a monthly budget'}).click();
  const form = budgets.getByRole('form', {name: 'Set a monthly budget'});
  await form.getByLabel('Category').selectOption('Gifts');
  await form.getByLabel('Each month').fill('40');
  await form.getByLabel('Currency').selectOption('EUR');
  await form.getByRole('checkbox', {name: /^Save towards an amount by a month/}).check();
  await expect(form.getByRole('checkbox', {name: 'Roll over what is left unspent'})).toBeChecked();
  await form.getByLabel('Amount to reach').fill('200');
  await form.getByLabel('By the end of').fill('2027-02');
  await form.getByRole('button', {name: 'Save budget'}).click();
  await expect(budgets.getByRole('status')).toContainText('saving towards €200.00 by Feb 2027');
  // Deliberate change (Session AV, fresh-agent check q2, rank 9): the target line, its button and Remove moved from the
  // narrow Category cell to the budget's own full-width row right under it, and in the month still running what is left
  // is "left so far" (not yet set aside). The same exact sentence is asserted on that row.
  const row = budgets.getByRole('row', {name: /^Gifts(?!:)/}).locator('xpath=following-sibling::tr[1]');
  await expect(row).toHaveClass('budgets-detail');
  await expect(row).toContainText('Target €200.00 by Feb 2027: €30.00 left so far, €170.00 to go — €56.67 a month from next month (you budget €40.00: €16.67 a month short).');
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), BUDGETS_KEY)).budgets[0]).toMatchObject({category: 'Gifts', rollover: true, target: {amount: '200.00', by: '2027-02'}});
  const findings = await axe(page, budgets);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await row.getByRole('button', {name: 'Stop the target'}).click();
  await expect(row).not.toContainText('Target');
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), BUDGETS_KEY)).budgets[0]).not.toHaveProperty('target');
  // Session AV (q2 rank 9): focus moves to the button that took its place; a target is added again on the existing row.
  const add = row.getByRole('button', {name: 'Add a target to the Gifts budget'});
  await expect(add).toBeFocused();
  await add.click();
  const addForm = row.getByRole('form', {name: 'Add a target to the Gifts budget'});
  await addForm.getByLabel('Amount to reach').fill('100');
  await addForm.getByLabel('By the end of').fill('2026-12');
  await addForm.getByRole('button', {name: 'Save target'}).click();
  await expect(row).toContainText('Target €100.00 by Dec 2026: €30.00 left so far, €70.00 to go — €70.00 a month from next month (you budget €40.00: €30.00 a month short).');
  await expect(row.getByRole('button', {name: 'Stop the target'})).toBeFocused();
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), BUDGETS_KEY)).budgets[0]).toMatchObject({category: 'Gifts', rollover: true, target: {amount: '100.00', by: '2026-12'}});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // At 320 the name keeps its line and every amount stays whole; the target sentence spans the table's width.
  const main = budgets.getByRole('row', {name: /^Gifts(?!:)/});
  for (const cell of await main.locator('th, td.budgets-num').all()) {
    if (!(await cell.isVisible())) continue;
    expect(await cell.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el.firstChild ?? el); return r.getClientRects().length; })).toBe(1);
  }
  const [rowBox, tableBox] = [await row.locator('td').boundingBox(), await budgets.locator('.budgets-table').boundingBox()];
  expect(rowBox!.width).toBeGreaterThanOrEqual(tableBox!.width - 8);
});
