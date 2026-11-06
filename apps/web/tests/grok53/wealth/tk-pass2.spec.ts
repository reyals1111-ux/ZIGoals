import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL, lane L1 second pass (Tokyo pass 9d and the Denver/Berlin Wealth rows): desktop 1280, Dark, fresh profile.
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});

async function openWealth(page: Page) { await offlineApi(page); await freshDevice(page); await page.goto('/app/wealth'); await hydrated(page); }

test('N-TK-12/TK-039 (P-TK-49; W6): a balance of 999,999,999,999 asks "check this?" once; "Keep this amount" saves it; an ordinary balance saves at once', async ({page}) => {
  await openWealth(page);
  await page.getByRole('button', {name: 'Add an account or debt'}).click();
  const add = page.getByRole('form', {name: 'Add an account or debt'});
  await add.getByLabel('Name', {exact: true}).fill('Big savings');
  await add.getByLabel('Currency').fill('EUR');
  const balance = add.getByLabel('Balance now (optional)');
  await balance.fill('999999999999');
  await add.getByRole('button', {name: 'Add', exact: true}).click();
  const check = add.getByRole('status');
  await expect(check).toContainText('€999,999,999,999.00 is more than a billion — unusually large for a balance.');
  await expect(balance).toHaveAttribute('aria-describedby', new RegExp(await check.getAttribute('id') ?? 'none'));
  await expect(page.getByRole('article', {name: 'Net worth in EUR'})).toHaveCount(0); // nothing saved yet
  await add.getByRole('button', {name: 'Keep this amount'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Big savings added.'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Net worth in EUR'})).toContainText('€999,999,999,999.00');
  // An ordinary balance on the same account saves without a question.
  await page.getByRole('button', {name: 'Update the balance of Big savings'}).click();
  const form = page.getByRole('form', {name: 'New balance for Big savings'});
  await form.getByLabel(/^Balance/).fill('2500');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Net worth in EUR'})).toContainText('€2,500.00');
});

test('DV-144/DV-145 (P-DV-113): Add asset says what an empty or zero amount needs, under its field; a stock is "shares", never "RWA" or metal', async ({page}) => {
  await openWealth(page);
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  const amount = sheet.getByLabel('Cash amount');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(sheet.getByText('Enter an amount.', {exact: true})).toBeVisible();
  await amount.fill('0');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(sheet.getByText('Enter an amount above 0.', {exact: true})).toBeVisible();
  await expect(amount).toBeFocused();
});

test('DV-251/DV-252c: the Wealth total says what it counts in plain sentences, and the header counts accounts too', async ({page}) => {
  await openWealth(page);
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Cash amount').fill('500');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(page.locator('.aa-toast')).toContainText('added to your wealth');
  await page.getByRole('button', {name: 'Add an account or debt'}).click();
  const add = page.getByRole('form', {name: 'Add an account or debt'});
  await add.getByLabel('Name', {exact: true}).fill('Savings');
  await add.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(page.locator('.wealth-hero-total .wealth-total-scope')).toHaveText(/^Your holdings, valued on .+\. Net worth adds your accounts and subtracts your debts \(see Accounts, debts & net worth\)\.$/);
  await expect(page.locator('.wealth-hero-total small', {hasText: 'automatic'})).toContainText('1 asset · 1 account ·');
});

test('BN-089/BN-091 and C-TK-29/C-TK-31: the calculator says why an amount is refused, works a target backwards, and downloads its table', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  const start = page.getByLabel('Starting amount');
  await start.fill('-50');
  await expect(page.locator('.calc-error').first()).toHaveText('Enter an amount of 0 or more.');
  await start.fill('1000');
  const solver = page.getByRole('region', {name: /What would it take/});
  await solver.getByLabel('Amount to reach').fill('100000');
  await expect(solver.getByRole('status')).toContainText(/About \$[\d,]+\.\d{2} every month would reach \$100,000\.00 in 20 years/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Download as CSV'}).click();
  expect((await download).suggestedFilename()).toMatch(/^zigoals-calculator-\d{4}-\d{2}-\d{2}\.csv$/);
});
