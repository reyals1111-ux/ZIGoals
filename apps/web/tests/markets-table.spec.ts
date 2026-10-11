import {expect, test, type Page} from '@playwright/test';

// Session W Part 16: Markets as a table (the shared market table, change and sparkline of Portfolio v2), with MOCK
// market answers. Cards stay the default; only the table asks for coins' details (1h/7d change, market cap).
type Request = {marketRef: {provider: string; kind: string; id: string; assetType?: string}; currency: string};
const key = (r: Request) => `${r.marketRef.provider}:${r.marketRef.kind}:${r.marketRef.id}:${r.currency}`;
// ZIG's quote has its own native identity rules; it and the tokenized references are left unpriced here ("Price
// unavailable"), and the answer says so, as the route does (an incomplete answer without an error is refused).
const QUOTES: Record<string, [string, number]> = {bitcoin: ['70000', 0], ethereum: ['3000', 0], solana: ['150', 0], 'usd-coin': ['1', 0]};
const CHANGE24: Record<string, string> = {bitcoin: '2', ethereum: '-1', solana: '5', 'usd-coin': '0', zignaly: '-4'};
const DETAILS: Record<string, [string | null, string | null, string | null]> = {bitcoin: ['0.5', '-3.25', '1380000000000'], ethereum: ['-0.25', '4', '360000000000'], solana: ['1', '10', '70000000000'], 'usd-coin': ['0', '0', '75000000000'], zignaly: [null, null, null]};
async function market(page: Page) {
  const details: Request[][] = [];
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.route('**/api/market-assets*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/market-quotes', route => { const {requests} = route.request().postDataJSON() as {requests: Request[]}, now = new Date().toISOString(); return route.fulfill({json: {quotes: requests.filter(r => QUOTES[r.marketRef.id]).map(r => ({base: {network: 'coingecko-coin', denom: r.marketRef.id, decimals: 0}, marketRef: r.marketRef, currency: r.currency, price: QUOTES[r.marketRef.id]![0], priceDecimals: QUOTES[r.marketRef.id]![1], source: 'CoinGecko', providerAssetId: r.marketRef.id, observedAt: now, fetchedAt: now, verification: 'VERIFIED'})), error: requests.every(r => QUOTES[r.marketRef.id]) ? null : 'Some markets have no price in this fixture.'}}); });
  await page.route('**/api/market-insights', route => {
    const {requests} = route.request().postDataJSON() as {requests: Request[]}, now = new Date().toISOString();
    const entries = requests.map(r => { const coin = r.marketRef.kind === 'coin'; return {...r, source: coin ? 'CoinGecko' : 'CoinGecko tokenized RWA reference', marketBasis: coin ? 'coin' : 'tokenized', logoUrl: null, change24h: coin ? CHANGE24[r.marketRef.id] ?? null : null, observedAt: coin ? now : null, fetchedAt: now, sparkline: coin ? {range: '7d', timestamps: 'unavailable', fetchedAt: now, prices: [100, 104, 101, 109, 107, 112, 118].map(value => ({value: String(value), decimals: 0}))} : null}; });
    return route.fulfill({json: {entries, results: Object.fromEntries(entries.map(e => [key(e), {insight: e, error: null, stale: false}])), error: null}});
  });
  await page.route('**/api/market-detail', route => {
    const {requests} = route.request().postDataJSON() as {requests: Request[]}, now = new Date().toISOString();details.push(requests);
    return route.fulfill({json: {results: Object.fromEntries(requests.map(r => { const [h1, d7, cap] = DETAILS[r.marketRef.id] ?? [null, null, null]; return [key(r), {detail: {...r, source: 'CoinGecko', change1h: h1, change24h: CHANGE24[r.marketRef.id] ?? null, change7d: d7, marketCap: cap ? {value: cap, decimals: 0} : null, volume24h: null, circulatingSupply: null, totalSupply: null, maxSupply: null, observedAt: now, fetchedAt: now}, error: null, stale: false}]; })), error: null}});
  });
  return details;
}
const names = (page: Page) => page.getByRole('table', {name: 'Markets'}).locator('tbody th strong').allInnerTexts();

