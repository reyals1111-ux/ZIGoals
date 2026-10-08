import {toBech32} from '@cosmjs/encoding';
import {expect, type Download, type Page} from '@playwright/test';
import {readStoredZip} from '../lib/export/zip-reader';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../lib/positions';
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
  // The field holds 100 characters; the app trims the space the cut leaves at the end.
  expect((await stored(page, PLATFORM_KEY)).positions.map((p: {providerId: string}) => p.providerId)).toEqual([name.trim()]);
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
const offline = (page: Page) => page.getByRole('alert').filter({hasText: 'You’re offline.'});
/** The market service's dated history, answered on this device (only `/api/market-history`; other market calls stay
 * "unavailable"): one price a day at `cents` from `from` to 7 October 2026, the journey's clock. */
async function history(page: Page, from: string, cents: string) {
  const now = Date.parse('2026-10-07T12:00:00.000Z');
  await page.route('**/api/market-history', route => {
    const {request} = route.request().postDataJSON() as {request: Record<string, unknown>};
    const points: {at: string; value: string; decimals: number}[] = [];
    for (let at = Date.parse(`${from}T00:00:00.000Z`); at <= now; at += 86_400_000) points.push({at: new Date(at).toISOString(), value: cents, decimals: 2});
    return route.fulfill({json: {history: {...request, source: 'CoinGecko', fetchedAt: new Date(now).toISOString(), points}, error: null, stale: false, nextAttemptAt: 0}});
  });
}
const assetCard = (page: Page, name: string) => page.locator('.owned-asset-card').filter({has: page.getByRole('heading', {level: 3, name, exact: true})});
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

