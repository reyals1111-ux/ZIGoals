import {expect, test} from '@playwright/test';

// Session AJ (item 30, D11): trader tools on a portfolio with sells: off until turned on; trade health from the recorded
// trades (FIFO, fees counted), a tilt check after three losing sales within 48 hours (dismissible for 7 days), and a
// leverage illustration that stores nothing. Market answers are MOCK and offline; nothing reaches a provider.
const HOUR = 3_600_000, at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString(), dayOf = (iso: string) => iso.slice(0, 10);
const t = (id: string, kind: string, quantity: string, createdAt: string, price: string, fee?: string) => ({id, coin: 'coingecko:coin:bitcoin', kind, quantity, date: dayOf(createdAt), note: '', createdAt, price, ...(fee ? {fee} : {})});
const buyAt = at(24 * 40);
const PORTFOLIOS = {version: 1, portfolios: [{id: 'p-trade', name: 'Fictional trades', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', coins: [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}],
  transactions: [t('b1', 'buy', '4', buyAt, '100', '4'), t('s1', 'sell', '1', at(30), '90', '1'), t('s2', 'sell', '1', at(20), '80', '1'), t('s3', 'sell', '1', at(10), '85', '1')]}]};

test('trader tools: off until turned on; trade health, the tilt check and the leverage illustration from your own trades', async ({page}) => {
  for (const path of ['**/api/market-assets*', '**/api/market-quotes', '**/api/market-insights', '**/api/market-detail', '**/api/market-history']) await page.route(path, route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(value => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('zigoals:portfolio:v1', value); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, JSON.stringify(PORTFOLIOS));
  await page.goto('/app/portfolio');
  await page.getByRole('tab', {name: 'Insights'}).click();
  const offer = page.getByRole('region', {name: 'Trader tools'});
  await expect(offer).toContainText('Off until you turn them on; not advice.');
  await offer.getByRole('button', {name: 'Turn on trader tools'}).click();

  const tools = page.getByRole('region', {name: 'Trade health'});
  // Three sales of 1 from a lot costing 101 each (100 + a 4 fee over 4): −12, −22, −17 with their 1 fee each.
  await expect(tools.getByRole('definition').nth(0)).toHaveText('3');
  await expect(tools).toContainText('0 · 3');
  await expect(tools).toContainText('Share won0%');
  await expect(tools).toContainText(/Average hold\s*\d+ days/);
  await expect(tools.getByRole('listitem').first()).toContainText('−');
  const tilt = tools.getByRole('note', {name: 'A moment to check in'});
  await expect(tilt).toContainText('3 sales at a loss within 48 hours this week.');
  await expect(tilt).toContainText('not advice');
  await tilt.getByRole('button', {name: 'Not now (for 7 days)'}).click();
  await expect(tilt).toHaveCount(0);

  await tools.getByText('The cost of leverage (an illustration)').click();
  await tools.getByLabel('Position size (USD)').fill('10000');
  await tools.getByLabel('Entry price (USD)').fill('50000');
  await tools.getByLabel('Days held').fill('73');
  await tools.getByRole('button', {name: 'Work it out'}).click();
  const result = tools.getByRole('status');
  await expect(result).toContainText('Keeping it open 73 days costs about $200.00, 10% of your $2,000.00 margin.');
  await expect(result).toContainText('A move of 20% against you (to about $40,000.00) would use up that margin');

  // Only the opt-in and the dismissal are stored; the figures typed are not.
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1') ?? 'null'));
  expect(Object.keys(prefs.trader).sort()).toEqual(['on', 'tiltHiddenUntil']);
  expect(JSON.stringify(prefs)).not.toContain('50000');
  await page.reload();
  await page.getByRole('tab', {name: 'Insights'}).click();
  await expect(page.getByRole('region', {name: 'Trade health'})).toBeVisible();
  await expect(page.getByRole('note', {name: 'A moment to check in'})).toHaveCount(0);
  await page.getByRole('region', {name: 'Trade health'}).getByRole('button', {name: 'Turn off'}).click();
  await expect(page.getByRole('region', {name: 'Trader tools'})).toBeVisible();
});
