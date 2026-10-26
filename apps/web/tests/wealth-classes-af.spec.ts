import {expect, test, type Page} from '@playwright/test';

/**
 * Session AF Gate C (design critique, money pages 1–3): Wealth classes each holding once. The Showcase's Vanguard S&P 500
 * ETF (saved under Stocks, its market reference typed etf) reads "ETFs" on its card, in the filters, the class cards, the
 * composition, the allocation bar and the chart's legend, never "Stocks" in one place and "ETFs" in another; a class's
 * share is the same figure, to the same two decimals, in the composition and the allocation bar; each class has its own
 * colour; each total says what it counts and its date; a property, a custom asset and cash read in plain units.
 */
async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/wealth');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
}
const card = (page: Page, name: string) => page.locator('.owned-asset-card').filter({has: page.getByRole('heading', {level: 3, name, exact: true})});

test('one class map: the ETF reads ETFs everywhere it is classed, with one share and one colour per class', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'Every section shows unfolded on a computer');
  await showcase(page);
  await expect(card(page, 'Vanguard S&P 500 ETF').locator('.owned-asset-heading p')).toHaveText('VOO · ETFs');
  await expect(card(page, 'Apple').locator('.owned-asset-heading p')).toHaveText('AAPL · Stocks');
  const chips = page.getByRole('region', {name: 'What you have', exact: true}).getByRole('group', {name: 'Show'});
  await expect(chips.getByRole('button', {name: /^Stocks \d+$/})).toHaveText('Stocks 2');
  await expect(chips.getByRole('button', {name: /^ETFs \d+$/})).toHaveText('ETFs 1');
  await chips.getByRole('button', {name: 'ETFs 1'}).click();
  await expect(page.locator('.owned-asset-card')).toHaveCount(1);
  await expect(page.locator('.owned-asset-card h3')).toHaveText('Vanguard S&P 500 ETF');
  await chips.getByRole('button', {name: /^All \d+$/}).click();
  // The class cards.
  const mix = page.getByRole('region', {name: 'Asset mix'});
  await expect(mix.locator('.class-summary').filter({hasText: 'Stocks'})).toContainText('$15,100.00');
  await expect(mix.locator('.class-summary').filter({hasText: 'Stocks'})).toContainText('AAPL · NVDA');
  await expect(mix.locator('.class-summary').filter({hasText: 'ETFs'})).toContainText('$60,000.00');
  await expect(mix.locator('.class-summary').filter({hasText: 'ETFs'})).toContainText('VOO');
  // The composition and the allocation bar: the same classes, the same shares, two decimals each.
  const usd = page.getByRole('group', {name: 'USD portfolio composition'});
  const legend = await usd.locator('.composition-legend > div').evaluateAll(rows => Object.fromEntries(rows.map(r => [r.querySelector('dt')!.textContent!.trim(), r.querySelector('dd span')!.textContent!.trim()])));
  expect(legend.ETFs).toMatch(/^11\.9\d%$/);
  expect(legend.Stocks).toMatch(/^3\.0\d%$/);
  const allocation = page.locator('section[aria-labelledby="bottom-wealth-allocation"] .bottom-legend li');
  await expect(allocation.first()).toBeVisible();
  const shares = await allocation.evaluateAll(items => Object.fromEntries(items.map(li => [li.querySelector('span')!.textContent!.trim(), li.querySelector('strong')!.textContent!.trim()])));
  expect(shares).toEqual(legend);
  for (const share of Object.values(shares)) expect(share).toMatch(/^\d+\.\d{2}%$/);
  // One colour per class, each different.
  const swatches = await usd.locator('.composition-legend dt i').evaluateAll(marks => marks.map(m => getComputedStyle(m).backgroundColor));
  expect(new Set(swatches).size).toBe(swatches.length);
  // The chart's legend classes the ETF the same way, in the same colour as the composition's.
  await expect(page.locator('.wealth-history-legend').first()).toContainText('ETFs');
  // Each total says what it counts and its date.
  await expect(page.locator('.wealth-hero-total .wealth-total-scope')).toHaveText(/^Your valued holdings on .+2026\. Net worth, in Accounts, debts & net worth, adds accounts and takes off debts\.$/); // Session AH (WE10): never "below", which a phone folds away
  await expect(page.getByRole('article', {name: 'Net worth in USD'}).locator('.accounts-worth-scope')).toHaveText(/^Accounts \+ holdings − debts, on .+2026$/);
  await expect(page.locator('.wealth-history-readout').first()).toContainText(/Recorded total on .+ · the latest record/);
});

test('plain units: a property and a custom asset in words, and no reference price on cash', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'The cards read the same on a phone; one run is enough');
  await showcase(page);
  const home = card(page, 'Riverside apartment'), camera = card(page, 'Collectible camera'), cash = card(page, 'USD cash reserve');
  await expect(home.locator('.owned-value span')).toHaveText('1 property');
  await expect(home.locator('.owned-asset-heading p')).toHaveText('Property');
  // Session AH (WE14, D-148): a property, like cash, has no market reference price (it read "per property: Unavailable").
  await expect(home.locator('.holding-unit-price')).toHaveCount(0);
  await expect(camera.locator('.holding-unit-price')).toHaveCount(0);
  await expect(camera.locator('.owned-value span')).toHaveText('1 item');
  await expect(camera.locator('.owned-asset-heading p')).toHaveText('Custom');
  await expect(cash.locator('.holding-unit-price')).toHaveCount(0);
  // The class cards name a property or a custom asset, never its stored code.
  const mix = page.getByRole('region', {name: 'Asset mix'});
  await expect(mix.locator('.class-summary').filter({hasText: 'Property'}).locator('.class-summary-caption')).toHaveText('Riverside apartment');
  await expect(mix.locator('.class-summary').filter({hasText: 'Custom'}).locator('.class-summary-caption')).toHaveText('Collectible camera');
  await expect(page.getByRole('region', {name: 'What you have', exact: true}).locator('.owned-assets-grid').first()).not.toContainText(/\b1 (HOME|CUSTOM|UNIT)\b|per (HOME|CUSTOM|UNIT|USD|EUR)\b/);
});
