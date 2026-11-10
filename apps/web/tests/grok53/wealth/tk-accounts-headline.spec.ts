import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL, lane L1 (Tokyo pass 1–2, desktop ~1280 px, Dark, fresh profile with the bot's own data, no Showcase).
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});

async function addAccount(page: Page, {kind, name, currency, balance}: {kind?: string; name: string; currency: string; balance?: string}) {
  await page.getByRole('button', {name: 'Add an account or debt'}).click();
  const add = page.getByRole('form', {name: 'Add an account or debt'});
  if (kind) await add.getByLabel('Kind').selectOption({label: kind});
  await add.getByLabel('Name', {exact: true}).fill(name);
  await add.getByLabel('Currency').fill(currency);
  if (balance) await add.getByLabel(/What you owe now|Balance now/).fill(balance);
  await add.getByRole('button', {name: 'Add', exact: true}).click();
  // Session AL (P-TK-49, pass 2): a billion or more asks once ("check this?"); the bot meant it, so it keeps it.
  if (balance && Number(balance.replace(/[^\d.]/g, '')) >= 1e9) {
    await expect(add.getByRole('status')).toContainText('is more than a billion');
    await add.getByRole('button', {name: 'Keep this amount'}).click();
  }
  await expect(page.getByRole('status').filter({hasText: `${name} added.`})).toBeVisible();
}

test('TK-003 (P-TK-06): an account balance typed with a decimal comma, "1500,75", is saved as €1,500.75; TK-129: Edit focuses Name; TK-005: the status names the saved account', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await addAccount(page, {name: 'Savings Test', currency: 'EUR'});
  await page.getByRole('button', {name: 'Update the balance of Savings Test'}).click();
  const form = page.getByRole('form', {name: 'New balance for Savings Test'});
  const amount = form.getByLabel(/^Balance/);
  await expect(amount).toBeFocused();
  await amount.pressSequentially('1500,75');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Net worth in EUR'})).toContainText('€1,500.75');
  // Edit puts the focus in Name; the status line names the account as saved.
  await page.getByRole('button', {name: 'Edit Savings Test'}).click();
  const edit = page.getByRole('form', {name: 'Edit Savings Test'});
  await expect(edit.getByLabel('Name', {exact: true})).toBeFocused();
  await edit.getByLabel('Name', {exact: true}).fill('Rainy day');
  await edit.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Rainy day saved.'})).toBeVisible();
});

test('TK-039/TK-132 (P-TK-08; W1): a debt far larger than the holdings shows under the Wealth headline as net worth after debts, with a plain warning', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  // €289,200 of cash in Wealth, then a credit card debt of €999,999,999,999.99.
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByRole('group', {name: 'Valuation currency'}).getByRole('button', {name: 'EUR', exact: true}).click();
  await sheet.getByLabel('Cash amount').fill('289200');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(page.locator('.aa-toast')).toContainText('added to your wealth');
  await addAccount(page, {kind: 'Credit card', name: 'Visa', currency: 'EUR', balance: '999999999999.99'});
  const hero = page.getByRole('group', {name: 'Net worth after debts'});
  await expect(hero).toBeVisible();
  await expect(hero).toContainText('-€999,999,710,799.99');
  await expect(hero.getByRole('note')).toContainText('Your debts are larger than what you own in EUR');
  // The same figure as the net worth card.
  await expect(page.getByRole('article', {name: 'Net worth in EUR'})).toContainText('-€999,999,710,799.99');
});
