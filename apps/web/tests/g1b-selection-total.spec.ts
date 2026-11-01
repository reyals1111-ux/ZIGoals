import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_LOG_KEY, entry, freshDevice, moneyLog, openWealth, spending} from './g1b-fixtures';

/** Session AK, BUILD list 2 #7: Select mode in this week's money log with a running total; currencies never converted. */
test.use({timezoneId: 'UTC'});
const total = (page: import('@playwright/test').Page) => spending(page).locator('.money-select-total');

test('a fresh start has nothing to select', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await expect(spending(page)).toContainText('Nothing logged this week yet.');
  await expect(spending(page).getByRole('button', {name: 'Select', exact: true})).toHaveCount(0);
});
test('picked entries add up exactly; a second currency is named apart', async ({page}) => {
  await freshDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('a', 0, '50.00', 'Groceries'), entry('b', -1, '44.20', 'Fun'), entry('c', -2, '10.00', 'Refund', 'income'), entry('d', -3, '4.20', 'Fun', 'expense', 'Snack', 'USD')])});
  await openWealth(page);
  const select = spending(page).getByRole('button', {name: 'Select', exact: true});
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await expect(total(page)).toHaveText('Nothing selected');
  for (const name of [/^Select Groceries 50\.00 EUR/, /^Select Fun 44\.20 EUR/, /^Select Refund 10\.00 EUR/]) await spending(page).getByRole('checkbox', {name}).check();
  await expect(total(page)).toHaveText('3 selected · −€84.20 (2 expenses, 1 income)');
  await spending(page).getByRole('checkbox', {name: /^Select Fun 4\.20 USD/}).check();
  await expect(total(page)).toContainText('4 selected · 2 currencies: −€84.20 and −US$4.20 (3 expenses, 1 income)');
  await expect(total(page)).toContainText('never converted');
  // Keyboard: Space toggles a box.
  await spending(page).getByRole('checkbox', {name: /^Select Groceries/}).focus();
  await page.keyboard.press('Space');
  await expect(total(page)).toContainText('3 selected · 2 currencies: −€34.20');
  await spending(page).getByRole('button', {name: 'Done', exact: true}).click();
  await expect(total(page)).toHaveCount(0);
});
test('the Showcase: Select all gives the week\'s total', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await spending(page).getByRole('button', {name: 'Select', exact: true}).click();
  await spending(page).getByRole('button', {name: 'Select all', exact: true}).click();
  await expect(total(page)).toContainText(/\d+ selected · [−+]?€/);
});