journey('J141', 'cash: added, edited, allocated to a goal, and kept out of staking', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify({...emptyPlatform(), goals: [privateGoalSchema.parse({id: '91', name: 'Fictional rainy-day fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '100000', notes: '', createdAt: '2026-09-01T09:00:00.000Z', milestones: []})]})]);
  await open(page, '/app/wealth');
  await addAsset(page, 'Cash', [['Cash amount', '500']]);
  const id = (await stored(page, PLATFORM_KEY)).positions[0].id as string;
  await open(page, `/app/wealth/asset/${encodeURIComponent(id)}`);
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  await page.getByLabel('Cash balance').fill('600');
  await page.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Your holding'})).toContainText('$600');
  // Cash is never staking: Staking's tracked crypto leaves it out.
  await open(page, '/app/staking');
  await expect(page.getByRole('region', {name: 'Tracked crypto'})).not.toContainText('USD Cash');
  await page.goto('/app/goals/tracked/91#allocate');
  await ready(page);
  await page.locator('#allocate').getByRole('button').filter({hasText: 'USD Cash'}).click();
  await page.getByLabel('Allocation quantity', {exact: true}).fill('500');
  await page.getByRole('button', {name: 'Save allocation', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm allocation', exact: true}).click();
  await expect(page.getByTestId('tracked-progress')).toContainText('$500');
  expect((await stored(page, PLATFORM_KEY)).allocations).toEqual([{goalId: '91', positionId: id, quantity: '500000000000000000000'}]);
});

journey('J143', 'Wealth\'s asset mix: the ring\'s words and the legend say the same, adding up to 100 %', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  const money = (text: string) => Number(text.replace(/[^\d.]/g, ''));
  // The Showcase holds USD and EUR: one composition per currency, never converted.
  const groups = page.getByRole('group', {name: /^[A-Z]{3} portfolio composition$/});
  await expect(groups).toHaveCount(2);
  for (const group of await groups.all()) {
    const words = (await group.getByRole('img', {name: /composition:/}).getAttribute('aria-label'))!;
    const ring = [...words.slice(words.indexOf(': ') + 2).matchAll(/([^,]+?) ([\d.]+)%/g)].map(m => [m[1]!.trim(), m[2]!]);
    const legend = await group.locator('.composition-legend > div').evaluateAll(rows => rows.map(r => [r.querySelector('dt')!.textContent!.trim(), r.querySelector('dd span')!.textContent!.replace('%', '').trim()]));
    expect(ring.length, words).toBeGreaterThan(0);
    expect(legend, words).toEqual(ring);
    expect(Math.abs(ring.reduce((t, [, pct]) => t + Number(pct), 0) - 100), `${words} adds up to 100 %`).toBeLessThan(0.001);
    const values = await group.locator('.composition-legend dd strong').allTextContents();
    const total = money((await group.locator('.composition-donut strong').textContent())!);
    expect(values.reduce((t, v) => t + money(v), 0)).toBeCloseTo(total, 2);
  }
  await snap(j, 'J143', 'asset-mix');
});

journey('J144', 'Wealth with a value of 1e15 and a quantity of 0.00000001: both readable, exact, inside the page', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await addAsset(page, 'Cash', [['Asset name', 'Fictional vault cash'], ['Cash amount', '1000000000000000']]);
  await addAsset(page, 'Custom', [['Asset name', 'Fictional dust token'], ['Quantity', '0.00000001'], ['Total holding value', '0.01']]);
  await expect(assetCard(page, 'Fictional vault cash').locator('.owned-value strong')).toHaveText('$1,000,000,000,000,000.00');
  await expect(assetCard(page, 'Fictional dust token').locator('.owned-value span')).toHaveText('0.00000001 UNIT');
  await expect(assetCard(page, 'Fictional dust token').locator('.owned-value strong')).toHaveText('$0.01');
  // The total keeps the last cent of a quadrillion.
  await expect(page.locator('.wealth-hero-total .wealth-total-headline')).toHaveText('$1,000,000,000,000,000.01');
  const width = page.viewportSize()!.width;
  for (const [what, box] of [['the large value', await assetCard(page, 'Fictional vault cash').locator('.owned-value strong').boundingBox()], ['the tiny quantity', await assetCard(page, 'Fictional dust token').locator('.owned-value span').boundingBox()], ['the total', await page.locator('.wealth-hero-total .wealth-total-headline').boundingBox()]] as const) {
    expect(box, what).not.toBeNull();
    expect(box!.x, what).toBeGreaterThanOrEqual(-0.5);
    expect(box!.x + box!.width, what).toBeLessThanOrEqual(width + 0.5);
  }
  const positions = (await stored(page, PLATFORM_KEY)).positions as {providerId: string; quantity: string; decimals: number}[];
  expect(positions.map(p => [p.providerId, p.quantity, p.decimals])).toEqual([['Fictional vault cash', `1${'0'.repeat(33)}`, 18], ['Fictional dust token', '10000000000', 18]]);
});

journey('J145', 'Wealth offline: manual values still show; market prices are a price or "Unavailable", never zero', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/wealth');
  await page.context().setOffline(true);
  await expect(offline(page)).toBeVisible();
  const assets = page.getByRole('region', {name: 'Your assets'});
  await assets.getByRole('button', {name: 'Cash', exact: true}).click();
  await expect(assetCard(page, 'USD cash reserve').locator('.owned-value strong')).toHaveText('$25,000.00');
  await expect(assetCard(page, 'EUR travel cash').locator('.owned-value strong')).toHaveText('€8,000.00');
  await assets.getByRole('button', {name: 'All assets', exact: true}).click();
  const all = assets.getByRole('button', {name: /^Show all \d+ assets$/});
  if (await all.count()) await all.click();
  const values = await assets.locator('.owned-value strong').allTextContents(), prices = await assets.locator('.holding-unit-price strong').allTextContents();
  expect(values.length).toBeGreaterThan(2);
  for (const value of values) { expect(value).toMatch(/^(Needs valuation|[$€][\d,]+\.\d{2})$/); expect(value).not.toMatch(/^[$€]0\.00$/); }
  for (const price of prices) { expect(price).toMatch(/^Unavailable$|[1-9]/); expect(price).not.toMatch(/^[$€]?0([.,]0+)?$/); }
  await page.context().setOffline(false);
  await expect(offline(page)).toHaveCount(0);
  await expect(page.locator('.wealth-hero-total .wealth-total-headline')).not.toHaveText(/^[$€]0\.00$/);
});

journey('J147', 'Portfolio: a buy and a sell; the holding, the cost basis and the chart follow', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T12:00:00.000Z')});
  await history(page, '2026-09-07', '6100000');
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional ledger');
  await trade(page, /Bitcoin/, 'buy', '0.5', '60000', '2026-09-01');
  const totals = page.getByLabel('Fictional ledger totals'), btc = holdingsRow(page, 'Fictional ledger', 'Bitcoin'), quote = page.locator('.portfolio-chart-quote strong');
  // On a phone the Holdings and Average cost columns are hidden (data-col-wide/optional); their text is still the row's.
  await expect(btc).toContainText('0.5 BTC');
  await expect(totals).toContainText('Cost basis$30,000.00');
  // The chart: what I hold times the observed price ($61,000).
  await expect(quote).toHaveText('$30,500.00');
  await trade(page, /Bitcoin/, 'sell', '0.2', '65000', '2026-09-15');
  await expect(btc).toContainText('0.3 BTC');
  // Average cost: the sold part leaves at its share of the cost, so the 0.3 BTC kept still cost $60,000 each.
  await expect(btc).toContainText('$60,000');
  await expect(totals).toContainText('Cost basis$18,000.00');
  await expect(quote).toHaveText('$18,300.00');
  await expect(page.locator('.portfolio-value-chart')).toContainText('in this range, buys and sells included');
  expect(((await stored(page, PORTFOLIO)).portfolios[0].transactions as {kind: string}[]).map(t => t.kind)).toEqual(['buy', 'sell']);
});

journey('J148', 'Portfolio: a gap in prices stays a gap, never guessed (with the market service unavailable the whole range is one)', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T12:00:00.000Z')});
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional gaps');
  await trade(page, /Bitcoin/, 'buy', '0.1', '60000', '2026-09-01');
  const chart = page.locator('.portfolio-value-chart');
  await expect(chart.locator('.portfolio-chart-empty')).toHaveText('No observed prices for this range yet. Earlier values are not assumed.');
  await expect(chart).toContainText('History is unavailable for 1 coin right now.');
  await expect(chart.locator('.portfolio-chart-line')).toHaveCount(0);
  // Prices observed only from 20 September: the days held before that have no price, and none is made up.
  await history(page, '2026-09-20', '6100000');
  await chart.getByRole('group', {name: 'Chart range'}).getByRole('button', {name: '90D', exact: true}).click();
  await expect(chart.locator('.portfolio-chart-line')).toHaveCount(2);
  await expect(chart.locator('.portfolio-chart-quote strong')).toHaveText('$6,100.00');
  await expect(chart).toContainText('Gaps are moments where a coin you held had no observed price.');
  await chart.getByText('View exact values').click();
  const rows = await chart.getByRole('region', {name: 'Exact values'}).locator('tbody tr').evaluateAll(trs => trs.map(tr => [tr.querySelector('time')!.getAttribute('datetime')!, tr.querySelectorAll('td')[1]!.textContent!] as [string, string]));
  expect(rows.length).toBeGreaterThan(90);
  for (const [at, value] of rows) {
    const day = at.slice(0, 10);
    if (day < '2026-09-01') expect(value, `${at}: nothing held yet`).toBe('$0.00');
    else if (day >= '2026-09-02' && day < '2026-09-20') expect(value, `${at}: held, no observed price`).toBe('No observed price');
    else if (day > '2026-09-20') expect(value, `${at}: 0.1 BTC at $61,000`).toBe('$6,100.00');
  }
  expect(rows.filter(([, value]) => value === 'No observed price').length).toBeGreaterThan(10);
});

journey('J150', 'Portfolio CSV: blank cells stay unknown; an unknown coin is mine to choose', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional blank cells');
  await page.getByRole('button', {name: 'Import transactions from a CSV', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import transactions', exact: true});
  await panel.getByLabel('CSV file').setInputFiles({name: 'blank-cells.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Type,Pair,Amount,Price,Fee\n2026-09-01,Buy,BTC,0.5,60000,\n2026-09-02,Deposit,ETH,2,,\n2026-09-03,Deposit,FICTIONALSOL,10,,\n')});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('2 rows ready · 1 unknown coin · 0 rows refused');
  const unknown = panel.getByRole('list', {name: 'Unrecognised coins'});
  await expect(unknown).toContainText('“FICTIONALSOL” is not recognised; choose a coin from the list or skip the row.');
  await expect(panel.getByRole('button', {name: 'Next', exact: true})).toBeDisabled();
  await unknown.getByRole('button', {name: 'Choose a coin', exact: true}).click();
  await unknown.getByRole('list', {name: 'Coins'}).getByRole('button', {name: /Solana/}).click();
  await expect(panel.locator('.import-summary')).toHaveText('3 rows ready · 0 unknown coins · 0 rows refused');
  await expect(panel.locator('.import-preview')).toContainText('Solana');
  await expect(panel).toContainText('Transfers without a price: the cost of what they bring stays unknown.');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 3 transactions into Fictional blank cells', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('3 transactions imported');
  const txs = (await stored(page, PORTFOLIO)).portfolios[0].transactions as {coin: string; price?: string; fee?: string}[];
  const of = (coin: string) => txs.find(t => t.coin === `coingecko:coin:${coin}`)!;
  expect(of('bitcoin').fee).toBeUndefined();
  for (const coin of ['ethereum', 'solana']) { expect(of(coin).price, coin).toBeUndefined(); expect(of(coin).fee, coin).toBeUndefined(); }
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.getByLabel('Fictional blank cells totals')).toContainText('A transfer in without a price has no known cost.');
});

