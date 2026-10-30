import {expect, test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

// Session AJ (item 15, WE17/J11; D9): a price alert on a coin's page fires from the price the app already read (a MOCK
// quote; nothing reaches a provider), shows once as a toast, waits on Today until "Seen", and is listed in Activity.
// In the app only: no request is made for the alert itself.
const coin = (id: string, name: string, symbol: string) => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol});
const PORTFOLIOS = {version: 1, portfolios: [{id: 'p-real', name: 'Fictional coins', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', coins: [coin('bitcoin', 'Bitcoin', 'BTC')],
  transactions: [{id: 't1', coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.5', date: '2026-09-01', note: '', createdAt: '2026-09-01T12:00:00.000Z', price: '60000'}]}]};

test('a price alert set on a coin\'s page fires from the price already read, waits on Today until seen, and is in Activity', async ({page, isMobile}) => {
  const quoteRequests: unknown[] = [];
  await page.route('**/api/market-assets*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/market-quotes', route => {
    const body = route.request().postDataJSON() as {requests: {marketRef: {id: string}; currency: string}[]}; quoteRequests.push(body);
    return route.fulfill({json: {quotes: body.requests.filter(r => r.marketRef.id === 'bitcoin' && r.currency === 'USD').map(r => ({base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, marketRef: r.marketRef, currency: 'USD', price: '70000', priceDecimals: 0, source: 'CoinGecko', providerAssetId: 'bitcoin', observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), verification: 'VERIFIED'})), error: null}});
  });
  for (const path of ['**/api/market-insights', '**/api/market-detail', '**/api/market-history']) await page.route(path, route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  // A person past the welcome (Today shows its For-you cards then).
  await page.addInitScript(([value, settingsKey, settings]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('zigoals:portfolio:v1', value!); localStorage.setItem(settingsKey!, settings!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [JSON.stringify(PORTFOLIOS), DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);

  await page.goto('/app/portfolio/coin/bitcoin?portfolio=p-real');
  const section = page.getByRole('region', {name: 'Price alert for Bitcoin'});
  await section.getByText('Price alert', {exact: true}).click();
  const form = section.getByRole('form', {name: 'Price alert for Bitcoin'});
  await form.getByLabel('Goes').selectOption('above');
  await form.getByLabel('Price (USD)').fill('65000');
  await form.getByRole('button', {name: 'Set alert'}).click();
  await expect(form.getByRole('status')).toContainText('Alert set: Bitcoin above 65000 USD');
  // The price already read (70,000) is above it: the alert fires once, as a toast, and turns itself off.
  await expect(page.getByText('Price alert: Bitcoin is above 65000 USD: 70000 USD (CoinGecko).')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:price-alerts:v1') ?? 'null'));
  expect(stored.alerts).toHaveLength(1);
  expect(stored.alerts[0]).toMatchObject({kind: 'price', coin: 'bitcoin', direction: 'above', price: '65000', currency: 'USD', active: false, channels: {inApp: true, push: false}});
  expect(stored.alerts[0].firedAt).toBeTruthy();
  expect(stored.fired).toHaveLength(1);
  // No request carried the alert: the quote requests name public coin identities only.
  expect(JSON.stringify(quoteRequests)).not.toContain('65000');

  await page.goto('/app');
  // On a phone every For-you card starts behind "Show more" (TODAY_FOR_YOU_OPEN), as designed.
  if (isMobile) await page.getByRole('region', {name: 'For you'}).getByRole('button', {name: /^Show more/}).click();
  const card = page.getByRole('region', {name: '1 price alert reached'});
  await expect(card).toContainText('Bitcoin is above 65000 USD: 70000 USD (CoinGecko).');
  await expect(card).toContainText('Information only, not advice.');
  await card.getByRole('button', {name: 'Seen'}).click();
  await expect(page.getByRole('region', {name: /price alert/})).toHaveCount(0);

  await page.goto('/app/activity');
  await expect(page.getByText('Price alert reached').first()).toBeVisible();
  await expect(page.getByText('Bitcoin is above 65000 USD: 70000 USD (CoinGecko).').first()).toBeVisible();
});
