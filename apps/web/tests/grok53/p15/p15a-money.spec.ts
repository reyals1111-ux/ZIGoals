import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

/**
 * Session AL Part 15, lane P15-A (money): Wealth, Portfolio and the money import. Fresh profile, desktop 1280, every /api
 * request answered 503 except the market quotes, which a fixture answers (fictional prices), and every public node a
 * balance reader would ask refused, so nothing leaves the browser. Fictional data only.
 * - GAP-021 (C-TK-07): Portfolio copies a coin into Wealth once; Wealth says it already tracks it after that.
 * - GAP-025 (C-TK-11): the coin's Wealth page shows its gain or loss from Portfolio's records, in Portfolio's currency.
 * - GAP-023 (C-TK-09): Wealth looks up a pasted public address with no account; a mistyped one is refused under the field.
 * - GAP-008 (C-DVG-51): a Monarch export is recognised by its header row in Wealth's bank import and its columns pre-matched.
 */
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'UTC'});
const ZIG = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
async function offline(page: Page, btcUsd = '6400000') {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(/publicnode\.com|mempool\.space/, route => route.abort('connectionrefused'));
  const at = new Date(Date.now() - 60_000).toISOString();
  await page.route(url => url.pathname === '/api/market-quotes', async route => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {requests?: {marketRef: {kind: string; id: string}; currency: string}[]};
    await route.fulfill({json: {quotes: (body.requests ?? []).filter(q => q.marketRef.id === 'bitcoin' && q.currency === 'USD').map(q => ({
      base: {network: `coingecko-${q.marketRef.kind}`, denom: q.marketRef.id, decimals: 0}, marketRef: q.marketRef, currency: q.currency, price: btcUsd, priceDecimals: 2,
      source: 'CoinGecko', providerAssetId: q.marketRef.id, observedAt: at, fetchedAt: at, verification: 'VERIFIED'}))}});
  });
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
}
const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});

test('GAP-021 + GAP-025: Portfolio copies BTC into Wealth once, and the coin’s Wealth page shows its gain from Portfolio’s cost', async ({page}) => {
  await chooseChain(page); await offline(page);
  await page.goto('/app/portfolio'); await hydrated(page);
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill('Fictional coins');
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Quantity').fill('0.5');
  await form.getByLabel('Price per coin (USD)').fill('60000');
  await form.getByLabel('Date').fill('2026-09-01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Buy of BTC recorded.'})).toBeVisible();

  await page.goto('/app/portfolio/coin/bitcoin'); await hydrated(page);
  const copy = page.getByRole('region', {name: 'Copy to Wealth'});
  await expect(copy).toContainText('A copy: later trades here do not change Wealth.');
  await copy.getByRole('button', {name: 'Copy 0.5 BTC to Wealth'}).click();
  await expect(page.locator('.aa-toast').last()).toContainText('0.5 BTC copied to Wealth.');
  // One source: once Wealth tracks the coin, Portfolio says so and offers no second copy.
  await expect(copy).toContainText('Wealth already tracks BTC');
  await expect(copy.getByRole('button')).toHaveCount(0);
  await copy.getByRole('link', {name: 'Open it in Wealth →'}).click();
  await hydrated(page);

  const result = page.getByRole('region', {name: 'What your BTC cost, and what it is worth'});
  await expect(result).toBeVisible();
  // 0.5 BTC bought at 60,000 USD (cost 30,000); at the fixture's 64,000 it is worth 32,000: +2,000 (+6.7 %).
  await expect(result).toContainText(/Fictional coins: 0\.5 BTC, cost (US)?\$30,000(\.00)? \(average (US)?\$60,000(\.00)? per BTC\); worth (US)?\$32,000(\.00)? now: \+(US)?\$2,000(\.00)? \(\+6\.7\s?%\)\./);
  await expect(result).toContainText('an estimate, not realised, and information only');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? '{}').positions?.filter((p: {marketRef?: {id: string}}) => p.marketRef?.id === 'bitcoin').length)).toBe(1);
});