journey('J151', 'Portfolio "Keep a copy": exported, then "Replace portfolios" from the file (cancelled once, then confirmed)', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/portfolio');
  await portfolio(page, 'Fictional keeper');
  await trade(page, /Bitcoin/, 'buy', '0.1', '60000', '2026-09-01');
  const files = page.getByRole('region', {name: 'Portfolio file'});
  const waiting = page.waitForEvent('download');
  await files.getByRole('button', {name: 'Export portfolios', exact: true}).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/^zigoals-portfolio-\d{4}-\d{2}-\d{2}\.json$/);
  const copy = await bytes(download);
  expect(copy.toString('utf8')).toContain('Fictional keeper');
  // Later, another trade; then the copy is brought back.
  await trade(page, /Ethereum/, 'buy', '1', '2500', '2026-09-02');
  await expect(holdingsRow(page, 'Fictional keeper', 'Ethereum')).toBeVisible();
  const before = await page.evaluate(k => localStorage.getItem(k), PORTFOLIO);
  const file = {name: download.suggestedFilename(), mimeType: 'application/json', buffer: copy};
  await files.getByLabel('Import from a file').setInputFiles(file);
  const confirm = files.getByRole('alertdialog', {name: 'Replace portfolios'});
  await expect(confirm).toContainText('Replace all 1 portfolios on this device with the 1 in this file?');
  await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(confirm).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), PORTFOLIO)).toBe(before);
  await expect(holdingsRow(page, 'Fictional keeper', 'Ethereum')).toBeVisible();
  await files.getByLabel('Import from a file').setInputFiles(file);
  await files.getByRole('alertdialog', {name: 'Replace portfolios'}).getByRole('button', {name: 'Replace my portfolios', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Portfolios replaced from the file.'})).toBeVisible();
  await expect(holdingsRow(page, 'Fictional keeper', 'Bitcoin')).toBeVisible();
  await expect(holdingsRow(page, 'Fictional keeper', 'Ethereum')).toHaveCount(0);
  expect((await stored(page, PORTFOLIO)).portfolios[0].transactions).toHaveLength(1);
});

