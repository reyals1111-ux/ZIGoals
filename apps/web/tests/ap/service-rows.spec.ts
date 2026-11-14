import {expect, test, type Page} from '@playwright/test';
import {ROUTES, start, type ServiceRowsHarness} from '../../../../scripts/run11/service-rows/harness.mjs';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../lib/dashboard-settings';
import {emptyPlatform, type Position} from '../../lib/positions';
import {automaticSourcePosition} from '../../components/platform/asset-source';
import type {MarketCatalogAsset} from '../../lib/market-assets';
import {hydrated} from '../ah-helpers';

/**
 * Session AP Part 3 ("service rows replayed honestly"): the carried "Needs a service" rows (docs/review/session-al/CARRIED.md)
 * on screen. The app's pages come from the server under test (PLAYWRIGHT_BASE_URL, e.g. the production server on :3101);
 * every same-origin request to a route the harness serves (scripts/run11/service-rows/harness.mjs, its ROUTES) is answered
 * by the repo's own route code, market coordinator and food Worker running in Miniflare against recorded-shape upstream
 * answers (scripts/run11/service-rows/fixtures). Every other same-origin request continues to the server under test;
 * every request to another host is aborted, except the chess sites, which this spec answers itself (X3-29).
 *
 * EVIDENCE RUN BY THE OWNER'S INTEGRATOR, LOCALLY ONLY: the whole file is skipped unless AP_SERVICE_ROWS=1, so CI's main
 * shards never start Miniflare. Desktop project only (no row here is phone-specific).
 *   AP_SERVICE_ROWS=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test tests/ap/service-rows.spec.ts --project=desktop --workers=1
 * One harness per worker (beforeAll). Fixture ages are relative to "now": bitcoin's quote 30 s, cardano's 40 min, the LCD
 * block 2 s, proposal #43 ends in 2 days. Prices: BTC $97,012.34 → $97,588.90 after setQuoteVariant(2), ZIG $0.08341 → $0.08512.
 */
const ENABLED = process.env.AP_SERVICE_ROWS === '1';
test.skip(!ENABLED, 'Local evidence only: set AP_SERVICE_ROWS=1 (starts Miniflare).');
test.skip(({isMobile}) => isMobile, 'Desktop project only.');

let h: ServiceRowsHarness | undefined, variant: 1 | 2 = 1;
test.beforeAll(async ({}, testInfo) => {
  if (!ENABLED || testInfo.project.name !== 'desktop') return;
  h = await start({bundle: null});
});
test.afterAll(async () => { await h?.stop(); h = undefined; });
test.afterEach(async () => { if (h && variant !== 1) { await h.setQuoteVariant(1); variant = 1; } });

const harness = () => { if (!h) throw Error('The service-rows harness did not start.'); return h; };
const local = (url: URL) => url.hostname === '127.0.0.1' || url.hostname === 'localhost';
/** The harness's routes answer from the harness; every other same-origin request continues; any other host is refused. */
async function serviceRoutes(page: Page) {
  const origin = harness().origin;
  await page.context().route(url => !local(url), route => route.abort('blockedbyclient'));
  await page.route(url => local(url) && Object.hasOwn(ROUTES, url.pathname), async route => {
    const url = new URL(route.request().url());
    // route.fetch keeps the request's method, headers and body; only the address changes.
    await route.fulfill({response: await route.fetch({url: origin + url.pathname + url.search})});
  });
}
/** A device that has seen the welcome and chose the chain modules (tests/chain-choice.ts's record), with `records` stored. */
async function device(page: Page, records: Record<string, unknown> = {}) {
  await serviceRoutes(page);
  await page.goto('/manifest.webmanifest');
  const values: Record<string, string> = {
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    'zigoals:earn-prefs:v1': JSON.stringify({version: 1, pageShown: true}),
  };
  for (const [k, v] of Object.entries(records)) values[k] = JSON.stringify(v);
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const coin = (id: string, name: string, symbol: string): MarketCatalogAsset => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol, platforms: {}});
const BTC = coin('bitcoin', 'Bitcoin', 'btc'), ZIG = coin('zignaly', 'ZIGChain', 'zig'), ADA = coin('cardano', 'Cardano', 'ada');
const GOLD: MarketCatalogAsset = {ref: {provider: 'coingecko', kind: 'rwa', id: 'gold', assetType: 'commodity'}, name: 'Gold', symbol: 'XAU'};
/** The holding Wealth → Add asset writes for a catalog asset (components/platform/asset-source.ts). */
const holding = (asset: MarketCatalogAsset, quantity: string, currency: 'USD' | 'EUR' = 'USD'): Position =>
  automaticSourcePosition({asset, assetClass: asset.ref.kind === 'rwa' ? 'Precious Metals' : 'Crypto', quantity, currency});
