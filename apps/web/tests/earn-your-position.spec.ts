import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1c, ledger P1.23; ADR-028 H11, H16): with a linked ZIGChain wallet, native staking shows the person's own
 * stake and rewards waiting and Valdora the stZIG held, each with the relay's block and "as of" — from the one read the
 * page already makes for the summary (ZIGoals' relay /api/positions, answered here from a fixture): nothing new is asked
 * by address. Without a wallet nothing shows; while the relay refuses, its own sentence does.
 */
const address = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx', STZIG = 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig';
const base = {network: 'zigchain-1', account: address, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-18T20:00:00.000Z', provenance: 'https://api.zigchain.com · block 13044950', notes: '', risk: '', executionAuthority: 'NONE', providerId: 'native-zig'};
const positions = [
  {...base, id: `zigchain-1:${address}:stake:a`, sourceType: 'NATIVE_STAKING', quantity: '120000000000000000000', principal: '120000000000000000000', liquidity: 'BONDED'},
  {...base, id: `zigchain-1:${address}:reward:a`, sourceType: 'NATIVE_REWARDS', quantity: '1500000000000000000', unclaimedRewards: '1500000000000000000', liquidity: 'LOCKED'},
  {...base, id: `zigchain-1:${address}:stzig`, sourceType: 'LIQUID_STAKING', asset: 'stZIG', denom: STZIG, decimals: 6, quantity: '100000000', liquidity: 'LIQUID'},
];
test.beforeEach(async ({page}) => { await seedShowcase(page); });

test('a linked wallet: its stake, its rewards waiting and its stZIG in their sections, from the page’s one relay read', async ({page}) => {
  await page.evaluate(a => localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address: a, addedAt: '2026-10-18T08:00:00.000Z'}]})), address);
  await earnRoutes(page);
  const asked: string[] = [];
  await page.route(url => url.pathname === '/api/positions', route => { asked.push(route.request().url()); return route.fulfill({json: {positions}}); });
  await page.goto('/app/earn');
  const native = page.locator('#native-staking [data-mine="native"]');
  await expect(native.locator('[data-live-figure="native-mine"]')).toHaveAttribute('data-state', 'ok');
  await expect(native).toContainText('My Keplr');
  await expect(native).toContainText('Your stake120 ZIG');
  await expect(native).toContainText('Rewards waiting to be claimed1.5 ZIG');
  await expect(native.locator('.earn-source')).toContainText(/ZIGoals’ read-only relay · block 13044950 · as of /);
  const valdora = page.locator('#valdora [data-mine="valdora"]');
  await expect(valdora.locator('[data-live-figure="valdora-mine"]')).toHaveAttribute('data-state', 'ok');
  await expect(valdora).toContainText('Your stZIG100 stZIG');
  await expect(valdora.locator('.earn-source')).toContainText(/block 13044950 · as of /);
  // One read for the wallet, shared with the summary and the Start-here path: the sections ask nothing of their own.
  await expect(page.locator('#summary [data-live-figure="summary"]')).toHaveAttribute('data-state', 'ok');
  expect(asked).toHaveLength(1);
  expect(new URL(asked[0]!).searchParams.get('address')).toBe(address);
  // Read-only: nothing here offers to sign or send.
  for (const scope of [native, valdora]) await expect(scope.getByRole('button')).toHaveCount(0);
});

test('without a wallet nothing shows; while the relay refuses mainnet, its own sentence is said', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('[data-mine]')).toHaveCount(0);
  await page.evaluate(a => localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address: a, addedAt: '2026-10-18T08:00:00.000Z'}]})), address);
  const refused = 'Mainnet addresses are not read on the public Alpha. Add your mainnet ZIG as a manual asset instead; snapshots you saved before stay.';
  await page.route(url => url.pathname === '/api/positions', route => route.fulfill({status: 403, json: {error: refused, code: 'MAINNET_NOT_ON_PUBLIC_ALPHA'}}));
  await page.reload();
  for (const kind of ['native', 'valdora']) {
    const mine = page.locator(`[data-mine="${kind}"] [data-live-figure="${kind}-mine"]`);
    await expect(mine, kind).toHaveAttribute('data-state', 'unavailable');
    await expect(mine, kind).toContainText(refused);
  }
});
