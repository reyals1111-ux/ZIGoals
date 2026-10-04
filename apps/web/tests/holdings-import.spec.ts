import {expect, test, type Page} from '@playwright/test';
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';
import {PLATFORM_KEY} from '../lib/positions';
import {IMPORT_UNDO_KEY} from '../lib/import/undo-schema';
import {isPhone} from './phone-nav';

// W3 (Session P): transactions and holdings from a CSV, read on the device, previewed, imported atomically, undone in one tap.
const TX_CSV = 'Date,Type,Pair,Amount,Price,Fee,Note\n2026-09-01,Buy,BTC,0.5,60000,10,first\n2026-09-02,Deposit,ETH,2,,,\n2026-09-03,Sell,BTC,0.2,65000,,\n2026-09-04,Buy,DOGE,100,0.1,,\n';
const HOLDINGS_CSV = 'Name,Asset,Quantity,Kind of asset,Value,Currency\nGold,XAU,2,Precious metals,,EUR\nSavings,,1500,Cash,,EUR\n';
const CELLS = ['60000', 'DOGE', 'first', 'XAU', 'Savings', '1500'];
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const key = (page: Page, name: string) => page.evaluate(k => localStorage.getItem(k), name);
function watchRequests(page: Page) {
  const seen: {url: string; body: string | null; host: string}[] = [];
  page.on('request', request => seen.push({url: request.url(), body: request.postData(), host: new URL(request.url()).hostname}));
  return seen;
}
const leaksNothing = (seen: {url: string; body: string | null; host: string}[]) => {
  expect(new Set(seen.map(r => r.host))).toEqual(new Set(['127.0.0.1']));
  for (const r of seen) for (const cell of CELLS) { expect(r.url, cell).not.toContain(cell); expect(r.body ?? '', cell).not.toContain(cell); }
};

test('Portfolio: four rows, one unknown coin skipped, three transactions imported and undone', async ({page}) => {
  await page.goto('/app/portfolio');
  await page.getByLabel('Portfolio name').fill('Long-term');
  await page.getByRole('button', {name: 'Create portfolio', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Long-term', exact: true})).toBeVisible();
  const before = await key(page, PORTFOLIO_KEY);
  const seen = watchRequests(page);
  await page.getByRole('button', {name: 'Import transactions from a CSV', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import transactions', exact: true});
  await expect(panel).toBeVisible();
  if (await isPhone(page)) await expect(page.getByRole('dialog', {name: 'Import transactions'})).toBeVisible();
  await panel.getByLabel('CSV file').setInputFiles({name: 'transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(TX_CSV)});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await expect(panel.getByLabel(/^Coin · required/)).toHaveValue('2');
  await expect(panel.getByLabel(/^Type/)).toHaveValue('1');
  await expect(panel.getByLabel(/^Quantity · required/)).toHaveValue('3');
  await expect(panel.getByLabel(/^Date · required/)).toHaveValue('0');
  await expect(panel.getByLabel(/^Dates are/)).toHaveValue('iso');
  if (await isPhone(page)) expect(await panel.getByLabel(/^Coin · required/).evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
  await expect(panel.getByLabel(/^Portfolio/)).toContainText('Long-term');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.getByRole('heading', {name: /Step 3 of 4/})).toBeVisible();
  await expect(panel.locator('.import-summary')).toHaveText('3 rows ready · 1 unknown coin · 0 rows refused');
  await expect(panel.getByRole('list', {name: 'Unrecognised coins'})).toContainText('Row 4: “DOGE” is not recognised');
  await expect(panel.getByRole('button', {name: 'Next', exact: true})).toBeDisabled();
  await panel.getByRole('button', {name: 'Skip row', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('3 rows ready · 0 unknown coins · 0 rows refused');
  await expect(panel.locator('.import-preview')).toContainText('Bitcoin');
  await expect(panel.locator('.import-preview')).toContainText('Transfer in');
  if (await isPhone(page)) expect(await panel.locator('.import-preview').evaluate(el => getComputedStyle(el).overflowX)).toBe('auto');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 3 transactions into Long-term', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('3 transactions imported into Long-term.');
  const stored = JSON.parse((await key(page, PORTFOLIO_KEY))!);
  const ids = stored.portfolios[0].transactions.map((t: {id: string}) => t.id) as string[];
  expect(ids).toHaveLength(3);
  for (const id of ids) expect(id).toMatch(/^imp_[0-9a-f-]{36}_[123]$/);
  expect(stored.portfolios[0].coins.map((c: {symbol: string}) => c.symbol)).toEqual(['BTC', 'ETH']);
  const ledger = JSON.parse((await key(page, IMPORT_UNDO_KEY))!);
  expect(ledger.imports[0]).toMatchObject({kind: 'portfolio', createdIds: [...ids, 'coin:coingecko:coin:bitcoin', 'coin:coingecko:coin:ethereum'], label: '3 transactions imported into Long-term'});
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  const banner = page.locator('.import-banner');
  await expect(banner).toContainText('3 transactions imported into Long-term.');
  const undo = banner.getByRole('button', {name: 'Undo', exact: true});
  expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await undo.click();
  await expect(banner).toHaveCount(0);
  expect(await key(page, PORTFOLIO_KEY)).toBe(before);
  expect(JSON.parse((await key(page, IMPORT_UNDO_KEY))!).imports).toEqual([]);
  leaksNothing(seen);
});

test('Wealth: two holdings become manual assets, one without a valuation; Undo removes both', async ({page}) => {
  await page.goto('/app/wealth');
  const before = await key(page, PLATFORM_KEY);
  const seen = watchRequests(page);
  await page.getByRole('button', {name: '+ Add asset', exact: true}).first().click();
  await page.getByRole('button', {name: 'Import from a CSV file', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import holdings', exact: true});
  await expect(panel).toBeVisible();
  await panel.getByLabel('CSV file').setInputFiles({name: 'holdings.csv', mimeType: 'text/csv', buffer: Buffer.from(HOLDINGS_CSV)});
  await expect(panel.getByLabel(/^Name · required/)).toHaveValue('0');
  await expect(panel.getByLabel(/^Currency · required/)).toHaveValue('5');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('2 rows ready · 0 rows refused');
  await expect(panel.locator('.import-preview')).toContainText('Needs valuation');
  await expect(panel.locator('.import-preview')).toContainText('1500 EUR');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Add 2 assets to Wealth', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('2 assets added to Wealth.');
  const platform = JSON.parse((await key(page, PLATFORM_KEY))!);
  expect(platform.positions.map((p: {providerId: string; sourceType: string}) => [p.providerId, p.sourceType])).toEqual([['Gold', 'MANUAL'], ['Savings', 'MANUAL']]);
  expect(platform.positions[0].valuation).toBeUndefined();
  expect(platform.positions[1].valuation).toMatchObject({currency: 'EUR'});
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await page.getByRole('button', {name: 'Close dialog', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Your assets', exact: true})).toContainText('Gold');
  await expect(page.getByRole('region', {name: 'Your assets', exact: true})).toContainText('Needs valuation');
  const banner = page.locator('.import-banner');
  await expect(banner).toContainText('2 assets added to Wealth.');
  await banner.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(banner.getByRole('alert')).toHaveCount(0);
  await expect(banner).toHaveCount(0);
  expect(JSON.parse((await key(page, PLATFORM_KEY))!).positions).toEqual([]);
  if (before !== null) expect(JSON.parse((await key(page, PLATFORM_KEY))!).positions).toEqual(JSON.parse(before).positions);
  leaksNothing(seen);
});
