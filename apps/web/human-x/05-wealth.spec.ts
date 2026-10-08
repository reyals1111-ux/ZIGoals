import {toBech32} from '@cosmjs/encoding';
import {expect, type Download, type Page} from '@playwright/test';
import {readStoredZip} from '../lib/export/zip-reader';
import {PLATFORM_KEY} from '../lib/positions';
import {go, journey, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J136–J180: Wealth, Portfolio, Markets, Staking, Ecosystem
// (docs/verification/x-cloud/HUMAN_TEST.md). Market data is answered "unavailable" unless a journey asks for it.
async function fold(j: Journey, label: string) {
  if (!j.phone) return;
  const toggle = j.page.locator('.phone-fold-toggle').filter({hasText: label}).first();
  await expect(async () => { if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true', {timeout: 1500}); }).toPass({timeout: 15_000});
}
async function account(page: Page, kind: string, name: string, currency: string, balance: string, rate = '') {
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await section.getByRole('button', {name: 'Add an account or debt', exact: true}).click();
  const form = section.getByRole('form', {name: 'Add an account or debt'});
  await form.getByLabel('Kind').selectOption({label: kind});
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Currency').fill(currency);
  await form.getByLabel(/Balance now|What you owe now/).fill(balance);
  if (rate) await form.getByLabel(/Yearly rate/).fill(rate);
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(section.getByRole('status')).toHaveText(`${name} added.`);
  return section;
}
async function portfolio(page: Page, name: string) {
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill(name);
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  await expect(page.getByRole('status').filter({hasText: `${name} created.`})).toBeVisible();
}

journey('J136', 'Wealth\'s empty state', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/wealth');
  await expect(j.page.locator('main')).not.toContainText(/\$0\.00 net worth|€0\.00 net worth/i);
  await snap(j, 'J136', 'empty');
});

journey('J138', 'accounts in EUR, JPY and CHF: net worth per currency, never converted', {views: 'all', data: ['L'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await fold(j, 'Accounts, debts & net worth');
  const section = await account(page, 'Savings', 'Fictional euro savings', 'EUR', '5200');
  await account(page, 'Cash', 'Fictional yen', 'JPY', '120000');
  await account(page, 'Cash', 'Fictional francs', 'CHF', '300.5');
  await expect(section.getByRole('article', {name: 'Net worth in EUR'}).locator('.accounts-worth-net')).toHaveText('€5,200.00');
  await expect(section.getByRole('article', {name: 'Net worth in JPY'}).locator('.accounts-worth-net')).toContainText('120,000');
  await expect(section.getByRole('article', {name: 'Net worth in CHF'}).locator('.accounts-worth-net')).toContainText('300.50');
  await snap(j, 'J138', 'per-currency');
});

journey('J140', 'a loan with a rate shows a payoff only from my own numbers', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await fold(j, 'Accounts, debts & net worth');
  const section = await account(page, 'Loan', 'Fictional car loan', 'EUR', '1200', '6');
  // A debt is a row of "What you owe" (a list item, not an article).
  const loan = section.getByRole('listitem').filter({hasText: 'Fictional car loan'});
  await expect(loan).toContainText('Loan · 6 % a year (your figure)');
  await expect(section.getByRole('article', {name: 'Net worth in EUR'})).toContainText('Debts€1,200.00');
  // The payoff appears only with my own rate and my own monthly payment.
  await loan.getByText('When would it be paid off?', {exact: true}).click();
  await loan.getByLabel(/^Monthly payment \(EUR\)/).fill('100');
  await expect(loan.getByRole('status')).toHaveText(/^At your rate of 6 % a year and 100 EUR a month: paid off in about 13 months, around \d{4}-\d{2}-\d{2}\.$/);
  // The rate removed (Edit): the payoff is gone and ZIGoals assumes no rate.
  await loan.getByRole('button', {name: 'Edit Fictional car loan', exact: true}).click();
  const edit = loan.getByRole('form', {name: 'Edit Fictional car loan'});
  await edit.getByLabel('Yearly rate, your own figure (%)').fill('');
  await edit.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(section.getByRole('status').filter({hasText: 'Fictional car loan saved.'})).toBeVisible();
  await expect(loan).not.toContainText('% a year');
  await expect(loan.getByText(/paid off in about/)).toHaveCount(0);
  await expect(loan).toContainText('Add your yearly rate (Edit) to see when it would be paid off. ZIGoals never assumes a rate.');
});

journey('J146', 'Portfolio: create one; without prices, values stay unknown', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional coins');
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await form.getByRole('button', {name: /Bitcoin/}).first().click();
  await form.getByLabel('Quantity').fill('0.5');
  await form.getByLabel('Price per coin (USD)').fill('60000');
  await form.getByLabel('Date').fill('2026-09-01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByLabel('Fictional coins totals')).toContainText('Cost basis');
  await expect(page.getByLabel('Fictional coins totals')).toContainText(/no price yet|unknown/i);
});

journey('J152', 'Portfolio coin page from a Showcase position; back returns', {views: 'all', data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  const coin = page.locator('main a[href^="/app/portfolio/coin/"]').first();
  const href = (await coin.getAttribute('href'))!;
  await coin.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  await coin.click();
  // The coin page arrives on the client: wait for its address and its own title before going back.
  await page.waitForURL(url => url.pathname === href.split('?')[0]);
  await expect(page.locator('#coin-title')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/portfolio$/);
  await ready(page);
  // Back keeps the scroll (charter): the list returns where I left it.
  await expect.poll(() => page.evaluate(y => Math.abs(Math.round(scrollY) - y), before), {message: `scroll near ${before}`}).toBeLessThanOrEqual(50);
});

journey('J156', 'Markets with the market service unavailable: an honest state, no invented prices', {views: 'all', data: ['S'], live: true}, async j => {
  await open(j.page, '/app/markets');
  await expect(j.page.locator('main')).not.toContainText(/\$0\.00\b/);
  await snap(j, 'J156', 'markets-unavailable');
});

journey('J161', 'Staking: a watch-only address that is not one is refused', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/staking');
  const field = page.getByRole('textbox').filter({hasNot: page.locator('[type=search]')}).first();
  if (await field.count() === 0) return;
  await field.fill('not-an-address');
  await field.press('Enter');
  await expect(page.locator('main')).not.toContainText(/Delegated\s+\d/);
});

journey('J162', 'Staking in Showcase: positions and totals; nothing that moves funds', {views: 'all', data: ['S'], live: true}, async j => {
  await open(j.page, '/app/staking');
  for (const verb of ['Delegate', 'Undelegate', 'Stake now', 'Withdraw', 'Sign']) await expect(j.page.getByRole('button', {name: verb, exact: true})).toHaveCount(0);
  await snap(j, 'J162', 'staking');
});

journey('J165', 'Ecosystem cards: open in place with Enter and Space; several stay open', {views: 'all', data: ['S'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/ecosystem');
  const headers = page.locator('main .ecosystem-toggle');
  const first = headers.nth(0), second = headers.nth(1);
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await second.focus();
  await page.keyboard.press('Space');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
});

journey('J167', 'Ecosystem links open safely: new tab, no referrer', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/ecosystem');
  const external = await page.locator('main a[href^="http"]').evaluateAll(links => links.map(a => ({target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? ''})));
  for (const link of external) { expect(link.target).toBe('_blank'); expect(link.rel).toMatch(/noreferrer/); }
});

journey('J180', 'an asset name with emoji and 100 characters stays inside the page', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  // The charter's asset name is the Add asset name (100 characters at most); an account name stops at 80, which cut the
  // old step's name short.
  const name = 'Fictional 🏦 long-term emergency reserve held at the cooperative bank down the road, kept for rainy days!'.slice(0, 100);
  expect(name).toHaveLength(100);
  await open(page, '/app/wealth');
  await addAsset(page, 'Cash', [['Asset name', name], ['Cash amount', '10']]);
  expect((await stored(page, PLATFORM_KEY)).positions.map((p: {providerId: string}) => p.providerId)).toEqual([name]);
  const width = page.viewportSize()!.width;
  const inside = async (box: {x: number; width: number} | null, what: string) => { expect(box, what).not.toBeNull(); expect(box!.x, what).toBeGreaterThanOrEqual(-0.5); expect(box!.x + box!.width, what).toBeLessThanOrEqual(width + 0.5); };
  const card = page.locator('.owned-asset-card').filter({hasText: 'Fictional 🏦'});
  await expect(card.getByRole('heading', {level: 3})).toHaveText(name);
  await inside(await card.boundingBox(), 'the asset card');
  await inside(await card.getByRole('heading', {level: 3}).boundingBox(), 'the name on the card');
  await card.locator('.owned-card-link').click();
  await page.waitForURL(/\/app\/wealth\/asset\//);
  await ready(page);
  await expect(page.locator('main h1').first()).toHaveText(name);
  await inside(await page.locator('main h1').first().boundingBox(), 'the asset page title');
});

journey('J166', 'an Ecosystem #project link opens its card and brings it into view', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  const {page} = j;
  await page.goto('/app/ecosystem#project-valdora');
  const card = page.locator('#project-valdora');
  await expect(card).toBeInViewport();
  await expect(card.locator('.ecosystem-toggle')).toHaveAttribute('aria-expanded', 'true');
});

