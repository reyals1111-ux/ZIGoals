import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';

/**
 * Session AI (J14): read-only exchanges, with ZIGoals' relay answered by fixtures (never a real exchange or key). A key is
 * checked on the exchange's own word and refused when it can do more than read; a kept key is sealed in IndexedDB, never in
 * localStorage, and the relay only ever sees the key id and a signature; Remove erases it. Empty start, fictional data.
 */
const SECRET = btoa('fictional-kraken-private-key-for-tests-only-0123456789');
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [PORTFOLIO_KEY]: JSON.stringify({version: 1, portfolios: [{id: 'p-real', name: 'Mine', kind: 'real', currency: 'USD', createdAt: '2026-10-28T08:00:00.000Z', coins: [], transactions: []}]}),
  });
});
async function relayFixtures(page: Page, permissions: Record<string, unknown>) {
  const bodies: string[] = [];
  await page.route('**/api/exchange', async route => {
    const body = route.request().postData() ?? ''; bodies.push(body);
    const call = (JSON.parse(body) as {call: string}).call;
    await route.fulfill({json: {status: 200, data: call === 'permissions' ? permissions : {error: [], result: {XXBT: {balance: '0.5'}, ZEUR: {balance: '0'}}}}});
  });
  return bodies;
}
const sealedCount = (page: Page) => page.evaluate(() => new Promise<number>(resolve => { const r = indexedDB.open('zigoals-exchange-keys-v1'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('keys')) { db.close(); resolve(0); return; } const q = db.transaction('keys').objectStore('keys').count(); q.onsuccess = () => { db.close(); resolve(q.result); }; }; r.onerror = () => resolve(-1); }));

test('Kraken: a read-only key is checked, sealed on the device, read and imported; the secret never leaves; Remove erases it', async ({page}) => {
  const bodies = await relayFixtures(page, {error: [], result: {permissions: ['query-funds', 'query-ledger']}});
  await page.goto('/app/portfolio');
  const panel = page.getByRole('region', {name: 'Exchanges (read-only)'});
  await panel.getByRole('button', {name: 'Connect Kraken'}).click();
  const form = panel.getByRole('form', {name: 'Connect Kraken'});
  await expect(form).toContainText('Tick only Query Funds');
  await form.getByLabel('API key').fill('FICTIONAL-KRAKEN-KEY');
  await form.getByLabel('Private key').fill(SECRET);
  await form.getByRole('button', {name: 'Check and connect'}).click();
  await expect(panel.getByRole('status')).toContainText('Kraken connected, read-only: 1 asset read.');
  await expect(panel.getByRole('article', {name: 'Kraken'})).toContainText('0.5 BTC');
  // The secret is in no relay request, nowhere in localStorage; one sealed record in IndexedDB.
  expect(bodies.length).toBeGreaterThanOrEqual(2);
  for (const body of bodies) expect(body).not.toContain(SECRET);
  expect(await page.evaluate(s => Object.values(localStorage).some(v => v.includes(s)), SECRET)).toBe(false);
  expect(await sealedCount(page)).toBe(1);
  // Into the real portfolio, as a read-only "from wallet" row.
  const imports = page.getByRole('region', {name: 'From your wallets and exchanges (read-only)'});
  await expect(imports).toContainText('0.5 BTC · Kraken');
  await imports.getByRole('button', {name: 'Import as a transfer in'}).click();
  await expect(imports).toContainText('imported, from wallet');
  // Remove: the sealed key and the connection go.
  await panel.getByRole('button', {name: 'Remove exchange'}).click();
  await expect(panel.getByRole('status')).toContainText('Kraken removed: its key is erased from this device.');
  expect(await sealedCount(page)).toBe(0);
});
test('Binance: a key that can withdraw is refused on Binance\'s own word, and nothing is kept', async ({page}) => {
  await relayFixtures(page, {enableReading: true, enableWithdrawals: true, enableSpotAndMarginTrading: false});
  await page.goto('/app/portfolio');
  const panel = page.getByRole('region', {name: 'Exchanges (read-only)'});
  await panel.getByRole('button', {name: 'Connect Binance'}).click();
  const form = panel.getByRole('form', {name: 'Connect Binance'});
  await form.getByLabel('API key').fill('FICTIONAL-BINANCE-KEY');
  await form.getByLabel('Secret key').fill('fictional-binance-secret');
  await form.getByRole('button', {name: 'Check and connect'}).click();
  await expect(panel.getByRole('alert')).toContainText('This key can do more than read (enableWithdrawals)');
  await expect(panel.getByRole('alert')).toContainText('Nothing was kept.');
  expect(await sealedCount(page)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:exchanges:v1'))).toBeNull();
});
