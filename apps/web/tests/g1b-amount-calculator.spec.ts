import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_LOG_KEY, freshDevice, openWealth, readRecord, spending} from './g1b-fixtures';

/** Session AK, BUILD list 2 #19: a sum in the money-log and budget amount fields is worked out and that amount is saved. */
test.use({timezoneId: 'UTC'});

test('the money log: "12,50+3,20" shows "= 15.70" and saves 15.70; division by zero is refused', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  const amount = spending(page).getByLabel('Amount');
  await amount.fill('12,50+3,20');
  await expect(spending(page).locator('.money-calc-hint').first()).toContainText('= 15.70');
  await amount.fill('5/0');
  await expect(spending(page).locator('.money-calc-hint').first()).toHaveText('A number cannot be divided by zero.');
  await spending(page).getByRole('button', {name: 'Save', exact: true}).click();
  await expect(spending(page).getByRole('alert')).toHaveText('A number cannot be divided by zero.');
  expect(await readRecord(page, MONEY_LOG_KEY)).toBeNull();
  await amount.fill('12,50+3,20');
  await spending(page).getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await readRecord<{entries: {amount: string}[]}>(page, MONEY_LOG_KEY))?.entries.map(e => e.amount)).toEqual(['15.70']);
  // The weekly budget.
  await spending(page).getByRole('textbox', {name: /^Weekly budget \(/}).fill('100+50');
  await expect(spending(page).locator('.spending-budget .money-calc-hint')).toContainText('= 150.00');
  await spending(page).getByRole('button', {name: 'Save budget'}).click();
  await expect(spending(page)).toContainText('Weekly budget set: €150.00.');
});
test('a monthly budget: "300+45,50" is saved as 345.50', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/wealth');
  const form = page.getByRole('form', {name: 'Set a monthly budget'});
  await form.getByLabel('Each month').fill('300+45,50');
  await expect(form.locator('.money-calc-hint')).toContainText('= 345.50');
  await form.getByRole('button', {name: 'Save budget'}).click();
  await expect(page.locator('#budgets')).toContainText('Budget for Groceries saved: €345.50 a month.');
});
test('the Showcase: the calculator works the same', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await spending(page).getByLabel('Amount').fill('3*4.99');
  await expect(spending(page).locator('.money-calc-hint').first()).toContainText('= 14.97');
});
