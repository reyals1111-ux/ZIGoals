import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {BILLS_KEY} from '../lib/bills/schema';
import {addLocalDays} from '../lib/local-date';
import {MONEY_LOG_KEY, TODAY, entry, freshDevice, moneyLog, moneyTools, openWealth} from './g1b-fixtures';

/** Session AK, BUILD list 2 #11: Money tools → "Next 60 days", a model from the person's own records, not a promise. */
test.use({timezoneId: 'UTC'});
const AT = '2026-09-01T09:00:00.000Z';
const cash = (id: string, currency: string, value?: string) => ({id, kind: 'cash', name: `Everyday ${currency}`, currency, snapshots: value ? [{id: id.replace(/1$/, '9'), date: addLocalDays(TODAY, -1), value, decimals: 2}] : [], payments: [], createdAt: AT, updatedAt: AT});

test('a fresh start teaches what it needs; the promise line is always in view', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Next 60 days'}).click();
  const panel = page.locator('.cash-forecast');
  await expect(panel).toContainText('A model from your own records, not a promise.');
  await expect(panel).toContainText('This needs at least one cash or savings account with its balance.');
  await expect(panel.locator('svg')).toHaveCount(0);
});
test('balances, bills and the log: the lowest point is named; unknown is not zero; currencies apart', async ({page}) => {
  const entries = Array.from({length: 30}, (_, i) => entry(`e${i}`, -i, '10.00', 'Groceries'));
  await freshDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [cash('00000000-0000-4000-8000-000000000001', 'EUR', '200000'), cash('00000000-0000-4000-8000-000000000011', 'USD')]},
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'rent', title: 'Rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: addLocalDays(TODAY, 3), origin: 'manual', createdAt: AT}]},
    [MONEY_LOG_KEY]: moneyLog(entries),
  });
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Next 60 days'}).click();
  const panel = page.locator('.cash-forecast');
  await expect(panel).toContainText('A model from your own records, not a promise.');
  // 2,000.00 − 2 × 900.00 rent − 10.00 a day for 60 days = −400.00 on the last day.
  await expect(panel).toContainText('Lowest around Dec 31, 2026: about -€400 (below zero).');
  await expect(panel.getByRole('img', {name: 'Expected EUR cash over the next 60 days'})).toBeVisible();
  await expect(panel).toContainText('the average of your last 30 days in the money log');
  await expect(panel).toContainText('No line for USD: none of its cash or savings accounts has a balance yet.');
  await panel.getByText('Dated items (2)').click();
  await expect(panel.getByRole('table', {name: /Bills, repeats and plans/})).toContainText('Rent');
});
// The Showcase's accounts are in US dollars and its bills, budgets and money log in euros (the lead kept its net worth as
// other tests read it), so its line is the dollar cash and the euro bills are named as not drawn.
test('the Showcase: a labelled example; the euro bills are named, not drawn', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Next 60 days'}).click();
  const panel = page.locator('.cash-forecast');
  await expect(panel).toContainText('A model from your own records, not a promise.');
  await expect(panel).toContainText('Drawn from the Showcase’s fictional accounts, bills and money log.');
  await expect(panel.getByRole('heading', {name: 'USD', exact: true})).toBeVisible();
  await expect(panel).toContainText('Lowest around');
  await expect(panel).toContainText('Not drawn: bills or plans in EUR, which has no cash or savings account here.');
});