const platform = (positions: Position[] = [], watchlist: {ref: MarketCatalogAsset['ref']; name: string; symbol: string}[] = []) => ({'zigoals:platform:v1': {...emptyPlatform(), positions, watchlist}});
const card = (page: Page, name: string) => page.locator('#holdings article.owned-asset-card').filter({has: page.getByRole('heading', {name, exact: true})});
const marketCard = (page: Page, name: string) => page.locator('.markets-grid article.market-product-card').filter({has: page.getByRole('heading', {name, exact: true})});
const space = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();
/** What formatDateTime writes for `at` in `timeZone` in this suite's en-US locale ("Nov 14, 2026, 4:34 PM"). */
const zoned = (at: string, timeZone: string) => space(new Intl.DateTimeFormat('en-US', {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone}).format(new Date(at)));
const WALLET = 'zig18td9furcnzh9n0p5c0au8ck350h3h5l4nlh065';

test('TK "\'Current\' badge on stale prices": a fresh price is Current, a 40-minute-old one and an aged one are not', async ({page}) => {
  await device(page, platform([], [{ref: ADA.ref, name: 'Cardano', symbol: 'ADA'}]));
  await page.clock.install({time: new Date()});
  await page.goto('/app/markets'); await hydrated(page);
  const btc = marketCard(page, 'Bitcoin'), ada = marketCard(page, 'Cardano');
  await expect(btc.locator('.market-card-price strong')).toHaveText('$97,012.34');
  await expect(btc.locator('.freshness-badge')).toHaveText('Current');
  await expect(ada.locator('.market-card-price strong')).toHaveText('$0.7123');
  await expect(ada.locator('.freshness-badge')).toHaveText('Needs refresh');
  // The same fresh quote, 16 minutes later on this device's clock, is no longer "Current".
  await page.clock.fastForward('16:00');
  await expect(btc.locator('.freshness-badge')).toHaveText('Needs refresh');
});

test('D-262: a price that moved between two loads moves on every surface, and the totals follow', async ({page}) => {
  await device(page, platform([holding(BTC, '0.5'), holding(ZIG, '1000')]));
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price strong')).toHaveText('$97,012.34');
  await expect(card(page, 'Bitcoin').locator('.owned-value strong')).toHaveText('$48,506.17');
  await expect(card(page, 'ZIGChain').locator('.owned-value strong')).toHaveText('$83.41');
  await harness().setQuoteVariant(2); variant = 2;
  await page.reload(); await hydrated(page);
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price strong')).toHaveText('$97,588.90');
  await expect(card(page, 'Bitcoin').locator('.owned-value strong')).toHaveText('$48,794.45');
  await expect(card(page, 'ZIGChain').locator('.owned-value strong')).toHaveText('$85.12');
  await expect(card(page, 'Bitcoin').locator('.freshness-badge')).toHaveText('Current');
  await page.goto('/app/markets'); await hydrated(page);
  await expect(marketCard(page, 'Bitcoin').locator('.market-card-price strong')).toHaveText('$97,588.90');
});