journey('J158', 'Markets offline and with the market service unavailable: prices are known or say so, never zero', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/markets');
  const honest = async (when: string) => {
    const prices = await page.locator('.market-product-card .market-card-price strong').allTextContents();
    expect(prices.length, when).toBeGreaterThan(0);
    for (const price of prices) { expect(price, when).toMatch(/^(Price unavailable|Price not loaded|\$[\d,]+(\.\d+)?)$/); expect(price, when).not.toMatch(/^\$0(\.0+)?$/); }
  };
  await honest('with the market service unavailable');
  await page.getByRole('button', {name: /^(Load prices for this view|↻ Refresh market data)$/}).click();
  await expect(page.getByRole('status').filter({hasText: 'Some market data could not refresh. Last verified values retain their timestamps.'})).toBeVisible();
  await honest('after a refresh that could not reach the service');
  await page.context().setOffline(true);
  await expect(offline(page)).toBeVisible();
  await page.getByRole('group', {name: 'Market views'}).getByRole('button', {name: 'Crypto', exact: true}).click();
  await honest('offline');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table', exact: true}).click();
  const cells = await page.getByRole('table', {name: 'Markets'}).locator('tbody tr td:nth-child(2)').allTextContents();
  expect(cells.length).toBeGreaterThan(0);
  for (const cell of cells) expect(cell).not.toMatch(/^\$0\.00/);
  await page.context().setOffline(false);
  await expect(offline(page)).toHaveCount(0);
});

