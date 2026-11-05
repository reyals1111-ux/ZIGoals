import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated, loadShowcase} from '../../ah-helpers';

/**
 * Session AL, lane L1 fourth pass (GROK53_REPLAY_L1_1.md "STILL OPEN / CHANGED"): the Markets rows in the replay's
 * conditions (en-GB, Europe/Brussels, Dark, fresh profile with the crypto modules chosen, or the Showcase).
 */
test.use({colorScheme: 'dark', locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

async function liveHistory(page: Page) {
  await page.route('**/api/market-history', async route => {
    const {request} = route.request().postDataJSON() as {request: {marketRef: unknown; currency: string; range: string}};
    const days = ({'1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365} as Record<string, number>)[request.range] ?? 90, now = Date.now(), step = days * 86400000 / 200;
    const points = Array.from({length: 199}, (_, i) => ({at: new Date(now - days * 86400000 + (i + 1) * step).toISOString(), value: String(6000000000 + (i % 40) * 2500000), decimals: 5}));
    await route.fulfill({json: {history: {...request, source: 'CoinGecko', fetchedAt: new Date(now).toISOString(), points}, error: null, stale: false, nextAttemptAt: now + 60000}});
  });
}

test.describe('375 px', () => {
  test.use({viewport: {width: 375, height: 812}});
  test('TK-162: the Markets table at 375 shows Price, 24h and the star, or says that more columns sit to the right', async ({page}) => {
    await page.goto('/app/markets'); await hydrated(page);
    await page.getByRole('group', {name: 'Show markets as'}).getByRole('button', {name: 'Table'}).click();
    const wrap = page.locator('.market-table-wrap').first();
    await expect(wrap).toBeVisible();
    const row = wrap.locator('tbody tr').first();
    const fits = await wrap.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    if (fits) {
      for (const cell of [row.locator('td').first(), row.locator('.market-favourite')]) await expect(cell).toBeInViewport({ratio: 0.9});
    } else {
      await expect(page.locator('.data-table-more').first()).toBeVisible();
      await expect(page.locator('.data-table-more').first()).toHaveText('More columns to the right: swipe the table sideways.');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});

test.describe('1280 px', () => {
  test.use({viewport: {width: 1280, height: 800}});
  test('TK-215 / M11 / C-TK-22: a coin page with 90 days of history offers 1Y', async ({page}) => {
    await liveHistory(page);
    await page.goto('/app/wealth/asset/coingecko%3Acoin%3Abitcoin'); await hydrated(page);
    const ranges = page.getByRole('group', {name: 'Chart range'}).first();
    await expect(ranges.getByRole('button', {name: '90D'})).toBeVisible();
    await expect(ranges.getByRole('button', {name: '1Y'})).toBeVisible();
    await ranges.getByRole('button', {name: '1Y'}).click();
    await expect(ranges.getByRole('button', {name: '1Y'})).toHaveAttribute('aria-pressed', 'true');
  });

  test('C-TK-25: the coin page names the 24h figures’ time apart from the price’s own time', async ({page}) => {
    await page.goto('/app/wealth/asset/coingecko%3Acoin%3Abitcoin'); await hydrated(page);
    const time = page.locator('.market-reference-time');
    if (await time.count()) await expect(time.first()).toContainText(/24h and 7-day figures (observed|retrieved)/);
    await expect(page.locator('main')).not.toContainText(/· Observed \d/);
  });

  test('PR-084 (P-PR-65): Showcase — "doge" in Find a market shows whole symbols, never "DOG" or "@DO"', async ({page}) => {
    await loadShowcase(page);
    await page.goto('/app/markets'); await hydrated(page);
    const find = page.getByRole('searchbox').or(page.getByLabel(/Find a market/)).first();
    await find.fill('doge');
    const orbs = await page.locator('.asset-orb:not(:has(img))').allInnerTexts();
    for (const text of orbs) { expect(text.trim()).not.toBe('DOG'); expect(text.trim()).not.toMatch(/^@/); }
  });
});
