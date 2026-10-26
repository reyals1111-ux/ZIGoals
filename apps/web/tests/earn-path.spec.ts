import {expect, test} from '@playwright/test';
import {verifiedLink} from '../../../packages/ecosystem-registry/src/verified-links';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF chunk 2 (P1.7–P1.11): the Start-here path on the shared path engine. Six dots in three orbits, each opening
 * its guide under it with its links (verified outgoing links; Staking, Add money and Governance by their app paths); a
 * step ZIGoals cannot see can be marked done on this device and taken back; what it can see — a linked wallet, a confirmed
 * practice stake in the staking journal, real stake read through the relay — is ticked by itself, with no mark offered.
 */
const STEPS = ['Get a wallet', 'Practice first', 'Add money', 'Get ZIG', 'Your first real stake', 'Explore more'];
const dot = (page: import('@playwright/test').Page, label: string) => page.locator(`#start-here .path-dot[aria-label^="${label}:"]`);
test.beforeEach(async ({page}) => { await seedShowcase(page); });

test('six steps, each opening its guide with the right links; mark as done is kept on this device and can be taken back', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn#start-here');
  const section = page.locator('#start-here');
  await expect(section.getByRole('heading', {level: 2, name: 'How staking works, step by step'})).toBeVisible();
  const stage = section.getByRole('group', {name: 'Start here: how staking works, step by step'});
  await expect(stage).toBeVisible();
  await expect(stage.locator('button.path-dot')).toHaveCount(6);
  expect(await stage.locator('button.path-dot').evaluateAll(els => els.map(e => e.getAttribute('aria-label')!.split(':')[0]))).toEqual(STEPS);
  await expect(section.locator('.earn-start-progress')).toContainText('0 of 6 steps done');
  // Each dot opens its own guide.
  const panel = (id: string) => section.locator(`[data-start-panel="${id}"]`);
  await dot(page, 'Get a wallet').click();
  await expect(panel('get-wallet')).toContainText('recovery phrase');
  await expect(panel('get-wallet').getByRole('link', {name: /Get Keplr/})).toHaveAttribute('href', verifiedLink('zig-finance', 'keplr-get').url);
  await dot(page, 'Practice first').click();
  await expect(panel('get-wallet')).toHaveCount(0);
  await expect(panel('practice').getByRole('link', {name: /ZIGChain faucet/})).toHaveAttribute('href', verifiedLink('zig-finance', 'faucet').url);
  await expect(panel('practice').getByRole('link', {name: 'Practise on Staking'})).toHaveAttribute('href', '/app/staking');
  await dot(page, 'Add money').click();
  await expect(panel('add-money').getByRole('link', {name: 'Add money', exact: true}).last()).toHaveAttribute('href', '/app/wealth/add-money');
  await dot(page, 'Get ZIG').click();
  await expect(panel('get-zig').locator('[data-route]')).toHaveCount(3);
  await expect(panel('get-zig')).toContainText('fees in ZIG only');
  await expect(panel('get-zig')).toContainText(/OroSwap’s fee on that pool, read live: 0\.01\s% a swap/);
  await expect(panel('get-zig').getByRole('link', {name: /Open Skip Go/})).toHaveAttribute('href', verifiedLink('zig-finance', 'skip-go').url);
  await dot(page, 'Your first real stake').click();
  await expect(panel('first-stake').getByRole('link', {name: 'Stake on Staking'})).toHaveAttribute('href', '/app/staking');
  await expect(panel('first-stake')).toContainText('21 days');
  await dot(page, 'Explore more').click();
  for (const [name, href] of [['Liquid staking (stZIG)', '#valdora'], ['Liquidity pools', '#oroswap'], ['Governance', '#governance'], ['Open Governance', '/app/governance']] as const) await expect(panel('explore').getByRole('link', {name, exact: true})).toHaveAttribute('href', href);
  // Mark as done: the dot lights, the count moves, the record keeps it across a reload; "Not done yet" takes it back.
  await dot(page, 'Explore more').click();
  await dot(page, 'Add money').click();
  await panel('add-money').getByRole('button', {name: 'Mark as done'}).click();
  await expect(dot(page, 'Add money')).toHaveAttribute('aria-pressed', 'true');
  await expect(section.locator('.earn-start-progress')).toContainText('1 of 6 steps done');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:earn-path:v1')))!)).toMatchObject({version: 1, steps: {'add-money': {done: true}}});
  await page.reload();
  await expect(dot(page, 'Add money')).toHaveAttribute('aria-pressed', 'true');
  await dot(page, 'Add money').click();
  await expect(panel('add-money')).toContainText('Marked done.');
  await panel('add-money').getByRole('button', {name: 'Not done yet'}).click();
  await expect(dot(page, 'Add money')).toHaveAttribute('aria-pressed', 'false');
  await expect(section.locator('.earn-start-progress')).toContainText('0 of 6 steps done');
});

test('what ZIGoals can see ticks itself: a linked wallet, a confirmed practice stake, real stake read through the relay', async ({page}) => {
  const address = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx', practice = 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr';
  await page.evaluate(({address, practice}) => {
    localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address, addedAt: '2026-10-18T08:00:00.000Z'}]}));
    localStorage.setItem('zigoals:staking-journal:v1', JSON.stringify({version: 1, entries: [{operationId: '00000000-0000-4000-8000-000000000001', chainId: 'zig-test-2', wallet: practice, action: 'delegate', validator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', amount: '25000000000000000000', state: 'CONFIRMED', hash: 'AB'.repeat(32), height: '8290600', code: 0, at: '2026-10-18T21:00:00.000Z'}]}));
  }, {address, practice});
  await earnRoutes(page);
  const minHeights: (string | null)[] = [];
  const base = {network: 'zigchain-1', account: address, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'https://api.zigchain.com · block 13048320', notes: '', risk: '', executionAuthority: 'NONE', providerId: 'native-zig'};
  await page.route(url => url.pathname === '/api/positions', route => { const u = new URL(route.request().url()); minHeights.push(u.searchParams.get('minHeight')); return route.fulfill({json: {positions: [
    {...base, id: `zigchain-1:${address}:liquid`, sourceType: 'WALLET_LIQUID', quantity: '5000000000000000000', liquidity: 'LIQUID'},
    {...base, id: `zigchain-1:${address}:stake:a`, sourceType: 'NATIVE_STAKING', quantity: '120000000000000000000', principal: '120000000000000000000', liquidity: 'BONDED'},
  ]}}); });
  await page.goto('/app/earn#start-here');
  const section = page.locator('#start-here');
  for (const step of ['Get a wallet', 'Practice first', 'Add money', 'Get ZIG', 'Your first real stake']) await expect(dot(page, step), step).toHaveAttribute('aria-pressed', 'true');
  await expect(dot(page, 'Explore more')).toHaveAttribute('aria-pressed', 'false');
  await expect(section.locator('.earn-start-progress')).toContainText('5 of 6 steps done');
  await dot(page, 'Practice first').click();
  const practicePanel = section.locator('[data-start-panel="practice"]');
  await expect(practicePanel).toContainText('Seen: a practice stake you signed on this device was confirmed.');
  await expect(practicePanel.getByRole('button', {name: 'Mark as done'})).toHaveCount(0);
  // The linked wallet is read on the real network, with no minHeight (nothing was signed with it on this device).
  expect(minHeights.length).toBeGreaterThan(0);
  expect(minHeights.every(h => h === null)).toBe(true);
});
