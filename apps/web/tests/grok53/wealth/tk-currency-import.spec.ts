import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL, lane L1 (Tokyo pass 1 and 9j, desktop, fresh profile, no Showcase).
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});

test('TK-014 (P-TK-11; W5): Edit asset refuses an invented valuation currency "XYZ" at its field and keeps the saved value', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Custom', exact: true}).click();
  await sheet.getByLabel('Asset name').fill('Painting');
  await sheet.getByLabel('Total holding value').fill('1500');
  // An invented code is refused at Add asset too, under its own field.
  await sheet.getByLabel('Other valuation currency').fill('XYZ');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(sheet.getByLabel('Other valuation currency')).toHaveAttribute('aria-invalid', 'true');
  await expect(sheet.getByText('“XYZ” is not a currency code ZIGoals knows', {exact: false})).toBeVisible();
  await sheet.getByLabel('Other valuation currency').fill('USD');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Painting added to your wealth.');
  await page.getByRole('link', {name: /Painting/}).first().click();
  await page.getByRole('button', {name: 'Edit asset'}).click();
  const edit = page.getByRole('dialog', {name: 'Edit Painting'});
  await edit.getByLabel('Valuation currency').fill('XYZ');
  await edit.getByRole('button', {name: 'Save changes'}).click();
  await expect(edit.getByLabel('Valuation currency')).toHaveAttribute('aria-invalid', 'true');
  await expect(edit.getByLabel('Valuation currency')).toBeFocused();
  await expect(edit.getByRole('alert')).toContainText('not a currency code');
  await edit.getByRole('button', {name: 'Close dialog'}).click();
  await expect(page.locator('.asset-detail-price')).toHaveText('$1,500.00');
});

test('TK-216/TK-209 (P-TK-68) and TK-009/TK-011/TK-013 (P-TK-10; W13): the import sheet stays open after a file is chosen, and each refused row says its number and reason without a click', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: /Add to your wealth|Import holdings/});
  await sheet.getByRole('button', {name: 'Import from a CSV file'}).click();
  const csv = 'Name,Asset,Quantity,Kind of asset,Value,Currency\nApple,AAPL,10,Stocks,1850.40,USD\nApple,AAPL,10,Stocks,1850.40,USD\nSilver,XAG,50,Precious metals,1200,EUR\nBad,XYZ,1,Stocks,5,XYZ\n';
  const input = sheet.locator('input[type=file]');
  // Chrome fires a bubbling "cancel" on the file input when the picker closes without a change (the same file again).
  await input.dispatchEvent('cancel');
  await expect(sheet).toBeVisible();
  await input.setInputFiles({name: 'holdings.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await expect(sheet).toBeVisible();
  // Mapping, then the preview.
  await sheet.getByRole('button', {name: /^Next/}).click();
  const refused = sheet.locator('.import-refused');
  // Open without a click: the element's own open state (the attribute serializes as an empty string).
  await expect(refused).toHaveJSProperty('open', true);
  await expect(refused).toContainText('Row 2: the same as row 1');
  await expect(refused).toContainText('Row 4: “XYZ” is not a currency code');
  await expect(sheet).toContainText('2 rows ready');
});