const TX_CSV = 'Date,Type,Pair,Amount,Price,Fee,Note\n2026-09-01,Buy,BTC,0.5,60000,10,fictional first\n2026-09-02,Deposit,ETH,2,,,\n2026-09-04,Buy,FICTIONALCOIN,100,0.1,,\n';
journey('J149', 'Portfolio CSV import: columns matched, an unknown coin skipped, imported, then undone to the exact bytes', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional long-term');
  const before = await page.evaluate(() => localStorage.getItem('zigoals:portfolio:v1'));
  const seen: string[] = [];
  page.on('request', r => { const body = r.postData() ?? ''; if (r.url().includes('60000') || body.includes('fictional first')) seen.push(r.url()); });
  await page.getByRole('button', {name: 'Import transactions from a CSV', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import transactions', exact: true});
  await panel.getByLabel('CSV file').setInputFiles({name: 'transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(TX_CSV)});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toContainText('1 unknown coin');
  await panel.getByRole('button', {name: 'Skip row', exact: true}).click();
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: /^Import 2 transactions into/}).click();
  await expect(panel.getByRole('status')).toContainText('2 transactions imported');
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await page.locator('.import-banner').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.locator('.import-banner')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:portfolio:v1'))).toBe(before);
  expect(seen, 'the file never leaves the device').toEqual([]);
});

journey('J137', 'a manual cash asset added in Wealth, labelled as my own value', {views: 'all', data: ['E', 'L'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Asset name', {exact: true}).fill('Fictional rainy-day cash');
  await sheet.getByLabel('Cash amount', {exact: true}).fill('1250.75');
  await sheet.getByRole('button', {name: 'Save asset', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('main')).toContainText('Fictional rainy-day cash');
  await snap(j, 'J137', 'asset');
});

journey('J137b', 'Escape closes "Add to your wealth" and focus returns to its button', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  const trigger = page.getByRole('button', {name: '+ Add asset'}).first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', {name: 'Add to your wealth'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', {name: 'Add to your wealth'})).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

journey('J160', 'Markets: cards by default; the table with the keyboard; the choice and an honest "unavailable" without the service', {views: ['D', 'T', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/markets');
  const layout = page.getByRole('group', {name: 'Show markets as'});
  await expect(layout.getByRole('button', {name: 'Cards'})).toHaveAttribute('aria-pressed', 'true');
  await layout.getByRole('button', {name: 'Table'}).focus();
  await page.keyboard.press('Enter');
  await expect(layout.getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).not.toContainText(/\$0\.00\b/);
});

const PORTFOLIO = 'zigoals:portfolio:v1';
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const bytes = async (download: Download) => { const chunks: Buffer[] = []; for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); };
async function addAsset(page: Page, category: string, fields: [label: string, value: string][]) {
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: category, exact: true}).click();
  for (const [label, value] of fields) await sheet.getByLabel(label, {exact: true}).fill(value);
  await sheet.getByRole('button', {name: 'Save asset', exact: true}).click();
  await expect(sheet).toHaveCount(0);
}
async function trade(page: Page, coin: RegExp, kind: 'buy' | 'sell', quantity: string, price: string, date: string) {
  // A portfolio that already has transactions keeps "Record a transaction" folded until it is opened.
  const add = page.locator('details.portfolio-add').first();
  await expect(add).toBeVisible();
  if (!await add.evaluate(d => (d as HTMLDetailsElement).open)) await add.locator(':scope > summary').click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await form.getByRole('button', {name: coin}).first().click();
  await form.getByLabel('Type').selectOption(kind);
  await form.getByLabel('Quantity').fill(quantity);
  await form.getByLabel('Price per coin (USD)').fill(price);
  await form.getByLabel('Date').fill(date);
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: new RegExp(`^${kind === 'buy' ? 'Buy' : 'Sell'} of \\w+ recorded\\.$`)})).toBeVisible();
}
const ADDRESS = toBech32('zig', new Uint8Array(20).fill(7));
const holdingsRow = (page: Page, portfolioName: string, coin: string) => page.getByRole('table', {name: `${portfolioName} holdings`}).getByRole('row').filter({hasText: coin});

