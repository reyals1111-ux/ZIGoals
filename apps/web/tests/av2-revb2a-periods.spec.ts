import {expect, test} from '@playwright/test';
import {entry, moneyLog, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';

/**
 * Session AV lane 2 (review b2a #2): Budgets → "Pay periods and fills" spends what the month's budgets spend — an entry
 * marked "Not part of my spending" is not counted and a shared cost counts the person's share. The reviewer's probe
 * month: €10 counted, €50 left out, €30 shared with a share of €10 → spent €20.00, in the payday month too. Fictional
 * records; the API offline. Today is 14 Nov 2026 (fixtures).
 */
const budgets = {version: 1, budgets: [{id: 'b-food', category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-01'}]};
test('a pay period counts what the month budgets count', async ({page}) => {
  const entries = [entry('2026-11-10', '10.00'), {...entry('2026-11-10', '50.00'), excluded: true as const}, {...entry('2026-11-11', '30.00'), share: '10.00'}];
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog(entries), [BUDGETS_KEY]: budgets});
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  const fold = section.locator('details.budgets-periods');
  await fold.locator('summary').click();
  const list = fold.getByRole('list', {name: 'Budgets in their own period'});
  await expect(list).toContainText('spent €20.00');
  await expect(list).toContainText('€80.00 left');
  await fold.getByRole('combobox', {name: 'My budget month starts on day'}).selectOption('5');
  await expect(list).toContainText('Nov 5 – Dec 4');
  await expect(list).toContainText('spent €20.00');
  await expect(list).not.toContainText('spent €90.00');
});
