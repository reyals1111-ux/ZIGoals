import {expect, test, type Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {emptyPlatform, privateGoalSchema} from '../lib/positions';

/**
 * Session AF (L2b, Part 6, ADR-028 H8, H11, H17, H44; P6.2–P6.4): Goal Vaults inside a Goal's detail. A fictional linked
 * ZIGChain wallet and a fictional ZIG Goal; the read-only relay /api/positions, Valdora's two-source rate and the chain's
 * rate answered here; nothing signs, sends or reaches a chain host from the browser.
 */
const ZIG1 = toBech32('zig', new Uint8Array(20).fill(9)), STZIG = 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig';
const E18 = 10n ** 18n, AT = '2026-10-19T08:00:00.000Z';
const goal = privateGoalSchema.parse({id: '91', name: 'Garden studio', type: 'QUANTITY', status: 'active', asset: 'ZIG', denom: 'azig', decimals: 18, target: (1000n * E18).toString(), notes: '', createdAt: AT, milestones: []});
const position = (id: string, sourceType: string, quantity: string, extra: Record<string, unknown> = {}) => ({id, providerId: 'native-zig', sourceType, network: 'zigchain-1', account: ZIG1, asset: 'ZIG', denom: 'azig', decimals: 18, quantity, liquidity: sourceType === 'NATIVE_STAKING' ? 'BONDED' : 'LIQUID', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), provenance: 'Fictional relay fixture', ...extra});
async function setup(page: Page, {rate = 'ok' as 'ok' | 'disagree'} = {}) {
  const stake = {staked: 400n * E18, rewards: 2n * E18};
  const asked: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1' || u.pathname.startsWith('/api/')) asked.push(`${r.method()} ${u.hostname === '127.0.0.1' ? u.pathname : u.origin}`); });
  await page.route(url => url.pathname.startsWith('/api/') && url.hostname === '127.0.0.1', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.route('**/api/positions?**', route => route.fulfill({json: {positions: [
    position('s1', 'NATIVE_STAKING', stake.staked.toString()), position('r1', 'NATIVE_REWARDS', stake.rewards.toString()),
    position('st', 'LIQUID_STAKING', '100000000', {asset: 'stZIG', denom: STZIG, decimals: 6}),
  ]}}));
  const env = (data: unknown) => ({version: 1, status: 'ok', source: {name: 'ZIGChain', origin: 'https://api.zigchain.com'}, height: '13046000', fetchedAt: new Date().toISOString(), stale: false, data});
  await page.route('**/api/earn/valdora', route => route.fulfill({json: env({rate: rate === 'ok' ? {status: 'ok', zigPerStZig: '1.0728', dexZigPerStZig: '1.0666', difference: '0.0058', basis: 'reverse_st_zig_price'} : {status: 'unavailable', reason: 'SOURCES_DISAGREE'}})}));
  await page.route('**/api/earn/chain?**', route => route.fulfill({json: env({apr: {beforeCommission: '0.0533'}})}));
  await page.addInitScript(({platform, wallets}) => {
    if (sessionStorage.getItem('fixture-seeded')) return;
    localStorage.setItem('zigoals:platform:v1', platform); localStorage.setItem('zigoals:linked-wallets:v1', wallets);
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    sessionStorage.setItem('fixture-seeded', '1');
  }, {platform: JSON.stringify({...emptyPlatform(), goals: [goal]}), wallets: JSON.stringify({version: 1, wallets: [{id: 'w-leap', kind: 'cosmos', wallet: 'leap', label: 'Leap', address: ZIG1, addedAt: AT}]})});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/app/goals/tracked/91');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  return {stake, asked};
}
const openVault = async (page: Page) => {
  const vaultModule = page.locator("details#goal-vault");
  await expect(async () => { if (!await vaultModule.evaluate(d => (d as HTMLDetailsElement).open)) await vaultModule.locator("summary").click(); await expect(vaultModule.locator("[data-goal-vault]")).toBeVisible({timeout: 2000}); }).toPass({timeout: 20000});
  return vaultModule;
};

test('link a real stake to a Goal: read-only, the figures, the change since linking, the illustration, unlink', async ({page}) => {
  const {stake, asked} = await setup(page);
  // Closed, nothing is read.
  await expect(page.locator('details#goal-vault')).not.toHaveAttribute('open', '');
  expect(asked.filter(a => a.includes('/api/positions'))).toEqual([]);
  const vault = await openVault(page);
  await expect(vault).toContainText('Your money is working toward this goal: the ZIG you staked keeps earning on ZIGChain, and it never leaves your wallet.');
  await expect(vault).toContainText('Link your stake to this goal.');
  const form = vault.getByRole('form', {name: 'Link your stake to this goal'});
  await form.getByRole('button', {name: 'Read the stake'}).click();
  await expect(form.getByRole('status')).toContainText('400 ZIG staked · 2 ZIG rewards waiting · 100 stZIG');
  await form.getByRole('button', {name: 'Link this stake to the Goal'}).click();
  const card = vault.locator('[data-vault]');
  await expect(card).toContainText('Leap’s stake');
  await expect(card).toContainText('Staked now400 ZIG');
  await expect(card).toContainText('Rewards waiting2 ZIG');
  await expect(card).toContainText('100 stZIG ≈ 107.28 ZIG');
  await expect(card).toContainText('509.28 ZIG · 50.92 % of the Goal');
  await expect(card).toContainText('Rewards you claimed and moved out since linking are not counted back');
  await expect(card).toContainText('stZIG at 1.0728 ZIG each (Valdora’s rate, matching OroSwap’s pool within 2 %');
  // The stake grows on chain: read again, the change since linking shows it.
  stake.staked = 410n * E18; stake.rewards = 3n * E18;
  await page.unroute('**/api/positions?**');
  await page.route('**/api/positions?**', route => route.fulfill({json: {positions: [position('s1', 'NATIVE_STAKING', stake.staked.toString()), position('r1', 'NATIVE_REWARDS', stake.rewards.toString()), position('st', 'LIQUID_STAKING', '100000000', {asset: 'stZIG', denom: STZIG, decimals: 6})]}}));
  await card.getByRole('button', {name: '↻ Read again'}).click();
  await expect(card).toContainText('Staked now410 ZIG');
  await expect(card).toContainText(/Since you linked on .*\+11\sZIG/);
  // The projection: labelled, from the chain's rate with its block, or the person's own assumption.
  const ill = card.getByRole('group', {name: 'Illustration, not a promise'});
  await expect(ill).toContainText('5.33 % a year (the chain’s rate before a validator’s commission, ZIGoals’ read of ZIGChain at block 13046000)');
  await expect(ill).toContainText(/reach the Goal in about \d+ months\. Rates change; this is not a promise\./);
  await ill.getByLabel('Your own yearly rate assumption (%)').fill('10');
  await expect(ill).toContainText('10.00 % a year (your assumption)');
  // Stored on this device only; nothing was signed or sent: only the relay and ZIGoals' own Earn reads.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:goal-vaults:v1')!));
  expect(stored.links).toEqual([expect.objectContaining({goalId: '91', walletId: 'w-leap', parts: ['delegations', 'stzig'], baseline: expect.objectContaining({stakedAzig: (400n * E18).toString(), rewardsAzig: (2n * E18).toString(), stzigUnits: '100000000', zigPerStZig: '1.0728'})})]);
  // Only the relay, ZIGoals' own Earn reads and the Goal page's own market reads: nothing signs, sends or reaches a chain host.
  expect(asked.filter(a => !/^GET \/api\/(positions|earn\/valdora|earn\/chain|market-quotes|market-insights|market-assets)/.test(a) && !a.startsWith('POST /api/market'))).toEqual([]);
  expect(asked.some(a => /rpc\.zigchain\.com|api\.zigchain\.com/.test(a))).toBe(false);
  await card.getByRole('button', {name: 'Unlink this stake'}).click();
  await expect(vault.getByRole('status').last()).toHaveText('The link is removed. Your stake is unchanged.');
  await expect(vault.locator('[data-vault]')).toHaveCount(0);
});

test('when Valdora\'s rate and OroSwap\'s pool disagree, stZIG counts in units with "value unavailable"', async ({page}) => {
  await setup(page, {rate: 'disagree'});
  const vault = await openVault(page);
  const form = vault.getByRole('form', {name: 'Link your stake to this goal'});
  await form.getByRole('button', {name: 'Read the stake'}).click();
  await expect(form.getByRole('status')).toContainText('400 ZIG staked');
  await form.getByRole('button', {name: 'Link this stake to the Goal'}).click();
  const card = vault.locator('[data-vault]');
  await expect(card).toContainText('100 stZIG · value unavailable (Valdora’s rate and OroSwap’s pool disagree by more than 2 %)');
  await expect(card).toContainText('402 ZIG (stZIG not counted) · 40.20 % of the Goal');
});