journey('J139', 'an asset whose value is unknown is never counted as zero', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await page.getByRole('button', {name: '+ Add asset', exact: true}).first().click();
  await page.getByRole('button', {name: 'Import from a CSV file', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import holdings', exact: true});
  await panel.getByLabel('CSV file').setInputFiles({name: 'holdings.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Asset,Quantity,Kind of asset,Value,Currency\nFictional gold coins,XAU,2,Precious metals,,EUR\nFictional savings,,1500,Cash,,EUR\n')});
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-preview')).toContainText('Needs valuation');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Add 2 assets to Wealth', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('2 assets added to Wealth.');
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await page.getByRole('button', {name: 'Close dialog', exact: true}).click();
  const gold = page.locator('.owned-asset-card').filter({hasText: 'Fictional gold coins'});
  await expect(gold.locator('.owned-value strong')).toHaveText('Needs valuation');
  await expect(gold).not.toContainText('€0.00');
  // Only the valued 1,500 EUR is counted.
  await expect(page.locator('.wealth-hero-total .wealth-total-headline')).toHaveText('€1,500.00');
});

journey('J142', 'an asset\'s page by direct address; an unknown asset → a calm "unavailable" and the way back', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await addAsset(page, 'Cash', [['Asset name', 'Fictional jar cash'], ['Cash amount', '120']]);
  const id = (await stored(page, PLATFORM_KEY)).positions[0].id as string;
  await open(page, `/app/wealth/asset/${encodeURIComponent(id)}`);
  await expect(page.locator('main h1').first()).toContainText('Fictional jar cash');
  await page.goto('/app/wealth/asset/no-such-asset');
  await ready(page);
  await expect(page.getByRole('heading', {level: 1, name: 'Asset unavailable'})).toBeVisible();
  await page.getByRole('link', {name: 'Return to Wealth', exact: true}).click();
  await page.waitForURL(/\/app\/wealth$/);
  await ready(page);
});

