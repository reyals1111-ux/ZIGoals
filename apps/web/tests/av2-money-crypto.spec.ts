import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {applyTheme, axe, THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (money; CoinStats): a coin that moves 5 % either way within 24 hours (the 24 h change the market
 * insights already carry: a MOCK −7 %), a portfolio alert at 10 % down from its value now, "Count in results" on one
 * transaction, and "On a past day" (the Time Machine) — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. MOCK quotes (70,000 USD); the market history answers 503, so the past day says so.
 */
const coin = (id: string, name: string, symbol: string) => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol});
const PORTFOLIOS = {version: 1, portfolios: [{id: 'p-real', name: 'Fictional coins', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', coins: [coin('bitcoin', 'Bitcoin', 'BTC')],
  transactions: [{id: 't1', coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.5', date: '2026-09-01', note: '', createdAt: '2026-09-01T12:00:00.000Z', price: '60000'},
    {id: 't2', coin: 'coingecko:coin:bitcoin', kind: 'transfer-in', quantity: '0.1', date: '2026-10-01', note: 'A gift', createdAt: '2026-10-01T12:00:00.000Z', price: '62000'}]}]};
async function mock(page: Page) {
  await page.route('**/api/market-assets*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/market-quotes', route => {
    const body = route.request().postDataJSON() as {requests: {marketRef: {id: string}; currency: string}[]};
    return route.fulfill({json: {quotes: body.requests.filter(r => r.marketRef.id === 'bitcoin' && r.currency === 'USD').map(r => ({base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, marketRef: r.marketRef, currency: 'USD', price: '70000', priceDecimals: 0, source: 'CoinGecko', providerAssetId: 'bitcoin', observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), verification: 'VERIFIED'})), error: null}});
  });
  await page.route('**/api/market-insights', route => {
    const body = route.request().postDataJSON() as {requests: {marketRef: {id: string; provider: string; kind: string}; currency: string}[]};
    const entries = body.requests.filter(r => r.marketRef.id === 'bitcoin').map(r => ({...r, source: 'CoinGecko', marketBasis: 'coin', logoUrl: null, change24h: '-7', observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), sparkline: null}));
    return route.fulfill({json: {entries, results: Object.fromEntries(entries.map(e => [`coingecko:coin:${e.marketRef.id}:${e.currency}`, {insight: e, error: null, stale: false}])), error: null}});
  });
  for (const path of ['**/api/market-detail', '**/api/market-history']) await page.route(path, route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(([value, settingsKey, settings]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('zigoals:portfolio:v1', value!); localStorage.setItem(settingsKey!, settings!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [JSON.stringify(PORTFOLIOS), DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
for (const theme of THEMES) test(`${theme}: a 24 h move alert, a portfolio percent alert, a transaction left out of the results, a past day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await mock(page);
  await page.goto('/app/portfolio/coin/bitcoin?portfolio=p-real');
  const section = page.getByRole('region', {name: 'Price alert for Bitcoin'});
  await section.getByText(/^Price alert/).click();
  const form = section.getByRole('form', {name: 'Price alert for Bitcoin'});
  await form.getByLabel('Bitcoin moves a percent within 24 hours').check();
  // Session AV lane 2 (getByLabel('Moves') also matched the radio “… moves a percent …”: the select by its role and name, deliberate)
  await form.getByRole('combobox', {name: /^Moves/}).selectOption('either');
  await form.getByLabel('By at least (%)').fill('5');
  const findings = await axe(page, section);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Set alert'}).click();
  await expect(form.getByRole('status')).toContainText('Alert set: Bitcoin moves 5% up or down in 24 h.');
  // The 24 h change already read (−7 %) passes 5 %: the watcher tells once.
  await expect(page.getByText('Move alert: Bitcoin moved -7% in 24 h in USD (your alert: 5% up or down).')).toBeVisible();
  expect((await stored(page, 'zigoals:price-alerts:v1')).moves[0]).toMatchObject({coin: 'bitcoin', percent: 5, direction: 'either', active: true});
  // A portfolio 10 % down from its value now (0.6 BTC × 70,000 = 42,000).
  await page.goto('/app/portfolio');
  const value = page.locator('details.portfolio-value-alert').first();
  await value.locator('summary').click();
  const vform = value.getByRole('form', {name: 'Value alert for Fictional coins'});
  await vform.getByLabel(/worth a percent more or less than now \(42000\.00 USD\)/).check();
  // Session AV lane 2 (getByLabel('Moves') also matched the radio “… moves a percent …”: the select by its role and name, deliberate)
  await vform.getByRole('combobox', {name: /^Moves/}).selectOption('down');
  await vform.getByLabel('By at least (%)').fill('10');
  await vform.getByRole('button', {name: 'Set alert'}).click();
  await expect(vform.getByRole('status')).toContainText('Alert set: Fictional coins worth 10% down from 42000 USD.');
  // Count in results: the gift left out; its coins still count in the value.
  // Session AV lane 2 (the portfolio's third tab is named "Transactions" since Session AL: its own name, exactly, deliberate)
  await page.getByRole('tab', {name: 'Transactions', exact: true}).first().click();
  await page.getByRole('checkbox', {name: /^Count in results: .* 0\.1 BTC/}).uncheck();
  await expect.poll(async () => (await stored(page, 'zigoals:portfolio-receipts:v1'))?.uncounted).toEqual(['t2']);
  await expect(page.locator('.portfolio-left-out')).toContainText('1 transaction is left out of the results');
  // The Time Machine: the market history is not available here, and it says so.
  await page.getByRole('tab', {name: 'Analysis'}).first().click();
  const past = page.getByRole('region', {name: 'On a past day'});
  await past.getByLabel('Day').fill('2026-10-15');
  await expect(past).toContainText('could not be read now');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
