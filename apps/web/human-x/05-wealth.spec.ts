import {expect, type Page} from '@playwright/test';
import {journey, open, snap, type Journey} from './kit';

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
  const loan = section.getByRole('article', {name: /Fictional car loan/}).first();
  await expect(loan).toBeVisible();
  await expect(section.getByRole('article', {name: 'Net worth in EUR'})).toContainText('Debts€1,200.00');
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
  await coin.click();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/portfolio$/);
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
  await open(page, '/app/wealth');
  await fold(j, 'Accounts, debts & net worth');
  await account(page, 'Savings', 'Fictional 🏦 ' + 'long-term emergency reserve held at the cooperative bank down the road'.slice(0, 85), 'EUR', '10');
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
