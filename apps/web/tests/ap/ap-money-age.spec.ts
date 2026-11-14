import {expect, test} from '@playwright/test';
import {MONEY_LOG_KEY, entry, moneyLog, openInsight, seedDevice} from './ap-money-fixtures';

/** Session AP (feature 4, draft): age of money, first in first out over 90 days; "not enough records yet" before 30 days. */
test.use({timezoneId: 'UTC'});
test('not enough records yet with under 30 days', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '100.00', 'Salary', 'income'), entry('2026-11-05', '20.00')])});
  const panel = await openInsight(page, 'Age of money');
  await expect(panel).toContainText('first in, first out');
  await expect(panel).toContainText('Not enough records yet: this needs at least 30 days of entries in EUR, and there are 14 days.');
});
test('the average age of money spent, weighted by the amount', async ({page}) => {
  // 100 in on 1 Oct and 1 Nov; 150 spent on 11 Nov: 100 at 41 days, 50 at 10 days → 30.7 days.
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-10-01', '100.00', 'Salary', 'income'), entry('2026-11-01', '100.00', 'Salary', 'income'), entry('2026-11-11', '150.00')])});
  const panel = await openInsight(page, 'Age of money');
  await expect(panel.getByRole('region', {name: 'Age of money in EUR'})).toContainText('on average 30.7 days old');
});