test('D-200: a holding valued in EUR moves on reload in EUR', async ({page}) => {
  await device(page, platform([holding(BTC, '0.2', 'EUR')]));
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price strong')).toHaveText('€91,050.12');
  await expect(card(page, 'Bitcoin').locator('.owned-value strong')).toHaveText('€18,210.02');
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price small')).toHaveText('Current · EUR');
  await harness().setQuoteVariant(2); variant = 2;
  await page.reload(); await hydrated(page);
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price strong')).toHaveText('€91,591.27');
  await expect(card(page, 'Bitcoin').locator('.owned-value strong')).toHaveText('€18,318.25');
});

test('TK-6B-06: the 24h change shows with its own as-of time, and an old one says so, in light and dark', async ({page}) => {
  await device(page, platform([], [{ref: ADA.ref, name: 'Cardano', symbol: 'ADA'}]));
  const backgrounds: string[] = [];
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({colorScheme});
    await page.goto('/app/markets'); await hydrated(page);
    const btc = marketCard(page, 'Bitcoin'), ada = marketCard(page, 'Cardano');
    await expect(btc.locator('.market-change strong')).toHaveText('+2.41%');
    await expect(btc.locator('.market-change span')).toHaveText('24h · Market price');
    const at = await btc.locator('.market-reference-time time').getAttribute('datetime');
    expect(Date.now() - Date.parse(at!)).toBeLessThan(5 * 60_000);
    await expect(btc.locator('.market-reference-time')).toContainText('CoinGecko · 24h and 7-day figures observed');
    await expect(ada.locator('.market-change strong')).toHaveText(/^[−-]0\.88%$/);
    await expect(ada.locator('.market-change span')).toHaveText(/^24h · not current, from /);
    await expect(btc.locator('.market-change strong')).toBeVisible();
    backgrounds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
});

test('TK "Unformatted prices": a coin page and the Markets table write prices, changes and market cap formatted', async ({page}) => {
  await device(page);
  await page.goto('/app/wealth/asset/' + encodeURIComponent('coingecko:coin:bitcoin')); await hydrated(page);
  await expect(page.getByRole('heading', {level: 1, name: 'Bitcoin'})).toBeVisible();
  await expect(page.locator('.asset-detail-price')).toHaveText('$97,012.34');
  await expect(page.locator('.asset-price-time')).toContainText('Price observed');
  const chart = page.getByRole('figure', {name: 'Price history', exact: true});
  await expect(chart.locator('.price-chart-quote strong').first()).toHaveText('$97,012.34');
  const ranges = chart.getByRole('group', {name: 'Chart range'});
  await expect(ranges.getByRole('button')).toHaveText(['24H', '7D', '30D', '90D', '1Y', 'Max']);
  await ranges.getByRole('button', {name: '1Y'}).click();
  await expect(ranges.getByRole('button', {name: '1Y'})).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.locator('.price-chart-quote strong').first()).toHaveText(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
  // No raw provider digits anywhere on the page (the price arrives as "9701234" with 2 decimals).
  await expect(page.locator('body')).not.toContainText('9701234');
  await page.goto('/app/markets'); await hydrated(page);
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  const row = page.getByRole('table', {name: 'Markets', exact: true}).getByRole('row').filter({hasText: 'Bitcoin'});
  await expect(row).toContainText('$97,012.34');
  await expect(row).toContainText('+0.18% in 1 hour');
  await expect(row).toContainText('$1.92T');
  await expect(row.locator('td[class="data-col-wide"] span')).toHaveAttribute('title', '$1,921,345,678,901.00');
});

