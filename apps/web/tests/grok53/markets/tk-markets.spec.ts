import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

// Session AL, lane L1 (Tokyo pass 2, 7 and 9i/9j, desktop 1280×800, fresh profile).
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

test('TK-117/N-TK-07 (P-TK-19): starring a market in the table leaves every row where it was; removing says so with Undo', async ({page}) => {
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  const names = () => page.locator('table.market-table tbody th').allInnerTexts();
  const before = await names();
  const third = page.locator('table.market-table tbody tr').nth(2), name = (await third.locator('th strong').innerText()).trim();
  await third.getByRole('button', {name: `Add ${name} favourite`}).click();
  await expect(third.getByRole('button', {name: `Remove ${name} favourite`})).toBeVisible();
  expect(await names()).toEqual(before);
  await third.getByRole('button', {name: `Remove ${name} favourite`}).click();
  await expect(page.locator('.aa-toast')).toContainText(`${name} removed from your favourites.`);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect(third.getByRole('button', {name: `Remove ${name} favourite`})).toBeVisible();
  expect(await names()).toEqual(before);
});

test('TK-204 (P-TK-66; M2): the Market, Price, 24h and Market cap headers sort the table and say so (aria-sort)', async ({page}) => {
  await page.goto('/app/markets');
  await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
  await page.getByRole('columnheader', {name: 'Market', exact: true}).getByRole('button').click();
  await expect(page.locator('table.market-table thead th[aria-sort=ascending]')).toContainText('Market');
  const names = await page.locator('table.market-table tbody th strong').allInnerTexts();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  await expect(page.getByLabel('Sort')).toHaveValue('name');
});

test('TK-205 (P-TK-67; M9): Refresh market data says how it went, beside the button', async ({page}) => {
  await page.goto('/app/markets');
  const button = page.getByRole('button', {name: /Load prices for this view|Refresh market data/});
  await button.click();
  await expect(page.locator('.market-refresh-note')).toContainText(/could not be refreshed|updated at/);
});

test('TK-033/M6 (P-TK-73): the chosen Markets view is still chosen after opening a coin and going Back', async ({page}) => {
  await page.goto('/app/markets');
  const views = page.getByRole('group', {name: 'Market views'});
  await views.getByRole('button', {name: 'Crypto', exact: true}).click();
  await page.locator('.markets-grid .market-product-card h2 a').first().click();
  await page.waitForURL('**/app/wealth/asset/**');
  await page.goBack();
  await expect(views.getByRole('button', {name: 'Crypto', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('TK-028/TK-213/TK-120 (P-TK-03; W8, M13, M14) and TK-033: the coin page writes its chart price as money, says it is the last chart observation, and never calls the chart change the 24h change', async ({page}) => {
  const now = Date.now(), points = Array.from({length: 40}, (_, i) => ({at: new Date(now - (39 - i) * 2.3 * 86400000 - 3600000).toISOString(), value: String(7684177423078995n + BigInt(i) * 1000000000000n), decimals: 11}));
  await page.route('**/api/market-history', async route => {
    const body = route.request().postDataJSON() as {request: {marketRef: unknown; currency: string; range: string}};
    await route.fulfill({json: {history: {...body.request, source: 'CoinGecko', fetchedAt: new Date(now - 60000).toISOString(), points}, error: null, stale: false, nextAttemptAt: now + 60000}});
  });
  await page.goto('/app/wealth/asset/' + encodeURIComponent('coingecko:coin:bitcoin'));
  const quote = page.locator('.price-chart-quote');
  await expect(quote.locator('strong').first()).toHaveText(/^\$7\d,\d{3}\.\d\d$/);
  await expect(quote).toContainText('last chart observation');
  await expect(quote).toContainText('not the 24h change');
  await expect(page.getByRole('group', {name: 'Chart range'})).toContainText('90D');
  await expect(page.getByRole('group', {name: 'Chart range'})).toContainText('Max');
  await expect(quote).not.toContainText(/\d{5}\.\d{6,}/);
});
