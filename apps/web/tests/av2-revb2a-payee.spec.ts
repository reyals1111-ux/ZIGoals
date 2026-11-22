import {expect, test} from '@playwright/test';
import {entry, moneyLog, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';

/**
 * Session AV lane 2 (review b2a #3): a payee budget counts the person's share of a shared cost and leaves out what is
 * marked "Not part of my spending", as Wealth → Spending and the category budgets do. At Albert Heijn: €10 counted,
 * €50 left out, €30 shared with a share of €10 → €20 of a €100 budget, €80 left (never "€40 of €100" or near the limit).
 * Fictional records; the API offline. Today is 14 Nov 2026 (fixtures).
 */
test('a payee budget counts the share of a shared cost', async ({page}) => {
  const ah = (date: string, amount: string) => entry(date, amount, 'Groceries', 'expense', 'Albert Heijn');
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([ah('2026-11-03', '10.00'), {...ah('2026-11-04', '50.00'), excluded: true as const}, {...ah('2026-11-05', '30.00'), share: '10.00'}]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}], payees: [{payee: 'Albert Heijn', currency: 'EUR', amount: '100.00'}]},
  });
  const box = await openWealthSection(page, 'budgets', 'Budgets by category');
  await expect(box.locator('.budgets-payee-budget')).toContainText('Budget €100.00 a month · €80.00 left');
  await expect(box.locator('.budgets-payee-budget')).not.toContainText('near the limit');
});
