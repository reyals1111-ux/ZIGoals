import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, readRecord, seedDevice, spending, TODAY} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2 (money; Rocket Money's watchlist, challenges, payday view and low-balance alert, YNAB's home tab and
 * Spotlight, Copilot's year in review, Monarch's account notes and order): Budgets → a watched payee and a challenge, the
 * "On Today" switch and Today's quiet "Budgets left" line, the year in review, the low-balance line under Next 60 days,
 * and arranging the accounts — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
const AT = '2026-09-01T09:00:00.000Z';
const cash = (id: string, name: string, value: string) => ({id, kind: 'cash', name, currency: 'EUR', snapshots: [{id: id.replace(/1$/, '9'), date: addLocalDays(TODAY, -1), value, decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});
for (const theme of THEMES) test(`${theme}: payee watched, a challenge, budgets on Today, the year, the low line, accounts arranged`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-03', '30.00', 'Food & drink', 'expense', 'Café Noël'), entry('2026-11-10', '25.00', 'Food & drink', 'expense', 'Café Noël'), entry('2026-10-08', '12.00', 'Food & drink', 'expense', 'Café Noël'), entry('2026-10-20', '90.00', 'Food & drink'), entry('2026-11-05', '120.00', 'Groceries'), entry('2026-02-03', '40.00', 'Groceries')]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}]},
    [ACCOUNTS_KEY]: {version: 1, items: [cash('00000000-0000-4000-8000-000000000001', 'Everyday', '50000'), cash('00000000-0000-4000-8000-000000000021', 'Holiday pot', '20000')]},
  });
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  // A watched payee: this month against last by the same day.
  const payees = section.getByRole('region', {name: 'Watching payees'});
  await payees.getByRole('form', {name: 'Watch a payee'}).getByLabel('Payee').fill('Café Noël');
  await payees.getByRole('button', {name: 'Watch payee'}).click();
  await expect(payees.getByRole('listitem')).toContainText('Café Noël · €55.00 so far (2 times) · €12.00 by this day last month (+€43.00) · €12.00 all of last month');
  // A challenge: spend less on Food & drink than last month (€102.00).
  const challenges = section.getByRole('region', {name: 'Challenges'});
  await challenges.getByLabel('Category').selectOption('Food & drink');
  await challenges.getByRole('button', {name: 'Start this month'}).click();
  await expect(challenges.getByRole('listitem')).toContainText('€55.00 so far against €102.00 · €47.00 to spare, 17 days to go · on track');
  // On Today: what is left in each budget.
  await section.getByRole('region', {name: 'On Today'}).getByLabel(/^Show what is left in each budget on Today/).check();
  const record = await readRecord<BudgetsRecord>(page, BUDGETS_KEY);
  expect(record).toMatchObject({onToday: true, payees: [{payee: 'Café Noël', currency: 'EUR'}], challenges: [{category: 'Food & drink', month: '2026-11'}]});
  const findings = await axe(page, section);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // The year in review.
  await section.locator('summary', {hasText: '2026 in review'}).click();
  await expect(section.locator('.budgets-year-card')).toContainText('€317.00 spent so far');
  await expect(section.locator('.budgets-year-card')).toContainText('Largest expense: Groceries €120.00');
  // The low-balance line under Next 60 days.
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('group', {name: 'Money tools'}).getByRole('button', {name: 'Next 60 days'}).click();
  const low = spending(page).getByRole('form', {name: 'Low-balance line'});
  await low.getByLabel('Tell me when cash goes below').fill('2000');
  await low.getByRole('button', {name: 'Save the line'}).click();
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).lowBalance).toEqual({amount: '2000.00', currency: 'EUR'});
  await expect(spending(page).locator('.cash-forecast-extra')).toContainText('Your forecast goes below €2,000.00 around');
  // Accounts: arranged, Holiday pot first.
  // Session AV lane 2 (on a phone "Accounts, debts & net worth" starts folded, so it is opened first, as tests/g1b-networth-share.spec.ts does, deliberate)
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  await page.getByRole('button', {name: 'Arrange What you own'}).click();
  await page.getByRole('button', {name: 'Move Holiday pot up'}).click();
  await expect(page.getByRole('button', {name: 'Move Holiday pot down'})).toBeFocused();
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).accounts?.order?.[0]).toBe('00000000-0000-4000-8000-000000000021');
  // Today: the Money line names the low line; the quiet "Budgets left" line follows, with no Tab stop of its own.
  await page.goto('/app'); await hydrated(page);
  const money = page.getByRole('region', {name: 'Money that asks for a look'});
  await expect(money).toContainText('Cash may go below €2,000.00 on');
  await expect(money.locator('.today-budgets-left')).toHaveText('Budgets left: Groceries €180.00');
  await expect(money.locator('.today-budgets-left a, .today-budgets-left button')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
