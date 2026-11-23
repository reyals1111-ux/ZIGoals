import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_LOG_KEY, entry, freshDevice, moneyLog, openWealth, spending} from './g1b-fixtures';

/** Session AK, BUILD list 2 #6: Wealth → Spending puts the three most used categories of the last 30 days first. */
test.use({timezoneId: 'UTC'});
const chips = (page: import('@playwright/test').Page) => spending(page).locator('.spending-cats .spending-chip');

test('a fresh start keeps the usual order and says nothing about recent ones', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await expect(chips(page).first()).toHaveText('Food & drink');
  await expect(spending(page)).not.toContainText('Your most used lately come first.');
});
test('the most used lead, income counted apart, then the usual order without repeats', async ({page}) => {
  await freshDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('a', 0, '3.00', 'Transport'), entry('b', -2, '3.00', 'Transport'), entry('c', -5, '3.00', 'Transport'), entry('d', -3, '20.00', 'Gifts'), entry('e', -1, '50.00', 'Freelance', 'income'), entry('f', -40, '9.00', 'Home'), entry('g', -40, '9.00', 'Home')])});
  await openWealth(page);
  await expect(spending(page)).toContainText('Your most used lately come first.');
  await expect(chips(page).nth(0)).toHaveText('Transport');
  await expect(chips(page).nth(1)).toHaveText('Gifts');
  await expect(chips(page).nth(2)).toHaveText('Food & drink'); // the usual order goes on; Home (40 days ago) does not lead
  await expect(chips(page).filter({hasText: /^Transport$/})).toHaveCount(1);
  await spending(page).getByRole('radio', {name: 'Received'}).check();
  await expect(chips(page).first()).toHaveText('Freelance');
  // Choosing a recent chip saves into that category.
  await spending(page).getByRole('radio', {name: 'Spent'}).check();
  await spending(page).getByRole('radio', {name: 'Transport'}).check();
  await spending(page).getByLabel('Amount').fill('2.80');
  await spending(page).getByRole('button', {name: 'Save', exact: true}).click();
  await expect(spending(page).getByRole('status').first()).toContainText('Transport · saved');
});
test('the Showcase: its own most used categories lead', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await expect(spending(page)).toContainText('Your most used lately come first.');
  await expect(chips(page).first()).toHaveText(/^(Food & drink|Groceries)$/);
});