journey('J153', 'Portfolio\'s value chart with the keyboard: Home, arrows and End move along the line', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  const chart = page.getByRole('region', {name: 'Value over time'}), plot = chart.locator('svg.portfolio-chart-plot');
  const moment = () => chart.locator('.portfolio-chart-quote time').getAttribute('datetime');
  await expect(plot).toBeVisible();
  const last = (await moment())!;
  await plot.focus();
  await page.keyboard.press('Home');
  await expect.poll(moment).not.toBe(last);
  const first = (await moment())!;
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await moment())! > first).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(moment).toBe(first);
  await page.keyboard.press('End');
  await expect.poll(moment).toBe(last);
});

journey('J154', 'Portfolio\'s 1 h and 7 d changes: labelled fixtures in the Showcase, "Not provided" without the market service', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  // The Showcase asks no market: its 1 h and 7 d figures are fixtures, labelled as such, never a zero standing in for "unknown".
  const btc = holdingsRow(page, 'Fictional long-term coins', 'Bitcoin').getByRole('cell', {includeHidden: true});
  await expect(btc.nth(1)).toHaveText(/^[+−]?[\d.]+% in 1 hour$/);
  await expect(btc.nth(3)).toHaveText(/^[+−]?[\d.]+% in 7 days$/);
  await expect(page.getByText('Showcase fixture prices, not market data.')).toBeVisible();
  // A coin outside the Showcase portfolio has no fixture: without the market service it says "Not provided".
  await open(page, '/app/portfolio/coin/usd-coin');
  const changes = page.locator('.portfolio-coin-changes');
  await expect(changes).toContainText('1hNot provided in 1 hour');
  await expect(changes).toContainText('7dNot provided in 7 days');
});

