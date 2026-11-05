import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

// Session AL, lane L1 third pass (CROSS_LANE §b1/§b2 rows for L1). Fresh profile unless the row's bot used the Showcase.
// Written for the integrator's production-build runs (main on 3102 expected to fail, the branch on 3101 to pass).

async function openWealth(page: Page) { await offlineApi(page); await freshDevice(page); await page.goto('/app/wealth'); await hydrated(page); }
const HOLDINGS = 'Name,Asset,Quantity,Kind of asset,Value,Currency\nDollar coin,USDQ,100,Stablecoins,100,USD\nWallet cash,,50,Cash,50,USD\n';
async function importHoldings(page: Page) {
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: /Add to your wealth|Import holdings/});
  await sheet.getByRole('button', {name: 'Import from a CSV file'}).click();
  return sheet;
}

test.describe('desktop 1280, Dark, en-US device', () => {
  test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', locale: 'en-US'});

  test('BUG-065/G-022/PR-068 (P-DVR-22): a new account starts in the device currency (US dollars here), never a fixed EUR', async ({page}) => {
    await openWealth(page);
    await page.getByRole('button', {name: 'Add an account or debt'}).click();
    await expect(page.getByRole('form', {name: 'Add an account or debt'}).getByLabel('Currency')).toHaveValue('USD');
  });

  test('D-237/D-078 (P-DVR-07): step 1 names the columns; a disabled Next says which required field is missing', async ({page}) => {
    await openWealth(page);
    const sheet = await importHoldings(page);
    await expect(sheet).toContainText('The first row must name the columns: Name and Currency (required); also Asset, Quantity, Kind of asset, Value and Notes.');
    await sheet.locator('input[type=file]').setInputFiles({name: 'h.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Amount\nPainting,1500\n')});
    const next = sheet.getByRole('button', {name: /^Next/});
    await expect(next).toBeDisabled();
    const why = sheet.locator('.import-next-why');
    await expect(why).toHaveText(/^Match the required fields? .*Currency.* to a column to continue\.$/);
    await expect(next).toHaveAttribute('aria-describedby', (await why.getAttribute('id'))!);
  });

  test('GAP-028 (P-TK-83, C-TK-14): "Count stablecoins as cash" groups them under Cash in the class view; the total stays the same', async ({page}) => {
    await openWealth(page);
    const sheet = await importHoldings(page);
    await sheet.locator('input[type=file]').setInputFiles({name: 'h.csv', mimeType: 'text/csv', buffer: Buffer.from(HOLDINGS)});
    await sheet.getByRole('button', {name: /^Next/}).click();
    await sheet.getByRole('button', {name: /^Next/}).click();
    await sheet.getByRole('button', {name: 'Add 2 assets to Wealth'}).click();
    await page.keyboard.press('Escape');
    const mix = page.getByRole('region', {name: 'Asset mix'});
    const total = await page.locator('.wealth-hero-total .wealth-total-headline').innerText();
    await expect(mix.locator('.class-summary').filter({hasText: 'Stablecoins'})).toContainText('1 asset');
    await mix.getByRole('checkbox', {name: /Count stablecoins as cash/}).check();
    await expect(mix.locator('.class-summary').filter({hasText: 'Stablecoins'})).toHaveCount(0);
    await expect(mix.locator('.class-summary').filter({hasText: 'Cash'})).toContainText('2 assets');
    await expect(page.locator('.wealth-hero-total .wealth-total-headline')).toHaveText(total);
    await page.reload(); await hydrated(page);
    await expect(page.getByRole('region', {name: 'Asset mix'}).getByRole('checkbox', {name: /Count stablecoins as cash/})).toBeChecked(); // remembered on this device
  });
});

test.describe('euro-area device', () => {
  test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', locale: 'en-IE'});
  test('P-DVR-22: a euro-area device starts a new account in EUR', async ({page}) => {
    await openWealth(page);
    await page.getByRole('button', {name: 'Add an account or debt'}).click();
    await expect(page.getByRole('form', {name: 'Add an account or debt'}).getByLabel('Currency')).toHaveValue('EUR');
  });
});