test('GAP-025: with no current price the gain is not shown (never 0), only what it cost', async ({page}) => {
  await chooseChain(page); await offline(page);
  await page.route(url => url.pathname === '/api/market-quotes', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/portfolio'); await hydrated(page);
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill('Fictional coins');
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Quantity').fill('0.5');
  await form.getByLabel('Price per coin (USD)').fill('60000');
  await form.getByLabel('Date').fill('2026-09-01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await page.goto('/app/portfolio/coin/bitcoin'); await hydrated(page);
  await page.getByRole('region', {name: 'Copy to Wealth'}).getByRole('button', {name: 'Copy 0.5 BTC to Wealth'}).click();
  await page.locator('.aa-toast').last().getByRole('link', {name: 'Open in Wealth'}).click();
  await hydrated(page);
  const result = page.getByRole('region', {name: 'What your BTC cost, and what it is worth'});
  await expect(result).toContainText('No current price in USD just now.');
  await expect(result.locator('li')).toContainText(/cost (US)?\$30,000/);
  await expect(result.locator('li')).not.toContainText(/worth|\+|\$0\b/);
});

test('GAP-023: Wealth looks up a pasted ZIGChain address with no account; a mistyped one is refused under its field', async ({page}) => {
  await chooseChain(page); await offline(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const lookup = page.getByRole('region', {name: 'Look up an address'});
  await expect(lookup).toContainText('No account and no wallet app needed');
  await lookup.getByRole('button', {name: 'Look up an address'}).click();
  const field = lookup.getByLabel('Public address');
  await field.fill(`${ZIG.slice(0, -1)}q`);
  await lookup.getByRole('button', {name: 'Look up'}).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(lookup.locator('.field-error')).toContainText('checksum does not match');
  await field.fill('vitalik.eth');
  await lookup.getByRole('button', {name: 'Look up'}).click();
  await expect(lookup.locator('.field-error')).toContainText('not looked up');
  await field.fill(ZIG);
  await lookup.getByLabel('Name (optional)').fill('Fictional savings');
  await lookup.getByRole('button', {name: 'Look up'}).click();
  await expect(lookup.getByRole('status')).toContainText(/Fictional savings zig18vyk…ntzx is linked, read-only\. Its balances on ZIGChain and Cosmos Hub are read in What you have above\./);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:linked-wallets:v1') ?? '{}'));
  expect(stored.wallets).toEqual([expect.objectContaining({kind: 'cosmos', address: ZIG, label: 'Fictional savings', via: 'typed'})]);
  // The same address twice is refused, with the reason under the field.
  await lookup.getByRole('button', {name: 'Look up an address'}).click();
  await lookup.getByLabel('Public address').fill(ZIG);
  await lookup.getByRole('button', {name: 'Look up'}).click();
  await expect(lookup.locator('.field-error')).toContainText('already linked on this device');
});

test('GAP-023: a person who never chose the chain sees no address lookup on Wealth', async ({page}) => {
  await offline(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('region', {name: 'Look up an address'})).toHaveCount(0);
});

test('GAP-008: a Monarch export is recognised in Wealth’s bank import and its columns are matched by their own names', async ({page}) => {
  await offline(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: /Import from your bank/}).first().click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  const csv = 'Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags\n2026-10-03,Streaming Service,Subscriptions,Checking,STREAMING*SVC,,-12.99,\n2026-10-25,Example Employer,Paychecks,Checking,PAYROLL OCT,Salary,2400.00,\n';
  await sheet.getByLabel('CSV file').setInputFiles({name: 'monarch-transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await expect(sheet.locator('.import-preset')).toContainText('This looks like a Monarch export. Its columns are matched by their own names: a minus sign is money out');
  await expect(sheet.locator('.import-unused')).toContainText('Original Statement');
  await sheet.getByRole('button', {name: 'Next'}).click();
  await expect(sheet.locator('.import-summary')).toContainText('2 rows read');
  await expect(sheet).toContainText('Streaming Service');
  await expect(sheet).toContainText('Example Employer');
});