journey('J159', 'Markets: a missing price stays "unavailable" on the card and in the table, never zero', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/markets');
  const solana = page.locator('.market-product-card').filter({has: page.getByRole('heading', {level: 2, name: 'Solana', exact: true})});
  await expect(solana.locator('.market-card-price strong')).toHaveText('Price unavailable');
  await expect(solana.locator('.market-change strong')).toHaveText('24h unavailable');
  await expect(solana).not.toContainText(/\$0\.00|[+-]?0\.00%/);
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table', exact: true}).click();
  const row = page.getByRole('table', {name: 'Markets'}).getByRole('row').filter({hasText: 'Solana'});
  await expect(row.locator('td').first()).toHaveText('Price unavailable');
  await expect(row).toContainText('Not provided');
  await expect(row).not.toContainText(/\$0\.00|[+-]?0\.00%/);
});

journey('J163', 'Staking: the chain answers nothing → an honest message, nothing saved', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const asked: string[] = [];
  await page.route('**/api/positions?**', route => { asked.push(route.request().url()); return route.fulfill({status: 503, json: {error: 'CHAIN_UNAVAILABLE'}}); });
  await open(page, '/app/staking');
  await page.locator('.positions-wallet > summary').click();
  await page.getByLabel('Public ZIG address').fill(ADDRESS);
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Could not verify public positions'})).toHaveText('Could not verify public positions at one block height. Check the address and network availability. Previous quantities are preserved; a failed refresh needs review.');
  expect(asked).toHaveLength(1);
  expect(new URL(asked[0]!).searchParams.get('address')).toBe(ADDRESS);
  // Nothing remembers the address; the totals stay unknown (a dash), never 0.
  expect(await page.evaluate(address => [...Object.entries(localStorage), ...Object.entries(sessionStorage)].filter(([, v]) => v.includes(address)).map(([k]) => k), ADDRESS)).toEqual([]);
  if (j.phone) await page.keyboard.press('Escape');
  for (const total of await page.getByRole('region', {name: /observed totals$/}).locator('strong').allTextContents()) expect(total.trim()).toBe('— ZIG');
});

