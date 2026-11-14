import {expect, test} from '@playwright/test';
import {MONEY_LOG_KEY, entry, moneyLog, openInsight, seedDevice} from './ap-money-fixtures';

/** Session AP (feature 5, draft): spending pace beside your usual month; three earlier months needed; never a forecast. */
test.use({timezoneId: 'UTC'});
test('fewer than three earlier months: it says so', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-10-03', '50.00'), entry('2026-11-02', '10.00')])});
  const panel = await openInsight(page, 'Your usual pace');
  await expect(panel).toContainText('Not enough months yet: this needs at least 3 earlier months with spending logged in EUR, and there is 1.');
});
test('by the 14th you usually have spent X; this month Y', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-08-03', '100.00'), entry('2026-09-03', '150.00'), entry('2026-10-03', '80.00'), entry('2026-10-20', '500.00'), entry('2026-11-02', '60.00')])});
  const panel = await openInsight(page, 'Your usual pace');
  await expect(panel.getByRole('region', {name: 'Your usual pace in EUR'})).toContainText('By the 14th you usually have spent €100.00; this month €60.00, €40.00 less.');
  await expect(panel).toContainText('not a forecast');
});