test('M10, TK-203: a coin shows its CoinGecko logo through /api/market-logo; Gold keeps its metal mark, never a token logo', async ({page}) => {
  await device(page, platform([holding(BTC, '0.5'), holding(GOLD, '2')]));
  await page.goto('/app/markets'); await hydrated(page);
  const logo = marketCard(page, 'Bitcoin').locator('.asset-orb img');
  await expect(logo).toHaveAttribute('src', /^\/api\/market-logo\?url=https%3A%2F%2Fcoin-images\.coingecko\.com%2Fcoins%2Fimages%2F1%2Flarge%2Fbitcoin\.png/);
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete ? img.naturalWidth : 0)).toBeGreaterThan(0);
  const goldMark = marketCard(page, 'Gold').locator('.asset-orb');
  await expect(goldMark).toHaveAttribute('data-kind', 'Precious Metals');
  await expect(goldMark).toHaveText('△');
  await expect(goldMark.locator('img')).toHaveCount(0);
  await page.goto('/app/wealth'); await hydrated(page);
  await expect.poll(() => card(page, 'Bitcoin').locator('.asset-orb img').evaluate((img: HTMLImageElement) => img.complete ? img.naturalWidth : 0)).toBeGreaterThan(0);
  await expect(card(page, 'Gold').locator('.asset-orb')).toHaveText('△');
});

test('W15, D-052: Markets → Find a market searches the public catalog; a ninth favourite is kept on this device', async ({page}) => {
  const eight = [['bitcoin', 'Bitcoin', 'BTC'], ['ethereum', 'Ethereum', 'ETH'], ['solana', 'Solana', 'SOL'], ['zignaly', 'ZIG', 'ZIG'], ['usd-coin', 'USD Coin', 'USDC']].map(([id, name, symbol]) => ({ref: coin(id!, name!, symbol!).ref, name: name!, symbol: symbol!}))
    .concat([['gold', 'Gold', 'XAU'], ['silver', 'Silver', 'XAG']].map(([id, name, symbol]) => ({ref: {provider: 'coingecko' as const, kind: 'rwa' as const, id: id!, assetType: 'commodity' as const}, name: name!, symbol: symbol!})))
    .concat([{ref: {provider: 'coingecko', kind: 'rwa', id: 'apple', assetType: 'stock'}, name: 'Apple', symbol: 'AAPL'}]);
  await device(page, platform([], eight));
  await page.goto('/app/markets'); await hydrated(page);
  await expect(page.locator('.markets-intro-card strong')).toHaveText('8 of 50');
  await page.getByRole('button', {name: '+ Find a market'}).click();
  const sheet = page.getByRole('dialog', {name: 'Find a market'}), search = sheet.getByLabel('Search assets'), results = sheet.getByRole('list', {name: 'Market assets'});
  await expect(search).toBeEnabled();
  await search.fill('bitcoin');
  await expect(results.getByRole('button').first()).toContainText('Bitcoin');
  await expect(results.getByRole('button').filter({hasText: 'Batcat'})).toContainText('Unverified · check the project before you add it');
  await search.fill('b');
  await expect(results.getByRole('button').first()).toContainText('Bitcoin');
  await search.fill('gold');
  await expect(sheet.getByRole('status').filter({hasText: 'is listed under'})).toHaveText('XAU (Gold) is listed under Precious metals. Choose the Precious metals tab above to add it.');
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Precious metals'}).click();
  await sheet.getByLabel('Search assets').fill('gold');
  await expect(results.getByRole('button').first()).toContainText('Gold');
  await expect(results.getByRole('button').first()).toContainText('Commodity · CoinGecko ID gold');
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Crypto'}).click();
  await sheet.getByLabel('Search assets').fill('cardano');
  await results.getByRole('button').first().click();
  await sheet.getByRole('button', {name: 'Add Cardano to favourites'}).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.markets-intro-card strong')).toHaveText('9 of 50');
  await expect(page.locator('.markets-intro-card p')).toContainText('Your favourites · 1 past the first 8 kept on this device');
  await expect(marketCard(page, 'Cardano').locator('.market-card-price strong')).toHaveText('$0.7123');
});

