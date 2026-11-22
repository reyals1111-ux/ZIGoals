import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';
import {BUDGET_PERIODS_KEY, type BudgetPeriods} from '../lib/budgets/periods';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity; LEDGER #426, #428, #429): Budgets → "Reorder budgets" (up and
 * down, focus kept on the button pressed, the month's rows follow), and "Paychecks and next month": a paycheck added, a
 * budget set against it with what is left, and money set aside for December that lowers November's Ready to assign — at
 * 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026.
 */
const RECORD = {version: 1, budgets: [
  {id: 'food', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'},
  {id: 'rent', category: 'Home', currency: 'EUR', monthly: '900.00', rollover: false, since: '2026-01'},
]};
for (const theme of THEMES) test(`${theme}: budgets in your order, a paycheck's plan and next month set aside`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[BUDGETS_KEY]: RECORD, [MONEY_LOG_KEY]: moneyLog([entry('2026-11-02', '100.00', 'Groceries'), entry('2026-11-01', '2000.00', 'Salary', 'income')])});
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  const rowNames = budgets.locator('.budgets-table .budgets-cat');
  await expect(rowNames).toHaveText(['Groceries', 'Home']);
  const order = budgets.locator('summary', {hasText: 'Reorder budgets'}).locator('..');
  await order.locator('summary').click();
  const up = order.getByRole('button', {name: 'Move Home (EUR) up'});
  await up.click();
  await expect(order.getByRole('list', {name: 'Your budgets in order'}).getByRole('listitem').first()).toContainText('Home');
  await expect(order.getByRole('button', {name: 'Move Home (EUR) down'})).toBeFocused();
  await expect(rowNames).toHaveText(['Home', 'Groceries']);
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).budgets.map(b => [b.id, b.order])).toEqual([['food', 1], ['rent', 0]]);

  const plan = budgets.locator('summary', {hasText: 'Paychecks and next month'}).locator('..');
  await plan.locator('summary').click();
  await expect(plan).toContainText('No paychecks yet.');
  const add = plan.getByRole('form', {name: 'Add a paycheck'});
  await add.getByLabel('Name').fill('1st of the month');
  await add.getByLabel('What it brings in').fill('1500');
  await add.getByRole('button', {name: 'Add the paycheck'}).click();
  const paid = plan.getByLabel(/Budget: Home · €900\.00/);
  await paid.selectOption({label: '1st of the month'});
  await expect(plan.getByRole('list', {name: 'Your paychecks this month'})).toContainText('holds €1,500.00 · set against it €900.00 (1 line) · €600.00 left once they are covered');
  expect((await readRecord<BudgetPeriods>(page, BUDGET_PERIODS_KEY)).paychecks?.lines).toMatchObject({'b:rent': expect.any(String)});

  await plan.getByLabel(/Groceries \(EUR\) — its amount there €300\.00/).fill('100');
  await plan.getByRole('button', {name: 'Set aside', exact: true}).click();
  await expect(budgets.locator('.budgets-ready')).toContainText('(of it €100.00 set aside for next month)');
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).ahead).toMatchObject([{from: '2026-11', budgetId: 'food', amount: '100.00'}]);
  const findings = await axe(page, plan);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
