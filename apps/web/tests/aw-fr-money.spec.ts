import {expect, test, type Page} from '@playwright/test';
import {applyTheme, axe} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {ACCOUNTS_KEY, type Accounts} from '../lib/accounts/schema';
import {DEBT_PLANNER_KEY, type DebtPlannerRecord} from '../lib/debt-planner/store';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AW (fr-money; persona Tom, FR-AW-2 and FR-AW-13), at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. The clock is Saturday 14 November 2026 (tests/ap/ap-money-fixtures.ts); records are fictional.
 * - FR-AW-2: a friend whose spending is all in euros adds a debt: the form's Currency starts at EUR (it started at USD on a
 *   device whose region is not in the euro area), and the debt is saved in euros;
 * - FR-AW-13: the debt form asks for the minimum monthly payment (optional), kept where the payoff planner keeps it
 *   (`zigoals:debt-planner:v1` debts[id].minimum), so Plan paying off your debts has it; an account has no such field.
 * Nothing here moves, so there is no motion to switch off.
 */
const THEMES = ['nebula', 'light', 'dark'] as const;
const serious = async (page: Page, scope: ReturnType<Page['locator']>) => (await axe(page, scope)).filter(v => v.impact === 'serious' || v.impact === 'critical');

for (const theme of THEMES) test(`${theme}: a debt starts in the currency of the person's spending, and keeps its minimum for the planner`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '42.10', 'Groceries'), entry('2026-11-12', '18.40', 'Transport'), entry('2026-11-13', '60.00', 'Groceries')])});
  await page.goto('/app/wealth'); await hydrated(page);
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await section.getByRole('button', {name: 'Add an account or debt', exact: true}).click();
  const form = section.getByRole('form', {name: 'Add an account or debt'});
  // FR-AW-2: euros, from the spending already kept; never a silent USD.
  await expect(form.getByLabel('Currency')).toHaveValue('EUR');
  // An account has no minimum; a debt asks for one, optional, with what it is for.
  await expect(form.getByLabel('Minimum monthly payment (optional)')).toHaveCount(0);
  await form.getByLabel('Kind').selectOption({label: 'Credit card'});
  const minimum = form.getByLabel('Minimum monthly payment (optional)');
  await expect(minimum).toBeVisible();
  await expect(minimum).toHaveAccessibleDescription(/From your statement\. Plan paying off your debts uses it/);
  expect(await serious(page, form)).toEqual([]);
  await form.getByLabel('Name').fill('Credit card');
  await form.getByLabel('What you owe now (optional)').fill('2400');
  // A minimum of zero marks its own field, in plain words, and nothing is saved.
  await minimum.fill('0');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(minimum).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByRole('alert')).toHaveText('Enter the minimum monthly payment as an amount above zero, for example 25.00, or leave it empty.');
  expect((await readRecord<Accounts | null>(page, ACCOUNTS_KEY))?.items ?? []).toHaveLength(0);
  await minimum.fill('60');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(section.getByRole('status').filter({hasText: 'Credit card added'})).toHaveText('Credit card added, with its minimum of €60.00 a month for the payoff planner.');
  const accounts = await readRecord<Accounts>(page, ACCOUNTS_KEY), card = accounts.items[0]!;
  expect(card).toMatchObject({kind: 'credit-card', name: 'Credit card', currency: 'EUR'});
  expect(card.snapshots[0]).toMatchObject({value: '240000', decimals: 2, date: '2026-11-14'});
  expect((await readRecord<DebtPlannerRecord>(page, DEBT_PLANNER_KEY)).debts?.[card.id]).toEqual({minimum: '60.00'});
  const row = section.locator('.accounts-row').filter({hasText: 'Credit card'});
  await expect(row.locator('.accounts-row-balance strong')).toHaveText('€2,400.00');
  // Re-walk: a payment recorded on the balance's own day is kept and said, not taken off (it cannot be ordered against it).
  await row.getByRole('button', {name: 'Record a payment on Credit card'}).click();
  await row.getByRole('form', {name: 'Payment on Credit card'}).getByLabel('Payment (EUR)').fill('150');
  await row.getByRole('form', {name: 'Payment on Credit card'}).getByRole('button', {name: 'Save'}).click();
  await expect(row.locator('.accounts-row-balance strong')).toHaveText('€2,400.00');
  await expect(row.locator('.accounts-owed-now')).toHaveText("1 payment on the balance's day, not taken off (enter the new balance when your statement shows it)");
  // The planner reads the minimum typed in the form.
  await section.getByRole('button', {name: 'Plan paying off your debts'}).click();
  await expect(section.getByLabel('Minimum a month for Credit card (EUR)')).toHaveValue('60.00');
  expect(await serious(page, section)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});

test('a debt without a minimum is saved as before, and nothing is written for the planner', async ({page, isMobile}) => {
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '42.10', 'Groceries')])});
  await page.goto('/app/wealth'); await hydrated(page);
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await section.getByRole('button', {name: 'Add an account or debt', exact: true}).click();
  const form = section.getByRole('form', {name: 'Add an account or debt'});
  await form.getByLabel('Kind').selectOption({label: 'Loan'});
  await form.getByLabel('Name').fill('Car loan');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(section.getByRole('status').filter({hasText: 'Car loan added'})).toHaveText('Car loan added.');
  expect((await readRecord<Accounts>(page, ACCOUNTS_KEY)).items[0]).toMatchObject({currency: 'EUR', kind: 'loan'});
  expect(await readRecord<DebtPlannerRecord | null>(page, DEBT_PLANNER_KEY)).toBeNull();
});