test('D-079: Wealth → Add asset → Find your asset finds bitcoin and gold, and the saved holding is priced', async ({page}) => {
  await device(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: '+ Add asset'}).click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await expect(sheet.getByRole('heading', {name: 'Find your asset'})).toBeVisible();
  await sheet.getByLabel('Search assets').fill('bitcoin');
  const results = sheet.getByRole('list', {name: 'Market assets'});
  await expect(results.getByRole('button').first()).toContainText('Bitcoin');
  await results.getByRole('button').first().click();
  await sheet.getByLabel('Asset quantity').fill('0.25');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(page.getByText('Bitcoin added to your wealth.')).toBeVisible();
  await expect(card(page, 'Bitcoin').locator('.holding-unit-price strong')).toHaveText('$97,012.34');
  await page.getByRole('button', {name: '+ Add asset'}).click();
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Precious metals'}).click();
  await sheet.getByLabel('Search assets').fill('gold');
  await expect(results.getByRole('button').first()).toContainText('Gold');
  await results.getByRole('button').first().click();
  await sheet.getByLabel('Reference units you hold').fill('2');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await expect(card(page, 'Gold').locator('.holding-unit-price strong')).toHaveText('$4,021.15');
});

test('D-176: Wealth and Markets write the same reference price in the same format', async ({page}) => {
  await device(page, platform([holding(BTC, '0.5'), holding(GOLD, '2')]));
  await page.goto('/app/wealth'); await hydrated(page);
  const wealth = {btc: await card(page, 'Bitcoin').locator('.holding-unit-price strong').textContent(), gold: await card(page, 'Gold').locator('.holding-unit-price strong').textContent()};
  await expect(card(page, 'Gold').locator('.holding-unit-price span')).toContainText('Tokenized reference price');
  expect(wealth).toEqual({btc: '$97,012.34', gold: '$4,021.15'});
  await page.goto('/app/markets'); await hydrated(page);
  await expect(marketCard(page, 'Bitcoin').locator('.market-card-price strong')).toHaveText(wealth.btc!);
  await expect(marketCard(page, 'Gold').locator('.market-card-price strong')).toHaveText(wealth.gold!);
});

test('C-DVG-35, MO-007, C-MO-01: Health → barcode 3017620422003 looks up Nutella from Open Food Facts and logs it', async ({page}) => {
  await device(page);
  await page.goto('/app/health?barcode=3017620422003'); await hydrated(page);
  const area = page.getByRole('region', {name: 'Barcode food lookup'});
  await expect(area.getByLabel('Product barcode', {exact: true})).toHaveValue('3017620422003');
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area.getByRole('heading', {name: 'Nutella'})).toBeVisible();
  await expect(area).toContainText('nutella, ferrero · Provider values may be per 100 g or per 100 mL.');
  await expect(area).not.toContainText('Lookup is not available here');
  await expect(area.getByLabel('Calories (kcal)', {exact: true})).toHaveValue('539');
  await expect(area.getByLabel('Protein (g)', {exact: true})).toHaveValue('6.3');
  await expect(area.getByLabel('Carbs (g)', {exact: true})).toHaveValue('57.5');
  await expect(area.getByLabel('Fat (g)', {exact: true})).toHaveValue('30.9');
  await area.getByLabel('I checked the package:', {exact: false}).check();
  await area.getByLabel('Grams eaten').fill('15');
  await area.getByRole('button', {name: 'Confirm and log food'}).click();
  await expect(area).toContainText('Added to your private diary');
  const diary = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:health:v1')!).diary as {snapshot: {provenance: {provider: string}}}[]);
  expect(diary.map(d => d.snapshot.provenance.provider)).toEqual(['Open Food Facts']);
  expect(harness().calls.filter(c => c.worker === 'food').map(c => c.path)).toEqual([expect.stringMatching(/^\/api\/v3\.4\/product\/3017620422003\?/)]);
});