test.describe('phone 375, Light (the bot\'s MO-075 width)', () => {
  test.use({viewport: {width: 375, height: 844}, colorScheme: 'light', locale: 'en-US'});
  test('MO-075/MO-089 (P-MO-37): the import banner has two real buttons, left-aligned, neither wrapping', async ({page}) => {
    await openWealth(page);
    const sheet = await importHoldings(page);
    await sheet.locator('input[type=file]').setInputFiles({name: 'h.csv', mimeType: 'text/csv', buffer: Buffer.from(HOLDINGS)});
    await sheet.getByRole('button', {name: /^Next/}).click();
    await sheet.getByRole('button', {name: /^Next/}).click();
    await sheet.getByRole('button', {name: 'Add 2 assets to Wealth'}).click();
    await page.keyboard.press('Escape');
    const banner = page.locator('.import-banner');
    const undo = banner.getByRole('button', {name: 'Undo import'}), dismiss = banner.getByRole('button', {name: 'Dismiss this notice'});
    await expect(undo).toHaveClass(/\bsecondary\b/);
    for (const b of [undo, dismiss]) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeLessThan(64); // one line
      expect(await b.evaluate(el => getComputedStyle(el).borderTopStyle)).not.toBe('none');
    }
    expect(await banner.locator('p').first().evaluate(el => getComputedStyle(el).textAlign)).not.toBe('center');
  });
});

test.describe('Showcase, desktop 1280, Nebula', () => {
  test.use({viewport: {width: 1280, height: 800}, locale: 'en-US'});

  test('MO-158/N-MO-17 (P-MO-96): editing a holding below what Goals allocated asks once and says the shortfall; the asset page says it too', async ({page}) => {
    await offlineApi(page); await loadShowcase(page);
    await page.goto('/app/wealth/asset/showcase-usd'); await hydrated(page);
    await page.getByRole('button', {name: 'Edit asset'}).click();
    const edit = page.getByRole('dialog', {name: /^Edit /});
    await edit.getByLabel('Cash balance').fill('5000');
    await edit.getByRole('button', {name: 'Save changes'}).click();
    const check = edit.getByRole('status');
    await expect(check).toContainText(/5,000.* is less than the 7,500.* your Goals have allocated: 2,500.* over-allocated\./);
    await expect(edit).toBeVisible(); // nothing saved yet
    await edit.getByRole('button', {name: 'Keep this amount'}).click();
    await expect(edit).toHaveCount(0);
    await expect(page.locator('.asset-detail-grid')).toContainText(/2,500.* over-allocated: review these Goals/);
  });

  test('G-009 (P-DVR-88) / TK-194 (P-TK-51): a Goal\'s allocate list shows what each holding still has available', async ({page}) => {
    await offlineApi(page); await loadShowcase(page);
    await page.goto('/app/goals/tracked/9201#allocate'); await hydrated(page);
    await expect(page.locator('.picker-existing')).toContainText(/17,500(\.00)? available of 25,000(\.00)? USD/);
  });

  test('PR-080/BUG-041 (P-PR-39): Staking\'s sources count no public position without a public wallet, and say hand-entered covers all of Wealth', async ({page}) => {
    await offlineApi(page); await loadShowcase(page);
    await page.goto('/app/staking'); await hydrated(page);
    const counts = page.locator('.bottom-counts');
    await expect(counts.locator('div').filter({hasText: 'Observed public positions'}).locator('dd')).toHaveText('0');
    await expect(counts).toContainText('Positions entered by hand (all of Wealth)');
  });

  test('GAP-016 (P-DVG-62, C-DVG-62): the value chart gives time- and money-weighted returns for the range, labelled', async ({page}) => {
    await offlineApi(page); await loadShowcase(page);
    await page.goto('/app/portfolio'); await hydrated(page);
    await page.getByRole('tab', {name: 'Analysis', exact: true}).click();
    const chart = page.getByRole('region', {name: 'Value over time'});
    const returns = chart.getByRole('definition').first();
    await expect(chart.locator('.portfolio-returns')).toContainText('Time-weighted');
    await expect(chart.locator('.portfolio-returns')).toContainText('Money-weighted');
    await expect(returns).toHaveText(/^([+−][\d,.]+%|0%|—)$/);
    await expect(chart).toContainText('Time-weighted leaves out when you added or took out money');
  });
});