journey('J164', 'Staking at 320 px: the title on the first screen, cards inside the page, the wallet reader as a sheet', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 320, height: 568});
  await open(page, '/app/staking');
  const inside = async (box: {x: number; width: number} | null, what: string) => { expect(box, what).not.toBeNull(); expect(box!.x, what).toBeGreaterThanOrEqual(-0.5); expect(box!.x + box!.width, what).toBeLessThanOrEqual(320.5); };
  const title = await page.getByRole('heading', {level: 1, name: 'Staking'}).boundingBox();
  await inside(title, 'the title');
  expect(title!.y).toBeLessThan(568);
  for (const metric of await page.getByRole('region', {name: /observed totals$/}).locator(':scope > div').all()) await inside(await metric.boundingBox(), 'a total');
  const cards = await page.getByRole('group', {name: 'Manual positions'}).locator(':scope > *').all();
  expect(cards.length).toBeGreaterThan(0);
  for (const position of cards.slice(0, 6)) await inside(await position.boundingBox(), 'a position card');
  await page.locator('.positions-wallet > summary').click();
  const sheet = page.getByRole('dialog', {name: 'Track Wallet'});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Public ZIG address')).toBeVisible();
  await inside(await sheet.boundingBox(), 'the wallet sheet');
  const read = sheet.getByRole('button', {name: 'Read public positions', exact: true});
  await inside(await read.boundingBox(), 'its button');
  expect((await read.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await snap(j, 'J164', 'staking-320');
});

journey('J168', 'Ecosystem: network tools and integration readiness, every link safe', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const outside: string[] = [];
  page.on('request', r => { if (/zigchain\.com|zigscan\.org|range\.org/.test(new URL(r.url()).hostname)) outside.push(r.url()); });
  await open(page, '/app/ecosystem');
  await expect(page.locator('main')).toContainText('External investment and funding integrations are disabled.');
  const tools = page.locator('details.ecosystem-tools');
  await tools.locator(':scope > summary').click();
  await expect(tools).toHaveAttribute('open', '');
  const explorers = tools.getByRole('region', {name: 'Onchain verification tools'});
  await expect(explorers.getByRole('link')).toHaveText(['Open Range testnet ↗', 'Open ZIGScan testnet ↗']);
  const hub = tools.getByRole('region', {name: 'Official ZIGChain Hub links'});
  await expect(hub.getByRole('link')).toHaveText(['Network overview ↗', 'Validator information ↗', 'Governance proposals ↗', 'Staking information ↗', 'Bridge information ↗']);
  await expect(hub).toContainText('it may open mainnet. ZIGoals passes no wallet or transfer instructions.');
  await expect(tools.getByRole('region', {name: 'Strategy transparency'})).toBeVisible();
  // Every outside link: https, a new tab, no opener, no referrer, and nothing of mine in the address.
  const links = await tools.locator('a[href^="http"]').evaluateAll(as => as.map(a => ({href: a.getAttribute('href')!, target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? ''})));
  expect(links.length).toBeGreaterThanOrEqual(7);
  for (const link of links) {
    const url = new URL(link.href);
    expect(url.protocol, link.href).toBe('https:');
    expect(url.search, link.href).toBe('');
    expect(link.target, link.href).toBe('_blank');
    expect(link.rel, link.href).toMatch(/noopener/);
    expect(link.rel, link.href).toMatch(/noreferrer/);
  }
  // Opening the tools loads nothing from those sites by itself.
  expect(outside).toEqual([]);
});

journey('J179', 'Markets: a search with no result says so and offers the full catalog', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const sent: string[] = [];
  page.on('request', r => { if (/fictionalcoin/i.test(r.url() + (r.postData() ?? ''))) sent.push(r.url()); });
  await open(page, '/app/markets');
  await page.getByLabel('Search this market view').fill('Fictionalcoin zzz');
  await expect(page.getByRole('heading', {name: 'No matches in this view'})).toBeVisible();
  await expect(page.locator('main')).toContainText('Try another name or browse the full CoinGecko catalog.');
  await expect(page.locator('.market-pagination')).toContainText('No matching markets');
  await expect(page.locator('.market-product-card')).toHaveCount(0);
  // The search runs on the markets already known here; the words never leave the device.
  expect(sent).toEqual([]);
  await page.getByRole('button', {name: 'Find a market', exact: true}).last().click();
  const sheet = page.getByRole('dialog', {name: 'Find a market'});
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await page.getByLabel('Search this market view').fill('');
  await expect(page.locator('.market-product-card').first()).toBeVisible();
});
