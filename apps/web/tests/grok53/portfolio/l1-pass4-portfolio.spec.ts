import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

/**
 * Session AL, lane L1 fourth pass (GROK53_REPLAY_L1_1.md "STILL OPEN / CHANGED"): the Portfolio rows in the replay's
 * conditions — 1280×800 Dark, a fresh profile with the crypto modules chosen, en-GB, Europe/Brussels. Market quotes answer
 * 503 (as on the replay's offline runs); price history answers with a real-shaped CoinGecko window, so the coin page
 * draws its chart as it does with live history (TK-026 crashed only then).
 */
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', locale: 'en-GB', timezoneId: 'Europe/Brussels'});

async function liveHistory(page: Page) {
  await page.route('**/api/market-history', async route => {
    const {request} = route.request().postDataJSON() as {request: {marketRef: unknown; currency: string; range: string}};
    const days = ({'1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365} as Record<string, number>)[request.range] ?? 90, now = Date.now(), step = days * 86400000 / 200;
    const points = Array.from({length: 199}, (_, i) => ({at: new Date(now - days * 86400000 + (i + 1) * step).toISOString(), value: String(6000000000 + (i % 40) * 2500000), decimals: 5}));
    await route.fulfill({json: {history: {...request, source: 'CoinGecko', fetchedAt: new Date(now).toISOString(), points}, error: null, stale: false, nextAttemptAt: now + 60000}});
  });
}

test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

async function buyHalfBitcoin(page: Page) {
  await page.goto('/app/portfolio');
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
  return form;
}

test('TK-026 / C-TK-19 / TK-028 / TK-113 / W8: the Portfolio coin page with live history draws the chart and its cost line (no crash)', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await liveHistory(page);
  await buyHalfBitcoin(page);
  await page.goto('/app/portfolio/coin/bitcoin');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Bitcoin');
  await expect(page.locator('.price-chart-cost-key')).toContainText(/Dashed line: your average cost in this portfolio, (US)?\$60,000\.00\./);
  await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  expect(errors.filter(e => /ZodError|invalid_format|Invalid ISO/i.test(e))).toEqual([]);
});

test('TK-024 / P8: a refused Sell (oversell, then an empty quantity) keeps Save under the pointer', async ({page}) => {
  const form = await buyHalfBitcoin(page);
  const save = form.getByRole('button', {name: 'Save transaction'});
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Type').selectOption('sell');
  await form.getByLabel('Price per coin (USD)').fill('61000');
  for (const quantity of ['10', '']) {
    await form.getByLabel('Quantity').fill(quantity);
    await save.scrollIntoViewIfNeeded();
    const before = (await save.boundingBox())!;
    await save.click();
    await expect(form.getByLabel('Quantity')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Quantity')).toBeFocused();
    await expect(form.locator('.field-error').first()).toBeInViewport();
    const after = (await save.boundingBox())!;
    // Where a person sees it: the same place in the window, so the next click lands on Save.
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  }
});

test('TK-027: on the coin page, Edit puts Save under the form at its own size; each lot method label sits beside its radio', async ({page}) => {
  const form = await buyHalfBitcoin(page);
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Type').selectOption('sell');
  await form.getByLabel('Quantity').fill('0.1');
  await form.getByLabel('Price per coin (USD)').fill('70000');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Sell of BTC recorded.'})).toBeVisible();
  await page.goto('/app/portfolio/coin/bitcoin');
  await page.getByRole('button', {name: 'Edit', exact: true}).first().click();
  const edit = page.getByRole('form', {name: 'Edit a transaction'});
  const save = (await edit.getByRole('button', {name: 'Save transaction'}).boundingBox())!, type = (await edit.getByLabel('Type').boundingBox())!;
  expect(save.height).toBeLessThanOrEqual(60);
  expect(save.y).toBeGreaterThan(type.y + type.height);
  for (const name of ['First in, first out (FIFO)', 'Last in, first out (LIFO)']) {
    const label = page.locator('.portfolio-lots-methods label').filter({hasText: name});
    const radio = (await label.locator('input[type=radio]').boundingBox())!, box = (await label.boundingBox())!;
    const text = await label.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); const rects = [...r.getClientRects()].filter(x => x.width > 30); return rects.map(x => ({x: x.left, y: x.top, h: x.height})); });
    expect(box.height).toBeLessThanOrEqual(50);
    // The words start right of the dot, on its line.
    expect(text.some(t => t.x >= radio.x + radio.width - 1 && Math.abs(t.y + t.h / 2 - (radio.y + radio.height / 2)) < 12)).toBe(true);
  }
});

test('TK-029 / X3-03: Analysis says the chart figure is "as of" its dated prices and why it can differ from Value', async ({page}) => {
  await liveHistory(page);
  await buyHalfBitcoin(page);
  await page.getByRole('tab', {name: 'Analysis'}).click();
  const quote = page.locator('.portfolio-chart-quote');
  await expect(quote).toContainText(/as of /);
  await expect(quote).toContainText('The chart reads dated prices, so it can differ a little from Value above, which uses the latest quote.');
});
