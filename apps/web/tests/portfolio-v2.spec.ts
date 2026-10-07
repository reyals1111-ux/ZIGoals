import {expect, test, type Page} from '@playwright/test';

// Session W Part 15: Portfolio v2 (header, value over time, allocation, the holdings table, transactions, a coin's page,
// favourites, finding a coin) with MOCK market answers for quotes, insights, details and history; nothing reaches a real
// provider. The Showcase asks nothing. Figures below are worked out by hand from the fixture transactions and prices.
const KEY = 'zigoals:portfolio:v1', DAY = 86400000;
const day = (offset: number) => new Date(Date.now() - offset * DAY).toISOString().slice(0, 10);
const coin = (id: string, name: string, symbol: string) => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol});
const tx = (id: string, coinId: string, kind: string, quantity: string, offset: number, price?: string, fee?: string) => ({id, coin: `coingecko:coin:${coinId}`, kind, quantity, date: day(offset), note: '', createdAt: `${day(offset)}T12:00:00.000Z`, ...(price ? {price} : {}), ...(fee ? {fee} : {})});
const PORTFOLIOS = {version: 1, portfolios: [
  {id: 'p-real', name: 'Fictional real coins', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', coins: [coin('bitcoin', 'Bitcoin', 'BTC'), coin('ethereum', 'Ethereum', 'ETH')], transactions: [
    tx('t1', 'bitcoin', 'buy', '0.5', 40, '60000', '10'), tx('t2', 'ethereum', 'buy', '2', 25, '2000'), tx('t3', 'ethereum', 'sell', '0.5', 10, '2500', '5')]},
  {id: 'p-plan', name: 'A plan in euros', kind: 'hypothetical', currency: 'EUR', createdAt: '2026-01-01T00:00:00.000Z', coins: [coin('bitcoin', 'Bitcoin', 'BTC')], transactions: [tx('t4', 'bitcoin', 'buy', '0.1', 5, '50000')]},
]};
const PRICES: Record<string, Record<string, number>> = {USD: {bitcoin: 70000, ethereum: 3000, solana: 150}, EUR: {bitcoin: 64000}};
const CHANGE24: Record<string, string> = {bitcoin: '2', ethereum: '-1', solana: '5'};
const DETAILS: Record<string, object> = {
  bitcoin: {change1h: '0.5', change24h: '2', change7d: '-3.25', marketCap: {value: '1380000000000', decimals: 0}, volume24h: {value: '25000000000', decimals: 0}, circulatingSupply: {value: '19800000', decimals: 0}, totalSupply: {value: '19800000', decimals: 0}, maxSupply: {value: '21000000', decimals: 0}},
  ethereum: {change1h: '-0.25', change24h: '-1', change7d: '4', marketCap: {value: '360000000000', decimals: 0}, volume24h: {value: '12000000000', decimals: 0}, circulatingSupply: {value: '120000000', decimals: 0}, totalSupply: {value: '120000000', decimals: 0}, maxSupply: null},
  solana: {change1h: '1', change24h: '5', change7d: '10', marketCap: null, volume24h: null, circulatingSupply: null, totalSupply: null, maxSupply: null},
};
type Request = {marketRef: {provider: string; kind: string; id: string}; currency: string};
const key = (r: Request) => `${r.marketRef.provider}:${r.marketRef.kind}:${r.marketRef.id}:${r.currency}`;
async function market(page: Page, {details = 'live'}: {details?: 'live' | 'not-provided'} = {}) {
  const asked: {path: string; body: unknown}[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/market')) asked.push({path: url.pathname, body: request.postDataJSON?.() ?? null}); });
  await page.route('**/api/market-assets*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/market-quotes', route => { const body = route.request().postDataJSON() as {requests: Request[]}; return route.fulfill({json: {quotes: body.requests.filter(r => PRICES[r.currency]?.[r.marketRef.id]).map(r => ({base: {network: 'coingecko-coin', denom: r.marketRef.id, decimals: 0}, marketRef: r.marketRef, currency: r.currency, price: String(PRICES[r.currency]![r.marketRef.id]), priceDecimals: 0, source: 'CoinGecko', providerAssetId: r.marketRef.id, observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), verification: 'VERIFIED'})), error: null}}); });
  await page.route('**/api/market-insights', route => {
    const {requests} = route.request().postDataJSON() as {requests: Request[]}, now = new Date().toISOString();
    const entries = requests.map(r => ({...r, source: 'CoinGecko', marketBasis: 'coin', logoUrl: null, change24h: CHANGE24[r.marketRef.id] ?? null, observedAt: now, fetchedAt: now, sparkline: {range: '7d', timestamps: 'unavailable', fetchedAt: now, prices: [100, 104, 101, 109, 107, 112, 118].map(value => ({value: String(value), decimals: 0}))}}));
    return route.fulfill({json: {entries, results: Object.fromEntries(entries.map(e => [key(e), {insight: e, error: null, stale: false}])), error: null}});
  });
  await page.route('**/api/market-detail', route => {
    const {requests} = route.request().postDataJSON() as {requests: Request[]}, now = new Date().toISOString();
    if (details === 'not-provided') return route.fulfill({json: {results: Object.fromEntries(requests.map(r => [key(r), {detail: null, error: 'This market service does not provide these details yet.', stale: true}])), error: 'This market service does not provide these details yet.'}});
    return route.fulfill({json: {results: Object.fromEntries(requests.map(r => [key(r), DETAILS[r.marketRef.id] ? {detail: {...r, source: 'CoinGecko', ...DETAILS[r.marketRef.id], observedAt: now, fetchedAt: now}, error: null, stale: false} : {detail: null, error: 'Market details are unavailable. Last verified details are retained.', stale: true}])), error: null}});
  });
  await page.route('**/api/market-history', route => {
    const {request} = route.request().postDataJSON() as {request: Request & {range: string}}, days = {'1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365}[request.range]!, now = Date.now(), price = PRICES[request.currency]?.[request.marketRef.id] ?? 1;
    const points = Array.from({length: 24}, (_, i) => ({at: new Date(now - days * DAY + (i + 1) * days * DAY / 24 - 1000).toISOString(), value: String(price), decimals: 0}));
    return route.fulfill({json: {history: {...request, source: 'CoinGecko', fetchedAt: new Date(now).toISOString(), points}, error: null, stale: false, nextAttemptAt: now + 60000}});
  });
  return asked;
}
async function seed(page: Page, data: unknown = PORTFOLIOS) {
  await page.addInitScript(([k, value]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k as string, value as string); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [KEY, JSON.stringify(data)]);
}
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

test('the header, holdings and allocation from your transactions and the market: exact figures, unknown never zero', async ({page, isMobile}) => {
  const asked = await market(page);await seed(page);
  await page.goto('/app/portfolio');
  const totals = page.getByLabel('Fictional real coins totals');
  // BTC 0.5 × 70,000 + ETH 1.5 × 3,000; cost 30,010 + 3,000.
  await expect(totals).toContainText('Value$39,500.00');
  await expect(totals).toContainText('Cost basis$33,010.00');
  // 35,000 × 2/102 − 4,500 × 1/99 = 640.81…, of the value 24 hours ago 38,859.18.
  await expect(totals.locator('div').filter({hasText: '24h change'}).locator('dd')).toHaveText('+$640.81 (+1.65%)');
  // Unrealized 4,990 + 1,500; realized 2,500 × 0.5 − 5 − 1,000 = 245; of 34,010 invested.
  await expect(totals.locator('div').filter({hasText: 'All-time result'}).locator('dd')).toHaveText('+$6,735.00 (+19.8%)');
  await expect(totals).toContainText('Realized +$245.00 · unrealized +$6,490.00');
  const table = page.getByRole('table', {name: 'Fictional real coins holdings'});
  // Every column, including those a phone hides (the coin's page has them all).
  await expect(table.getByRole('columnheader', {includeHidden: true})).toHaveText(['Coin', 'Price', '1h', '24h', '7d', 'Last 7 days', 'Holdings', 'Value', 'Average cost', 'Result']);
  const btc = table.getByRole('row').filter({hasText: 'Bitcoin'});
  await expect(btc.getByRole('cell', {includeHidden: true})).toHaveText([/^\$70,000\.00CoinGecko · /, '+0.5% in 1 hour', '+2% in 24 hours', '−3.25% in 7 days', '', '0.5 BTC', '$35,000.00', '$60,020.00', '+$4,990.00+16.63%']);
  // Its words (a phone hides the column, so the label is read from the attribute on both projects).
  await expect(btc.getByRole('img', {includeHidden: true})).toHaveAttribute('aria-label', 'Bitcoin, last 7 days: from $100.00 to $118.00, up');
  await expect(table.getByRole('row').filter({hasText: 'Ethereum'}).getByRole('cell', {includeHidden: true}).nth(7)).toHaveText('$2,000.00');
  // A phone folds allocation away under its name.
  if (isMobile) await page.getByRole('button', {name: /^Allocation/}).click();
  const allocation = page.getByRole('region', {name: 'Allocation'});
  await expect(allocation.getByRole('listitem')).toHaveText(['BTC88.6%$35,000.00', 'ETH11.4%$4,500.00']);
  await expect(allocation.getByRole('img')).toHaveAccessibleName('Allocation of $39,500.00 known value: BTC 88.6%, ETH 11.4%');
  // The other portfolio is in euros and is never added in.
  await page.getByRole('button', {name: /A plan in euros/}).click();
  await expect(page.getByLabel('A plan in euros totals')).toContainText('Value€6,400.00');
  await expect(page.getByText('$39,500.00')).toHaveCount(0);
  // Market requests carry public coin identities only.
  for (const request of asked) expect(JSON.stringify(request.body ?? {})).not.toMatch(/quantity|0\.5|p-real|Fictional/);
});

test('value over time: one history per coin, one after another, for the chosen range; exact values in the table', async ({page}) => {
  const asked = await market(page);await seed(page);
  await page.goto('/app/portfolio');
  const chart = page.getByRole('region', {name: 'Value over time'});
  await expect(chart.getByRole('button', {name: '30D', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.getByRole('img')).toBeVisible();
  const histories = () => asked.filter(r => r.path === '/api/market-history').map(r => (r.body as {request: Request & {range: string}}).request).map(r => `${r.marketRef.id}:${r.range}`);
  await expect.poll(histories).toEqual(['bitcoin:30d', 'ethereum:30d']);
  await chart.getByText('View exact values').click();
  const rows = chart.getByRole('region', {name: 'Exact values'}).getByRole('row');
  await expect(rows.last()).toContainText('$39,500.00');
  await chart.getByRole('button', {name: '7D', exact: true}).click();
  await expect.poll(histories).toEqual(['bitcoin:30d', 'ethereum:30d', 'bitcoin:7d', 'ethereum:7d']);
  await expect(chart).toContainText('in this range, buys and sells included');
  await expect(chart).toContainText('The scale fits these values; it does not start at zero.');
});

test('a coin\'s page: price and changes, your position, market figures as observed, a transaction for this coin, favourites', async ({page}) => {
  await market(page);await seed(page);
  await page.goto('/app/portfolio');
  await page.getByRole('table', {name: 'Fictional real coins holdings'}).getByRole('link', {name: /Bitcoin/}).click();
  await expect(page).toHaveURL(/\/app\/portfolio\/coin\/bitcoin\?portfolio=p-real$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Bitcoin'})).toBeVisible();
  await expect(page.locator('.portfolio-coin-price strong')).toHaveText('$70,000.00');
  await expect(page.locator('.portfolio-coin-changes')).toContainText('1h+0.5% in 1 hour24h+2% in 24 hours7d−3.25% in 7 days');
  const position = page.getByRole('region', {name: 'Your BTC in Fictional real coins'});
  await expect(position).toContainText('Holdings0.5 BTC');await expect(position).toContainText('Value$35,000.00');await expect(position).toContainText('Average cost$60,020.00');
  await expect(position).toContainText('Unrealized result+$4,990.00');await expect(position).toContainText('Realized result+$0.00');
  const facts = page.getByRole('region', {name: 'Market figures'});
  await expect(facts.locator('dd')).toHaveText(['$1.38T', '$25B', '19.8M BTC', '19.8M BTC', '21M BTC']);
  await expect(facts.locator('dd').first()).toHaveAttribute('title', '$1,380,000,000,000.00');
  await facts.getByText('Exact figures').click();
  await expect(facts.getByRole('row').first()).toHaveText('Market cap$1,380,000,000,000.00');
  await page.getByText('Record a BTC transaction').click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await expect(form).toContainText('Coin: Bitcoin BTC · in Fictional real coins');
  await form.getByLabel('Quantity').fill('0.1');await form.getByLabel('Price per coin (USD)').fill('71000');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Buy of BTC recorded.'})).toBeVisible();
  await expect(position).toContainText('Holdings0.6 BTC');
  expect((await stored(page)).portfolios[0].transactions.at(-1)).toMatchObject({coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.1', price: '71000'});
  const favourite = page.getByRole('region', {name: 'Favourite markets'});
  await favourite.getByRole('button', {name: 'Add to favourites'}).click();
  await expect(favourite.getByRole('button', {name: 'Remove from favourites'})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? '{}').watchlist?.map((f: {name: string}) => f.name))).toEqual(['Bitcoin']);
});

test('an older market service: 1h, 7d and the market figures read "Not provided", never zero', async ({page}) => {
  await market(page, {details: 'not-provided'});await seed(page);
  await page.goto('/app/portfolio');
  const btc = page.getByRole('table', {name: 'Fictional real coins holdings'}).getByRole('row').filter({hasText: 'Bitcoin'});
  const cells = btc.getByRole('cell', {includeHidden: true});
  await expect(cells.nth(1)).toHaveText('Not provided in 1 hour');
  await expect(cells.nth(2)).toHaveText('+2% in 24 hours');
  await expect(cells.nth(3)).toHaveText('Not provided in 7 days');
  await page.goto('/app/portfolio/coin/ethereum?portfolio=p-real');
  const facts = page.getByRole('region', {name: 'Market figures'});
  await expect(facts.locator('dd')).toHaveText(Array(5).fill('Not provided'));
  await expect(facts).toContainText('This market service does not provide these figures yet.');
});

test('find a coin you do not hold: its page, with nothing of yours yet', async ({page}) => {
  await market(page);await seed(page);
  await page.goto('/app/portfolio');
  const search = page.getByRole('region', {name: 'Find a coin'});
  await search.getByLabel('Coin name or symbol').fill('sol');
  await search.getByRole('link', {name: /Solana/}).click();
  await expect(page).toHaveURL(/\/app\/portfolio\/coin\/solana\?portfolio=p-real$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Solana'})).toBeVisible();
  await expect(page.getByText('You have no SOL in Fictional real coins yet.')).toBeVisible();
  await expect(page.getByRole('region', {name: 'Market figures'}).locator('dd')).toHaveText(Array(5).fill('Not provided'));
});

test('Showcase: the whole page and a coin\'s page from labelled fixtures, and nothing asked of any market', async ({page}) => {
  const asked = await market(page);
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/settings');await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();await page.waitForURL('**/app');
  const before = asked.length;
  await page.goto('/app/portfolio');
  const totals = page.getByLabel('Fictional long-term coins totals');
  await expect(totals).toContainText('Value$8,450.00');
  await expect(totals.locator('div').filter({hasText: '24h change'}).locator('dd')).toHaveText(/^[+−]\$[\d,]+\.\d{2} \([+−][\d.]+%\)$/);
  await expect(totals.locator('div').filter({hasText: 'All-time result'}).locator('dd')).toHaveText('Unknown');
  await expect(page.getByRole('table', {name: 'Fictional long-term coins holdings'}).getByRole('row')).toHaveCount(4);
  await expect(page.getByRole('region', {name: 'Value over time'})).toContainText('The Showcase’s fixture prices, not market data.');
  await page.goto('/app/portfolio/coin/solana');
  await expect(page.getByRole('heading', {level: 1, name: 'Solana'})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Market figures'})).toContainText('Showcase fixture figures, not market data.');
  await expect(page.getByRole('region', {name: 'Your SOL in Fictional long-term coins'})).toContainText('Unrealized resultUnknown');
  expect(asked.slice(before).map(r => r.path)).toEqual([]);
});

test('phone: the coin, its 24h change, value and result; allocation and transactions fold; no sideways scroll; 44 px targets', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone layout only.');
  await market(page);await seed(page);
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/portfolio');
  const table = page.getByRole('table', {name: 'Fictional real coins holdings'});
  await expect(table.getByRole('columnheader').filter({visible: true})).toHaveText(['Coin', '24h', 'Value', 'Result']);
  await expect(page.getByRole('button', {name: /^Allocation/})).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', {name: /^Transactions/})).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for (const control of await page.locator('main :is(button, select, a.portfolio-coin-link)').all()) if (await control.isVisible()) expect((await control.boundingBox())!.height, await control.innerText()).toBeGreaterThanOrEqual(44);
});
