import {expect, test} from '@playwright/test';
import {MONEY_LOG_KEY, entry, moneyLog, openWealthSection, seedDevice} from './ap-money-fixtures';

/** Session AP (feature 6, draft): a bill found in the money log whose latest amount differs says "went up by X since <month>". */
test.use({timezoneId: 'UTC'});
test('a found subscription that went up', async ({page}) => {
  const series = ['2026-08-03', '2026-09-03', '2026-10-03'].map(d => entry(d, '12.99', 'Subscriptions', 'expense', 'Netflix'));
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([...series, entry('2026-11-03', '13.49', 'Subscriptions', 'expense', 'Netflix')])});
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  await expect(bills.getByRole('region', {name: 'Price changes'})).toContainText('Netflix went up by €0.50 since Oct 2026 (€12.99 then, €13.49 now).');
  // Confirmed as a bill, the notice stays.
  await bills.getByRole('button', {name: 'Confirm Netflix as a bill'}).click();
  await expect(bills.getByRole('region', {name: 'Price changes'})).toContainText('Netflix went up by €0.50 since Oct 2026');
});
