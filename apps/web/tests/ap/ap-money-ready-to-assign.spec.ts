import {expect, test} from '@playwright/test';
import {BUDGETS_KEY} from '../../lib/budgets/schema';
import {MONEY_LOG_KEY, entry, moneyLog, openWealthSection, seedDevice} from './ap-money-fixtures';

/** Session AP (feature 3, draft): Ready to assign on Budgets, from records only, per currency; said plainly without income. */
test.use({timezoneId: 'UTC'});
const BUDGETS = {version: 1, budgets: [
  {id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'},
  {id: 'b2', category: 'Fun', currency: 'USD', monthly: '20.00', rollover: false, since: '2026-11'},
]};
test('this month\'s income minus what the budgets hold; nothing logged as income in USD', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '2000.00', 'Salary', 'income')]), [BUDGETS_KEY]: BUDGETS});
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  const ready = budgets.getByRole('group', {name: /^Ready to assign in Nov 2026/});
  await expect(ready).toContainText('Ready to assign: €1,700.00');
  await expect(ready).toContainText('€2,000.00 logged as income this month, minus €300.00 your budgets hold');
  await expect(ready).toContainText('Ready to assign in USD: nothing logged as income this month');
  // The month before: no budgets yet and no income.
  await budgets.getByRole('button', {name: 'Previous month'}).click();
  await expect(budgets).toContainText('Ready to assign: nothing logged as income in Oct 2026, and no budgets yet.');
});
