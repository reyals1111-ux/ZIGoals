import {expect, test, type Page} from '@playwright/test';
import {navLink} from './phone-nav';

// Session I, Part 11: Portfolio, kept on this device (zigoals:portfolio:v1). Without prices, values stay unknown; it
// never changes Wealth, Goals or Positions.
const KEY = 'zigoals:portfolio:v1';
async function start(page: Page) {
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  return requests;
}
const stored = (page: Page) => page.evaluate(key => { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }, KEY);

test('create a portfolio and record transactions; without prices values stay unknown, and Wealth is untouched', async ({page}) => {
  await start(page);
  await page.goto('/app/wealth');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const wealthBefore = await page.locator('main').innerText();
  await (await navLink(page, 'Portfolio')).click();
  await expect(page).toHaveURL(/\/app\/portfolio$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Portfolio'})).toBeVisible();
  expect(await stored(page)).toBeNull();
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill('Fictional coins');
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Fictional coins created.'})).toBeVisible();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  // The catalog is unavailable here, so the featured coins remain to choose from.
  await expect(form).toContainText('The full coin list is unavailable right now.');
  await expect(form.getByRole('list', {name: 'Coins'}).getByRole('button')).toHaveText([/Bitcoin\s*BTC/, /Ethereum\s*ETH/, /ZIG\s*ZIG/, /USD Coin\s*USDC/, /Solana\s*SOL/]);
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Quantity').fill('0,5');
  await form.getByLabel('Price per coin (USD)').fill('60000');
  await form.getByLabel('Fee (USD) — optional').fill('10');
  await form.getByLabel('Date').fill('2026-09-01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Buy of BTC recorded.'})).toBeVisible();
  // Session W Part 15: the holdings are a table (one row per coin); the row says the same things, exactly.
  const holding = page.getByRole('table', {name: 'Fictional coins holdings'}).getByRole('row').filter({hasText: 'Bitcoin'});
  await expect(holding).toContainText('0.5 BTC');
  await expect(holding).toContainText('Value unknown');
  await expect(holding).toContainText('No price yet');
  await expect(holding).toContainText('$60,020.00');
  await expect(page.getByLabel('Fictional coins totals')).toContainText('Cost basis$30,010.00');
  await expect(page.getByLabel('Fictional coins totals')).toContainText('1 coin has no price yet and is not counted.');
  // Unknown is never zero: with no coin held priced, the value reads Unknown, not $0.00 (Session X Part 14).
  await expect(page.getByLabel('Fictional coins totals').locator('> div').first()).toContainText('ValueUnknown');
  await expect(page.getByText('No live price is available right now.', {exact: false})).toBeVisible();
  // A sale larger than the holding is refused, with nothing written.
  const before = await stored(page);
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Type').selectOption('sell');
  await form.getByLabel('Quantity').fill('2');
  await form.getByLabel('Price per coin (USD)').fill('61000');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'below zero'})).toBeVisible();
  expect(await stored(page)).toEqual(before);
  expect(before.portfolios[0]).toMatchObject({name: 'Fictional coins', kind: 'real', currency: 'USD', transactions: [{kind: 'buy', quantity: '0.5', price: '60000', fee: '10', date: '2026-09-01'}]});
  // Wealth reads nothing from Portfolio.
  await page.goto('/app/wealth');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(await page.locator('main').innerText()).toBe(wealthBefore);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:platform:v1'))).toBeNull();
});

test('Showcase shows a fictional portfolio with labelled fixture prices and requests no prices for it', async ({page}) => {
  const requests = await start(page);
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = requests.length;
  await page.goto('/app/portfolio');
  await expect(page.getByRole('note').filter({hasText: 'Showcase: a fictional portfolio'})).toHaveText('Showcase: a fictional portfolio with fixture prices. These are not market prices.');
  await expect(page.getByRole('heading', {name: 'Fictional long-term coins'})).toBeVisible();
  await expect(page.getByLabel('Fictional long-term coins totals')).toContainText('Value$8,450.00');
  await expect(page.getByLabel('Fictional long-term coins totals')).toContainText('Cost basisUnknown');
  await expect(page.getByText('Showcase fixture prices, not market data.')).toBeVisible();
  expect(requests.slice(before).filter(path => path.startsWith('/api/market'))).toEqual([]);
  // Viewing never writes: the fictional portfolio is not stored until something is changed.
  expect(await page.evaluate(key => Object.keys(sessionStorage).filter(k => k.endsWith(key)), KEY)).toEqual([]);
});

test('unreadable saved data shows a calm notice and is never overwritten without a choice', async ({page}) => {
  await start(page);
  await page.addInitScript(key => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, '{"version":1,"portfolios":[{"id":"x"}]}'); sessionStorage.setItem('seeded', '1'); } }, KEY);
  await page.goto('/app/portfolio');
  await expect(page.getByRole('heading', {name: 'Your saved portfolios could not be read.'})).toBeVisible();
  await expect(page.getByRole('form', {name: 'New portfolio'})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{"version":1,"portfolios":[{"id":"x"}]}');
  await page.getByRole('button', {name: 'Start over…'}).click();
  await page.getByRole('button', {name: 'Keep them'}).click();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{"version":1,"portfolios":[{"id":"x"}]}');
});

test('phone: fields are 16 px and every control is at least 44 px tall', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone layout only.');
  await start(page);
  await page.goto('/app/portfolio');
  await expect(page.getByRole('form', {name: 'New portfolio'})).toBeVisible();
  for (const field of await page.locator('main :is(input:not([type=radio]):not([type=file]), select)').all()) if (await field.isVisible()) expect(parseFloat(await field.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  for (const button of await page.locator('main button').all()) if (await button.isVisible()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