test('C-BN-01, C-DVG-67, C-BN-05: Staking → Compare validators sorts by commission and uptime, shows the jailed one, and compares side by side', async ({page}) => {
  await device(page);
  await page.goto('/app/staking'); await hydrated(page);
  await page.getByText('Compare validators: commission, uptime and stake (real network, read only)').click();
  const section = page.locator('section#validators'), table = section.getByRole('region', {name: 'Validators', exact: true}), monikers = () => table.locator('tbody .earn-moniker').allInnerTexts();
  await expect(section.locator('.earn-count')).toHaveText('3 of 4 validators shown');
  await expect(section.getByRole('note')).toContainText('1 is jailed now.');
  const sort = section.getByLabel('Sort by');
  await sort.selectOption({label: 'Lowest commission'});
  await expect.poll(monikers).toEqual(['Delta Labs', 'Aurora Stake', 'Beacon Nodes']);
  await expect(table.locator('tr', {hasText: 'Delta Labs'}).locator('td[data-label="Commission"]')).toHaveText('3 % · max 15 %');
  await sort.selectOption({label: 'Best uptime'});
  await expect.poll(monikers).toEqual(['Delta Labs', 'Aurora Stake', 'Beacon Nodes']);
  await expect(table.locator('tr', {hasText: 'Aurora Stake'}).locator('td[data-label="Uptime"]')).toHaveText('99.88 % · 12 missed of 10,000');
  await expect(table.locator('tr', {hasText: 'Beacon Nodes'}).locator('td[data-label="Uptime"]')).toHaveText('95.5 % · 450 missed of 10,000');
  await section.getByLabel('Hide jailed').uncheck();
  await section.getByLabel('Active only').uncheck();
  await expect(section.locator('.earn-count')).toHaveText('4 of 4 validators shown');
  await expect(table.locator('tr', {hasText: 'Cobalt Validator'}).locator('td[data-label="Status"]')).toHaveText('Jailed');
  await table.locator('tr', {hasText: 'Aurora Stake'}).getByLabel('Compare Aurora Stake').check();
  await table.locator('tr', {hasText: 'Delta Labs'}).getByLabel('Compare Delta Labs').check();
  const compare = section.getByRole('region', {name: 'Validators side by side'});
  await expect(compare.locator('thead th')).toHaveText(['Fact', 'Aurora Stake', 'Delta Labs']);
  await expect(compare.locator('tr', {hasText: 'Commission now'}).locator('td')).toHaveText(['5 %', '3 %']);
  await expect(compare.locator('tr', {hasText: 'Highest it may set'}).locator('td')).toHaveText(['20 %', '15 %']);
  await expect(compare.locator('tr', {hasText: 'Uptime'}).locator('td')).toHaveText(['99.88 % · 12 missed of 10,000', '100 % · 0 missed of 10,000']);
  await expect(compare.locator('tr', {hasText: 'Status'}).locator('td')).toHaveText(['Active', 'Active']);
});

