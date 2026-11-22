import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {applyTheme, axe, THEMES} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-MOVE-ALERT; CoinStats): a price alert on a percent move from today's price (saved as
 * an ordinary price alert at that price), and a value alert on a whole portfolio, checked when the portfolio shows a
 * full value — at 390 and 1440, three themes, axe-clean, no sideways scroll at 320. A MOCK quote (70,000 USD);
 * nothing reaches a provider, and no request carries an alert.
 */
const coin = (id: string, name: string, symbol: string) => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol});
const PORTFOLIOS = {version: 1, portfolios: [{id: 'p-real', name: 'Fictional coins', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z', coins: [coin('bitcoin', 'Bitcoin', 'BTC')],
  transactions: [{id: 't1', coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.5', date: '2026-09-01', note: '', createdAt: '2026-09-01T12:00:00.000Z', price: '60000'}]}]};
async function mock(page: Page) {
  const requests: string[] = [];
  await page.route('**/api/market-assets*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/market-quotes', route => {
    const body = route.request().postDataJSON() as {requests: {marketRef: {id: string}; currency: string}[]}; requests.push(JSON.stringify(body));
    return route.fulfill({json: {quotes: body.requests.filter(r => r.marketRef.id === 'bitcoin' && r.currency === 'USD').map(r => ({base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, marketRef: r.marketRef, currency: 'USD', price: '70000', priceDecimals: 0, source: 'CoinGecko', providerAssetId: 'bitcoin', observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), verification: 'VERIFIED'})), error: null}});
  });
  for (const path of ['**/api/market-insights', '**/api/market-detail', '**/api/market-history']) await page.route(path, route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(([value, settingsKey, settings]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('zigoals:portfolio:v1', value!); localStorage.setItem(settingsKey!, settings!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [JSON.stringify(PORTFOLIOS), DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
  return requests;
}
for (const theme of THEMES) test(`${theme}: 10% down from today's 70,000, and the portfolio worth above 30,000`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const requests = await mock(page);
  await page.goto('/app/portfolio/coin/bitcoin?portfolio=p-real');
  const section = page.getByRole('region', {name: 'Price alert for Bitcoin'});
  await section.getByText('Price alert', {exact: true}).click();
  const form = section.getByRole('form', {name: 'Price alert for Bitcoin'});
  // Deliberate change (Session AV, fresh-agent check q2, rank 35): the option is named plainly, a price a percent from
  // today's (CoinStats' rolling % alerts are a different thing); the same option, found by its new words.
  await form.getByLabel(/price a percent up or down from today’s 70000 USD/).check();
  await form.getByLabel('Goes').selectOption('below');
  await form.getByLabel('By (%)').fill('10');
  await expect(form).toContainText('That is 63000 USD. A price fixed from today’s, reached once; not a rolling change over a day.');
  const findings = await axe(page, section);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Set alert'}).click();
  await expect(form.getByRole('status')).toContainText('Alert set: Bitcoin below 63000 USD (10% down from 70000 USD today)');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:price-alerts:v1') ?? 'null'));
  expect(stored.alerts[0]).toMatchObject({kind: 'price', direction: 'below', price: '63000', active: true});
  // A value alert on the whole portfolio: 0.5 BTC at 70,000 is 35,000, above 30,000, so it fires on the portfolio page.
  await page.goto('/app/portfolio');
  const value = page.locator('details.portfolio-value-alert').first();
  await value.locator('summary').click();
  const vform = value.getByRole('form', {name: 'Value alert for Fictional coins'});
  await vform.getByLabel('Worth').selectOption('above');
  await vform.getByLabel('Value (USD)').fill('30000');
  await vform.getByRole('button', {name: 'Set alert'}).click();
  await expect(page.getByText('Value alert: Fictional coins is worth above 30000 USD: 35000 USD now.')).toBeVisible();
  // Session AV (q2 rank 35): a value already passed says so.
  await expect(vform.getByRole('status')).toHaveText('Fictional coins is already above 30000 USD (worth 35000.00 USD now), so this alert is reached at once.');
  await expect(value.getByRole('listitem')).toContainText('Fictional coins worth above 30000 USD · reached');
  expect(requests.join(' ')).not.toContain('63000');
  expect(requests.join(' ')).not.toContain('30000');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

// Session AV (fresh-agent check q2, rank 35; CoinStats): a portfolio-value alert is checked app-wide, not only on its
// page, and a reached one is counted on Today's "Your price alerts" card until seen.
test('a value alert set earlier fires on Today and is listed there until seen', async ({page, isMobile}) => {
  await mock(page);
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('alert-seeded')) { localStorage.setItem('zigoals:price-alerts:v1', JSON.stringify({version: 1, alerts: [], fired: [], portfolio: [{id: 'alert_value-0001', portfolioId: 'p-real', portfolioName: 'Fictional coins', currency: 'USD', direction: 'above', value: '30000', createdAt: '2026-11-01T10:00:00.000Z', active: true}]})); sessionStorage.setItem('alert-seeded', '1'); } } catch { /* storage denied */ } });
  await page.goto('/app');
  // On a phone every For-you card starts behind "Show more" (TODAY_FOR_YOU_OPEN), as designed.
  if (isMobile) await page.getByRole('region', {name: 'For you'}).getByRole('button', {name: /^Show more/}).click();
  const card = page.getByRole('region', {name: /price alerts? reached/});
  await expect(card).toBeVisible();
  await expect(card.getByRole('listitem')).toContainText('Fictional coins is worth above 30000 USD: 35000 USD now.');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:price-alerts:v1') ?? 'null'));
  expect(stored.portfolio[0]).toMatchObject({active: false});
  await card.getByRole('button', {name: 'Seen'}).click();
  await expect(page.getByRole('region', {name: /price alerts? reached/})).toHaveCount(0);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:price-alerts:v1') ?? 'null'))).portfolio[0].seenAt).toBeTruthy();
});
