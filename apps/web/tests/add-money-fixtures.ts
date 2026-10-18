import type {Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';

/**
 * Session AF (L2b, Part 4): shared fixtures for the Add money specs. Fictional addresses; every request the page makes is
 * answered here (ZIGoals' own routes and the browser-direct balance hosts), and any request to a provider's host fails the
 * spec (a hand-off is built and checked, never opened or submitted).
 */
export const EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', ZIG = toBech32('zig', new Uint8Array(20).fill(9));
export const HUB = toBech32('cosmos', new Uint8Array(20).fill(9));
const AT = '2026-10-19T08:00:00.000Z';
export const WALLETS = [
  {id: 'w-evm', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT, via: 'extension'},
  {id: 'w-sol', kind: 'solana', wallet: 'solana:phantom', label: 'Phantom', address: SOL, addedAt: AT, via: 'extension'},
  {id: 'w-zig', kind: 'cosmos', wallet: 'leap', label: 'Leap', address: ZIG, addedAt: AT},
];
export const RAMP = {version: 1, status: 'ok', source: 'https://api.rampnetwork.com/api/host-api/v3/assets', currency: 'USD', asOf: '2026-10-19T07:50:00.000Z',
  fees: {minFeePercent: 0.99, maxFeePercent: 3.9, minFeeAmount: 2.49, minPurchaseAmount: 6, maxPurchaseAmount: 15000},
  assets: [{code: 'BASE_USDC', enabled: true, minPurchaseAmount: 6, maxPurchaseAmount: 15000, networkFee: 0.01}, {code: 'ETH_USDC', enabled: true, minPurchaseAmount: 6, maxPurchaseAmount: 15000, networkFee: 0.01}, {code: 'SOLANA_USDC', enabled: true, minPurchaseAmount: 6.25, maxPurchaseAmount: 15000, networkFee: 0.01}, {code: 'COSMOS_ATOM', enabled: true, minPurchaseAmount: 6.25, maxPurchaseAmount: 15000, networkFee: 0.01}]};
export async function addMoneyFixtures(page: Page, {wallets = WALLETS, usdcOnBase = () => '0'}: {wallets?: unknown[]; usdcOnBase?: () => string} = {}) {
  const providerHits: string[] = [];
  await page.route(url => url.pathname.startsWith('/api/') && (url.hostname === '127.0.0.1' || url.hostname === 'localhost'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.route('**/api/onramps/ramp-assets?**', route => { const currency = new URL(route.request().url()).searchParams.get('currency'); return route.fulfill({json: {...RAMP, currency}}); });
  await page.context().route(/rampnetwork\.com|banxa(-sandbox)?\.com/, route => { providerHits.push(route.request().url()); return route.abort(); });
  await page.context().route(/^https:\/\/[a-z0-9-]+-rpc\.publicnode\.com\/?$/, async route => {
    const host = new URL(route.request().url()).host, batch = route.request().postDataJSON() as {id: number; method: string}[];
    const w = (n: string) => n.padStart(64, '0');
    const usdc = BigInt(usdcOnBase()).toString(16);
    const answer = host.startsWith('solana') ? [{jsonrpc: '2.0', id: 1, result: {context: {slot: 1}, value: 0}}, {jsonrpc: '2.0', id: 2, result: {context: {slot: 1}, value: [null, null]}}]
      : batch.map(c => ({jsonrpc: '2.0', id: c.id, result: c.method === 'eth_getBalance' ? '0x0' : c.method === 'eth_call' ? `0x${w('20')}${w('1')}${w('20')}${w('1')}${w('40')}${w('20')}${w(host.startsWith('base') ? usdc : '0')}` : '0x10'}));
    await route.fulfill({json: answer, headers: {'access-control-allow-origin': '*'}});
  });
  await page.context().route('https://cosmos-rest.publicnode.com/**', route => route.fulfill({json: {balance: {denom: 'uatom', amount: '0'}}, headers: {'access-control-allow-origin': '*'}}));
  await page.context().route('https://mempool.space/**', route => route.fulfill({status: 404, json: {}}));
  await page.addInitScript(({value}) => { if (!sessionStorage.getItem('fixture-seeded')) { localStorage.setItem('zigoals:linked-wallets:v1', value); sessionStorage.setItem('fixture-seeded', '1'); } }, {value: JSON.stringify({version: 1, wallets})});
  return providerHits;
}
export async function ready(page: Page, path: string) {
  await page.goto(path);
  const {expect} = await import('@playwright/test');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
}