test('cards stay the default; the table shows each market\'s price, 1h/24h/7d, its 7-day line and market cap as observed', async ({page}) => {
  const details = await market(page);
  await page.goto('/app/markets');
  const layout = page.getByRole('group', {name: 'Show markets as'});
  await expect(layout.getByRole('button', {name: 'Cards'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.markets-grid')).toBeVisible();
  expect(details).toEqual([]);
  await layout.getByRole('button', {name: 'Table'}).click();
  const table = page.getByRole('table', {name: 'Markets'});
  await expect(table.getByRole('columnheader', {includeHidden: true})).toHaveText(['Market', 'Price', '1h', '24h', '7d', 'Last 7 days', 'Market cap', 'Favourite']);
  // Only coins are asked for details, in one request.
  await expect.poll(() => details.map(batch => batch.map(r => r.marketRef.id).sort())).toEqual([['bitcoin', 'ethereum', 'solana', 'usd-coin', 'zignaly']]);
  await expect(table.getByRole('row').filter({hasText: 'Bitcoin'}).getByRole('cell', {includeHidden: true})).toHaveText(['$70,000.00Current', '+0.5% in 1 hour', '+2% in 24 hours', '−3.25% in 7 days', '', '$1.38T', '☆']);
  await expect(table.getByRole('row').filter({hasText: 'Bitcoin'}).locator('td[class="data-col-wide"] span')).toHaveAttribute('title', '$1,380,000,000,000.00');
  await expect(table.getByRole('row').filter({hasText: 'ZIG'}).getByRole('cell', {includeHidden: true})).toHaveText(['Price unavailable', 'Not provided in 1 hour', '−4% in 24 hours', 'Not provided in 7 days', '', 'Not provided', '☆']);
  await expect(table.getByRole('row').filter({hasText: 'Nvidia'}).getByRole('cell', {includeHidden: true})).toHaveText(['Price unavailable', 'Not provided in 1 hour', 'Not provided in 24 hours', 'Not provided in 7 days', 'Not provided', 'Not provided', '☆']);
  await expect(table.getByRole('row').filter({hasText: 'Bitcoin'}).getByRole('img', {includeHidden: true})).toHaveAttribute('aria-label', 'Bitcoin, last 7 days: from $100.00 to $118.00, up');
});

test('the table sorts by 24h change, market cap or name, with what is not known last', async ({page}) => {
  await market(page);
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  await expect(page.getByRole('table', {name: 'Markets'}).getByRole('row').filter({hasText: 'Bitcoin'})).toContainText('$1.38T');
  const sort = page.getByLabel('Sort');
  await sort.selectOption({label: '24h change'});
  await expect.poll(() => names(page)).toEqual(['Solana', 'Bitcoin', 'USD Coin', 'Ethereum', 'ZIG', 'Apple', 'Gold', 'Nvidia', 'Silver', 'Vanguard S&P 500 ETF']);
  await sort.selectOption({label: 'Market cap'});
  await expect.poll(() => names(page)).toEqual(['Bitcoin', 'Ethereum', 'USD Coin', 'Solana', 'Apple', 'Gold', 'Nvidia', 'Silver', 'Vanguard S&P 500 ETF', 'ZIG']);
  await sort.selectOption({label: 'Name'});
  await expect.poll(() => names(page)).toEqual(['Apple', 'Bitcoin', 'Ethereum', 'Gold', 'Nvidia', 'Silver', 'Solana', 'USD Coin', 'Vanguard S&P 500 ETF', 'ZIG']);
});

test('a favourite from the table is the same favourite on the cards', async ({page}) => {
  await market(page);
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  await page.getByRole('table', {name: 'Markets'}).getByRole('button', {name: 'Add Bitcoin favourite'}).click();
  await expect(page.getByRole('table', {name: 'Markets'}).getByRole('button', {name: 'Remove Bitcoin favourite'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.markets-intro-card strong')).toHaveText('1 / 8');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Cards'}).click();
  await expect(page.locator('.markets-grid').getByRole('button', {name: 'Remove Bitcoin favourite'})).toHaveAttribute('aria-pressed', 'true');
});

test('phone: the table keeps the market, price, 24h change and star; no sideways scroll; 44 px stars', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone layout only.');
  await market(page);
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  const table = page.getByRole('table', {name: 'Markets'});
  await expect(table.getByRole('columnheader')).toHaveText(['Market', 'Price', '24h', 'Favourite']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for (const star of await table.getByRole('button').all()) if (await star.isVisible()) expect((await star.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