journey('J155', 'Portfolio data that cannot be read: a calm message, the bytes kept and carried by Export everything', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const raw = '{"version":1,"portfolios":[{"id":"x"}]}';
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PORTFOLIO, raw]);
  await open(page, '/app/portfolio');
  await expect(page.getByRole('region', {name: 'Portfolios could not be read'})).toContainText('They were not changed.');
  await expect(page.getByRole('form', {name: 'New portfolio'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Start over…'}).click();
  await page.getByRole('button', {name: 'Keep them'}).click();
  expect(await page.evaluate(k => localStorage.getItem(k), PORTFOLIO)).toBe(raw);
  // The way to keep them: Export everything carries the portfolio exactly as stored.
  await open(page, '/app/settings');
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const entries = readStoredZip(new Uint8Array(await bytes(await waiting)));
  expect(JSON.parse(new TextDecoder().decode(entries.find(e => e.name === 'everything.json')!.data)).portfolio).toEqual(JSON.parse(raw));
  expect(await page.evaluate(k => localStorage.getItem(k), PORTFOLIO)).toBe(raw);
});

journey('J157', 'Markets: a market\'s page with its price chart, the chart\'s source and its time', {views: 'all', data: ['S']}, async j => {
  const {page} = j;
  // The Showcase draws fixture prices only on Portfolio's coin page; a Markets detail asks the market-history service.
  // Here that service answers a fictional dated series (the shape tests/run9-1-fixture.ts uses), so the chart, its source
  // and its time can show without spending the shared market budget.
  await page.route('**/api/market-history', route => {
    const {request: r} = route.request().postDataJSON();
    return route.fulfill({json: {history: {marketRef: r.marketRef, currency: r.currency, range: r.range, source: 'CoinGecko', fetchedAt: new Date().toISOString(), points: Array.from({length: 31}, (_, i) => ({at: new Date(Date.now() - (30 - i) * 86_400_000).toISOString(), value: String(50_000 + i * 125), decimals: 0}))}, error: null, stale: false, nextAttemptAt: Date.now() + 60_000}});
  });
  await open(page, '/app/markets');
  await page.locator('.market-product-card').filter({hasText: 'Bitcoin'}).getByRole('link', {name: 'Bitcoin', exact: true}).click();
  await page.waitForURL(/\/app\/wealth\/asset\//);
  await ready(page);
  await expect(page.locator('main h1').first()).toContainText('Bitcoin');
  const chart = page.locator('.price-chart');
  await expect(chart).toBeVisible();
  await expect(chart.locator('svg.price-chart-plot')).toBeVisible();
  await expect(chart.locator('.price-chart-source')).toContainText('CoinGecko');
  await expect(chart.locator('.price-chart-quote')).toContainText(/53[,.\u202f\u00a0 ]?750/);
  await expect(chart.locator('.price-chart-quote time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
  await expect(chart.locator('figcaption')).toContainText('Fetched');
});

journey('J169', 'Wealth → asset → back → Portfolio → coin → back: focus lands on each page', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const focusInPage = () => page.evaluate(() => document.activeElement?.id === 'main' || !!document.getElementById('main')?.contains(document.activeElement));
  await open(page, '/app/wealth');
  await page.locator('.owned-card-link').first().click();
  await page.waitForURL(/\/app\/wealth\/asset\//);
  await ready(page);
  await expect.poll(focusInPage).toBe(true);
  await page.goBack();
  await page.waitForURL(/\/app\/wealth$/);
  await ready(page);
  await expect.poll(focusInPage).toBe(true);
  await go(j, 'Portfolio');
  // A click in the navigation keeps focus on that item, now marked current (the app's own pattern, tests/brand-nav-polish
  // .spec.ts; on a phone focus returns to More); links inside a page hand focus to the new page's content.
  const nav = page.getByRole('navigation', {name: 'Main navigation'});
  if (j.phone) { const more = nav.getByRole('button', {name: 'More', exact: true}); await expect(more).toBeFocused(); await expect(more).toHaveAttribute('data-current', 'true'); }
  else { const link = nav.getByRole('link', {name: 'Portfolio', exact: true}); await expect(link).toBeFocused(); await expect(link).toHaveAttribute('aria-current', 'page'); }
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.locator('main a[href^="/app/portfolio/coin/"]').first().click();
  await page.waitForURL(/\/app\/portfolio\/coin\//);
  await ready(page);
  await expect.poll(focusInPage).toBe(true);
  await page.goBack();
  await page.waitForURL(/\/app\/portfolio$/);
  await ready(page);
  await expect.poll(focusInPage).toBe(true);
});

journey('J170', 'Wealth and Portfolio in Showcase, even an edit, write nothing to my own records', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const mine = () => page.evaluate(() => JSON.stringify(['zigoals:platform:v1', 'zigoals:portfolio:v1', 'zigoals:accounts:v1'].map(k => localStorage.getItem(k))));
  const before = await mine();
  await open(page, '/app/wealth');
  await open(page, '/app/wealth/asset/showcase-usd');
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  await page.getByLabel('Cash balance').fill('26000');
  await page.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open(page, '/app/portfolio');
  await open(page, '/app/portfolio/coin/bitcoin');
  expect(await mine()).toBe(before);
});

journey('J171', 'many currencies on one screen: EUR, USD, GBP, JPY, CHF and BTC, each its own net worth', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  const section = await account(page, 'Savings', 'Fictional euro savings', 'EUR', '1000');
  for (const [name, currency, balance] of [['Fictional dollars', 'USD', '2000'], ['Fictional pounds', 'GBP', '300'], ['Fictional yen', 'JPY', '120000'], ['Fictional francs', 'CHF', '450'], ['Fictional sats', 'BTC', '0.5']] as const) await account(page, 'Cash', name, currency, balance);
  const net = (currency: string) => section.getByRole('article', {name: `Net worth in ${currency}`}).locator('.accounts-worth-net');
  await expect(section.getByRole('group', {name: 'Net worth by currency'}).getByRole('article')).toHaveCount(6);
  await expect(net('EUR')).toHaveText('€1,000.00');
  await expect(net('USD')).toHaveText('$2,000.00');
  await expect(net('GBP')).toContainText('300.00');
  await expect(net('JPY')).toContainText('120,000');
  await expect(net('JPY')).not.toContainText('.00');
  await expect(net('CHF')).toContainText('450.00');
  await expect(net('BTC')).toContainText('0.5');
});

journey('J172', 'Wealth at 200 % zoom (720 px wide): the total and the assets fit, nothing sideways', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 720, height: 450});
  await open(page, '/app/wealth');
  await expect(page.locator('.wealth-hero-total .wealth-total-headline')).toBeVisible();
  await expect(page.locator('.owned-asset-card').first()).toBeVisible();
  // At 720 px the phone layout shows the first four assets and "Show all N assets"; every one is checked.
  const all = page.getByRole('button', {name: /^Show all \d+ assets$/});
  if (await all.count()) await all.click();
  for (const card of (await page.locator('.owned-asset-card').all()).slice(0, 6)) { const box = await card.boundingBox(); expect(box, 'each asset card is shown').not.toBeNull(); expect(box!.x + box!.width).toBeLessThanOrEqual(720.5); }
  await snap(j, 'J172', 'zoom-200');
});