/** Staking → Track Wallet reads the fixture wallet on mainnet through /api/positions. */
async function trackWallet(page: Page) {
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('details.positions-wallet > summary').click();
  await page.getByLabel('Public ZIG address').fill(WALLET);
  await page.getByRole('button', {name: 'Read public positions'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Public snapshot saved.'})).toHaveText('Public snapshot saved. No wallet authority requested.');
}
const positionCard = (page: Page, source: string, name: string) => page.getByRole('group', {name: 'Positions', exact: true}).locator('article.position-card').filter({hasText: source}).filter({has: page.getByRole('heading', {name, exact: true})});

test('C-BN-06: a tracked wallet staked with a jailed validator shows that stake as not bonded, and its unbonding day', async ({page}) => {
  await device(page);
  await trackWallet(page);
  await expect(page.getByRole('region', {name: 'zigchain-1 observed totals'})).toContainText('Staked principal · zigchain-1');
  await expect(page.getByRole('region', {name: 'zigchain-1 observed totals'}).locator('.stake-hero strong')).toHaveText('1,750 ZIG');
  await expect(positionCard(page, 'NATIVE STAKING', 'Cobalt Validator')).toContainText('Leaving the active set (not earning) · commission 8\u00a0%');
  await expect(positionCard(page, 'NATIVE STAKING', 'Aurora Stake')).toContainText('Active (earning) · commission 5\u00a0%');
  await expect(positionCard(page, 'NATIVE UNBONDING', 'Beacon Nodes')).toContainText('Expected unbonding completion');
});

test('BN-081: after Track Wallet the Net APR assumption field appears, refuses a bad rate under the field, and saves a good one', async ({page}) => {
  await device(page);
  await trackWallet(page);
  await page.locator('details.positions-scenario > summary').click();
  const field = page.getByLabel('Net APR assumption %');
  await expect(field).toBeVisible();
  await field.fill('abc');
  await page.getByRole('button', {name: 'Save APR assumption'}).click();
  await expect(page.getByText('Enter a net APR from 0 to 100 % (up to 6 decimals), or leave it empty to clear it. Nothing changed: the saved assumption is not set.')).toBeVisible();
  await expect(page.getByLabel('Net APR assumption %')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Net APR assumption %').fill('12.5');
  await page.getByRole('button', {name: 'Save APR assumption'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Net APR assumption saved'})).toHaveText('Net APR assumption saved privately for this account.');
  await expect(page.locator('.positions-apr-value')).toHaveText('12.5%');
});

test.describe('in Asia/Tokyo', () => {
  test.use({timezoneId: 'Asia/Tokyo'});
  test('N-BN-17, X3-29 (Staking): the snapshot\'s "updated" time is the block\'s time, written in Tokyo time', async ({page}) => {
    await device(page);
    await trackWallet(page);
    const time = positionCard(page, 'NATIVE STAKING', 'Aurora Stake').locator('p.fine time').first();
    const at = (await time.getAttribute('datetime'))!;
    expect(Date.now() - Date.parse(at)).toBeLessThan(5 * 60_000);
    expect(space(await time.textContent())).toBe(zoned(at, 'Asia/Tokyo'));
    expect(zoned(at, 'Asia/Tokyo')).not.toBe(zoned(at, 'UTC'));
    await expect(positionCard(page, 'NATIVE STAKING', 'Aurora Stake')).toContainText('Recent snapshot');
    await expect(positionCard(page, 'NATIVE STAKING', 'Aurora Stake')).toContainText('https://api.zigchain.com · block 12873456');
  });

  test('X3-29 (Chess): Lichess ratings and the "updated" time come from the site, written in Tokyo time', async ({page}) => {
    await device(page);
    // Browser-direct reads (lib/skills/chess/api.ts), answered here in the documented Lichess shapes (lib/skills/chess/parse.ts).
    const asked: string[] = [], cors = {'access-control-allow-origin': '*'};
    await page.route('https://lichess.org/**', async route => {
      const url = new URL(route.request().url()); asked.push(url.pathname);
      if (url.pathname === '/api/user/zigdemo') return route.fulfill({headers: cors, json: {id: 'zigdemo', username: 'zigdemo', perfs: {blitz: {games: 412, rating: 1834, rd: 61, prog: 7}, rapid: {games: 38, rating: 1902, rd: 80, prog: -4}, bullet: {games: 0, rating: 1500, rd: 500, prog: 0}}}});
      if (url.pathname === '/api/user/zigdemo/rating-history') return route.fulfill({headers: cors, json: [{name: 'Blitz', points: [[2026, 9, 20, 1790], [2026, 10, 1, 1812], [2026, 10, 12, 1834]]}, {name: 'Rapid', points: []}]});
      if (url.pathname === '/api/games/user/zigdemo') return route.fulfill({headers: {...cors, 'content-type': 'application/x-ndjson'}, body: JSON.stringify({id: 'AbCd1234', rated: true, variant: 'standard', speed: 'blitz', status: 'mate', lastMoveAt: Date.now() - 3_600_000, winner: 'white', players: {white: {user: {name: 'zigdemo'}, rating: 1830}, black: {user: {name: 'rival'}, rating: 1851}}, opening: {name: 'Sicilian Defense'}, clock: {initial: 180, increment: 2}}) + '\n'});
      return route.fulfill({status: 404, headers: cors, json: {error: 'Not found'}});
    });
    await page.goto('/app/chess'); await hydrated(page);
    await page.getByRole('form', {name: 'Your chess usernames'}).getByLabel('Lichess username (optional)').fill('zigdemo');
    await page.getByRole('button', {name: 'Save usernames'}).click();
    await expect(page.getByRole('article', {name: 'Lichess Blitz rating'})).toContainText('1,834');
    const fetched = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:chess-cache:v1')!).fetchedAt.lichess as string);
    await expect(page.locator('.chess-updated')).toHaveText(`Lichess: updated ${zoned(fetched, 'Asia/Tokyo')}.`, {useInnerText: true});
    expect(asked).toEqual(['/api/user/zigdemo', '/api/user/zigdemo/rating-history', '/api/games/user/zigdemo']);
  });
});

test('C-BN-11, C-BN-12: Governance shows the open proposal with its deadline and reminder, and reads a validator\'s vote', async ({page}) => {
  await device(page);
  await page.goto('/app/governance'); await hydrated(page);
  const open = page.locator('article.governance-proposal[data-proposal="43"]');
  await expect(open.getByRole('heading', {level: 3})).toHaveText('Raise the maximum validator set to 125');
  await expect(open.locator('.governance-deadline strong')).toHaveText(/^Voting ends in (1 day 23 hours|2 days)$/);
  const deadline = (await open.locator('.governance-deadline time').getAttribute('datetime'))!;
  expect(Math.abs(Date.parse(deadline) - Date.now() - 2 * 86_400_000)).toBeLessThan(5 * 60_000);
  const reminder = open.getByLabel('Remind me a day before voting ends (on this device)');
  await reminder.check();
  await expect(reminder).toBeChecked();
  await open.getByText('How did a validator vote?').click();
  const who = open.getByLabel('A validator’s address (zigvaloper1…) or a ZIG address (zig1…)');
  await who.fill(harness().fixtures.lcd.validators.aurora.operator);
  await open.getByRole('button', {name: 'Read its vote'}).click();
  await expect(open.getByRole('status').filter({hasText: 'voted'})).toHaveText(/^This validator voted Yes \(read at block 12873456\)\./);
  await who.fill(WALLET);
  await open.getByRole('button', {name: 'Read its vote'}).click();
  await expect(open.getByRole('status').filter({hasText: 'not voted'})).toHaveText('This address has not voted on this proposal yet (read at block 12873456).');
});

test('C-DVG-69: a claim in this device\'s staking history shows ZIG\'s USD price that day from CoinGecko\'s history', async ({page}) => {
  const claimedAt = new Date(Date.now() - 10 * 86_400_000).toISOString();
  await device(page, {
    'zigoals:linked-wallets:v1': {version: 1, wallets: [{id: 'ap-service-rows', kind: 'cosmos', wallet: 'typed', label: 'Fixture wallet', address: WALLET, addedAt: claimedAt, via: 'typed'}]},
    'zigoals:staking-journal:v1': {version: 1, entries: [{operationId: '7b0f4c1e-2d3a-4b5c-8d6e-9f0a1b2c3d4e', chainId: 'zigchain-1', wallet: WALLET, action: 'claim', validator: harness().fixtures.lcd.validators.aurora.operator, amount: '3214567890123456789', state: 'CONFIRMED', at: claimedAt, updatedAt: claimedAt}]},
  });
  await page.goto('/app/earn#staking-clarity'); await hydrated(page);
  const clarity = page.locator('section#staking-clarity');
  await expect(clarity.getByRole('heading', {name: 'Waiting to be claimed'})).toBeVisible();
  const claimed = clarity.locator('article', {has: page.getByRole('heading', {name: 'Rewards you claimed here'})});
  await expect(claimed).toContainText('Claimed');
  await expect(claimed).toContainText(/ZIG was \$0\.\d{2,4} that day \(CoinGecko\), so about \$0\.\d{2}/);
  await expect(claimed).not.toContainText('unknown (CoinGecko’s history has no point for it)');
  await expect(clarity.locator('article', {has: page.getByRole('heading', {name: 'Unbonding calendar'})})).toContainText('from Beacon Nodes');
});
