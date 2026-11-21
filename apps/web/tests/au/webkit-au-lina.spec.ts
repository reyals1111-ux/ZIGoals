import {expect, test, type Locator, type Page} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, setup, ZONE} from './au-helpers';
import {openFold} from '../phone-nav';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Lina on her phone, in the Light theme. A budgeter: she imports her
 * bank's CSV, sets a Groceries budget and confirms the bills the app finds. In the rehearsal her grocer's rows were filed
 * under Other (the €250 budget said €0 spent) and her phone bill, which went from €15.00 to €17.50, was never offered as a
 * bill (both the Lina reviewer's Blocker and Major). Now:
 * - L-2: a grocer, a bakery or a butcher reads as Groceries, so the imported rows reach the budget;
 * - L-4: the stepped phone bill is offered as a bill, and its rise shows.
 * Phone only (the mobile project); named webkit-au-* so CI's WebKit job runs it on an iPhone profile too.
 */
test.skip(({isMobile}) => !isMobile, 'the phone part of Lina\'s week (her desktop part is tests/au/lina.spec.ts)');
test.use({timezoneId: ZONE, actionTimeout: 15_000});

const CSV = ['Date,Payee,Amount,Note',
  '2026-08-01,Fictional Rent Co,-950.00,Rent', '2026-09-01,Fictional Rent Co,-950.00,Rent', '2026-10-01,Fictional Rent Co,-950.00,Rent', '2026-11-01,Fictional Rent Co,-950.00,Rent',
  '2026-08-04,Fictional Phone,-15.00,', '2026-09-04,Fictional Phone,-15.00,', '2026-10-04,Fictional Phone,-17.50,', '2026-11-04,Fictional Phone,-17.50,',
  '2026-11-02,Fictional Grocer,-61.30,', '2026-11-09,Fictional Grocer,-48.75,', '2026-11-16,Fictional Grocer,-55.10,',
  '2026-11-15,Fictional Employer,2650.00,Salary'].join('\n');

async function openImport(page: Page): Promise<Locator> {
  await page.locator('#spending').getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await expect(sheet).toBeVisible();
  return sheet;
}

test('Lina on the phone: a bank CSV reaches her Groceries budget, and the phone bill that went up is offered with its rise', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'light', at(DAY1, '08:30'));
  await setup(page, [/^Goals & money/]);
  await page.goto('/app/wealth'); await hydrated(page);

  const sheet = await openImport(page);
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV)});
  await sheet.getByRole('combobox', {name: 'Currency of this file', exact: true}).selectOption('EUR');
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(sheet.locator('.import-summary')).toContainText('12 rows read · 12 ticked · 0 rows refused');
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 12 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status').filter({hasText: '12 entries added to your money log'})).toBeVisible();
  await sheet.getByRole('button', {name: 'Done', exact: true}).click();

  // L-2: the grocer's three rows are Groceries.
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:money-log:v1')!).entries as {note?: string; category: string}[]);
  expect(log.filter(e => (e.note ?? '').includes('Fictional Grocer')).map(e => e.category)).toEqual(['Groceries', 'Groceries', 'Groceries']);

  // Her €250 Groceries budget counts them: €165.15 spent, €84.85 left.
  await openFold(page, 'Budgets by category');
  await page.locator('#budgets').getByRole('button', {name: '+ Set a monthly budget', exact: true}).click();
  const budgets = page.getByRole('form', {name: 'Set a monthly budget'});
  await budgets.getByLabel('Category').selectOption('Groceries');
  await budgets.getByLabel('Each month').fill('250');
  await budgets.getByLabel('Currency').selectOption('EUR');
  await budgets.getByRole('button', {name: 'Save budget', exact: true}).click();
  await expect(page.locator('.budgets-total').first()).toContainText('€84.85 left of €250.00 budgeted');

  // L-4: the phone bill is offered, and its rise shows.
  await openFold(page, 'Upcoming bills');
  const confirm = page.getByRole('button', {name: 'Confirm Fictional Phone as a bill', exact: true});
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.locator('#bills, .bills').first()).toContainText(/Fictional Phone went up by €2\.50 since Sep 2026/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