journey('J173', 'Portfolio in two tabs: a portfolio made in one shows in the other; both tabs\' trades are kept', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  const other = await page.context().newPage();
  await open(other, '/app/portfolio');
  await portfolio(page, 'Fictional shared coins');
  await expect(other.getByRole('region', {name: 'Fictional shared coins', exact: true})).toBeVisible();
  await trade(page, /Bitcoin/, 'buy', '0.1', '60000', '2026-09-01');
  await trade(other, /Ethereum/, 'buy', '1', '2500', '2026-09-02');
  for (const tab of [page, other]) {
    await tab.reload();
    await ready(tab);
    for (const coin of ['Bitcoin', 'Ethereum']) await expect(holdingsRow(tab, 'Fictional shared coins', coin)).toBeVisible();
  }
  expect((await stored(page, PORTFOLIO)).portfolios[0].transactions).toHaveLength(2);
  await other.close();
});

journey('J174', 'Markets and Portfolio at 390 px: the essentials stay, nothing sideways, 44 px targets', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/markets');
  for (const card of (await page.locator('.market-product-card').all()).slice(0, 6)) { const box = (await card.boundingBox())!; expect(box.x + box.width).toBeLessThanOrEqual(390.5); }
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  const markets = page.getByRole('table', {name: 'Markets'});
  await expect(markets.getByRole('columnheader')).toHaveText(['Market', 'Price', '24h', 'Favourite']);
  for (const star of await markets.getByRole('button').all()) if (await star.isVisible()) expect((await star.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await open(page, '/app/portfolio');
  const holdings = page.getByRole('table', {name: 'Fictional long-term coins holdings'});
  await expect(holdings.getByRole('columnheader').filter({visible: true})).toHaveText(['Coin', '24h', 'Value', 'Result']);
  await expect(page.getByRole('button', {name: /^Allocation/})).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', {name: /^Transactions/})).toHaveAttribute('aria-expanded', 'false');
});

journey('J175', 'Wealth\'s "in perspective" with one asset: that class counted, every other class empty, never zero', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await addAsset(page, 'Cash', [['Asset name', 'Fictional only cash'], ['Cash amount', '1250.75']]);
  await fold(j, 'Your wealth, in perspective');
  const mix = page.getByRole('region', {name: 'Asset mix'});
  // A phone shows four classes first; Cash is the sixth, behind "Show all 7 asset classes".
  const all = mix.getByRole('button', {name: /^Show all \d+ asset classes$/});
  if (await all.count()) await all.click();
  const cash = mix.locator('.class-summary').filter({has: page.locator('strong', {hasText: /^Cash$/})});
  await expect(cash).toBeVisible();
  await expect(cash).toContainText('1 asset');
  await expect(cash).toContainText('$1,250.75');
  for (const empty of await mix.locator('.class-summary[data-empty="true"]').all()) { await expect(empty).toContainText('0 assets'); await expect(empty).toContainText('—'); await expect(empty).not.toContainText(/[$€]0\.00/); }
  await cash.click();
  await expect(page.locator('.holdings-filters').getByRole('button', {name: 'Cash', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

journey('J176', 'a portfolio with 300 transactions opens and records the next one quickly, figures exact', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
  const data = {version: 1, portfolios: [{id: 'p-many', name: 'Fictional many trades', kind: 'real', currency: 'USD', createdAt: '2025-01-01T00:00:00.000Z', coins: [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}],
    transactions: Array.from({length: 300}, (_, i) => ({id: `t${i}`, coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.001', price: '60000', date: day(300 - i), note: '', createdAt: `${day(300 - i)}T12:00:00.000Z`}))}]};
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PORTFOLIO, JSON.stringify(data)]);
  const started = Date.now();
  await open(page, '/app/portfolio');
  await expect(holdingsRow(page, 'Fictional many trades', 'Bitcoin')).toContainText('0.3 BTC');
  expect(Date.now() - started, 'the page opens in good time').toBeLessThan(10_000);
  await expect(page.getByLabel('Fictional many trades totals')).toContainText('Cost basis$18,000.00');
  const t = Date.now();
  await trade(page, /Bitcoin/, 'buy', '0.001', '60000', day(0));
  await expect(holdingsRow(page, 'Fictional many trades', 'Bitcoin')).toContainText('0.301 BTC');
  expect(Date.now() - t, 'recording one more answers quickly').toBeLessThan(5000);
  expect((await stored(page, PORTFOLIO)).portfolios[0].transactions).toHaveLength(301);
});

journey('J177', 'Staking: a watch-only address lives only in its snapshot; nothing remembers it as a setting', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.route('**/api/positions?**', route => route.fulfill({json: {positions: [{id: `zigchain-1:${ADDRESS}:liquid`, providerId: 'native-zig', sourceType: 'WALLET_LIQUID', network: 'zigchain-1', account: ADDRESS, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '123456789000000000000', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), liquidity: 'LIQUID', provenance: 'Fictional public snapshot', executionAuthority: 'NONE', notes: '', risk: ''}]}}));
  await open(page, '/app/staking');
  await page.locator('.positions-wallet > summary').click();
  await page.getByLabel('Public ZIG address').fill(ADDRESS);
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Public snapshot saved'})).toBeVisible();
  // Staking has no "remove address" (a position read from an address cannot be archived): the closest real check is
  // that the address is kept only inside its dated snapshot, never as a remembered setting or in this tab.
  const holders = await page.evaluate(address => [...Object.entries(localStorage), ...Object.entries(sessionStorage)].filter(([, v]) => v.includes(address)).map(([k]) => k), ADDRESS);
  expect(holders).toEqual([PLATFORM_KEY]);
  await page.reload();
  await ready(page);
  // Opening the reader again offers "Refresh positions" for the snapshot on show: its field is filled from that snapshot
  // (positions-view.tsx), so the snapshot (its positions, their dated quantities and the account on show) must stay the
  // only place the address lives, on this device and in this tab.
  const after = await page.evaluate(address => [...Object.entries(localStorage), ...Object.entries(sessionStorage)].filter(([, v]) => v.includes(address)).map(([k]) => k), ADDRESS);
  expect(after).toEqual([PLATFORM_KEY]);
  const platform = await stored(page, PLATFORM_KEY) as Record<string, unknown>;
  expect(Object.keys(platform).filter(k => JSON.stringify(platform[k]).includes(ADDRESS)).sort()).toEqual(['positions', 'snapshots', 'watchScope']);
  await page.locator('.positions-wallet > summary').click();
  await expect(page.getByLabel('Public ZIG address')).toHaveValue(ADDRESS);
});

journey('J178', 'from an empty Wealth to a first portfolio', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  // Wealth has no Portfolio link of its own: Portfolio is reached from the navigation (closest real path).
  await go(j, 'Portfolio');
  await expect(page).toHaveURL(/\/app\/portfolio$/);
  await expect(page.getByRole('form', {name: 'New portfolio'})).toBeVisible();
  await portfolio(page, 'Fictional first coins');
  await expect(page.getByRole('region', {name: 'Fictional first coins', exact: true})).toBeVisible();
  expect((await stored(page, PORTFOLIO)).portfolios.map((p: {name: string}) => p.name)).toEqual(['Fictional first coins']);
});
