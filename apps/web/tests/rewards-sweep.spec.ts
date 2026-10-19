import {expect, test, type Page} from '@playwright/test';
import {emptyPlatform, privateGoalSchema} from '../lib/positions';
import {ME, SIGNER_CALLS, V1, ZIG, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H60; R5 rank 4): "Put your rewards to work" — one MsgDelegate of the rewards
 * waiting with a validator, to that validator, through the review screen (delegating pays the rewards out first, so the
 * liquid balance needs only the fee). Practice first; the real network under the first-real confirm. A Goal Vault's one
 * action opens it. Keplr double, recorded RPC fixtures, fixture relay: nothing reaches a real wallet or node.
 */
async function connect(page: Page, network: 'PRACTICE' | 'REAL' = 'PRACTICE') {
  const panel = page.getByRole('region', {name: 'Stake, unstake and claim'});
  await panel.getByRole('button', {name: `Connect Keplr for ${network}`, exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  return panel;
}

test('practice: restake one validator\'s rewards in one message; the balance needs only the fee; one signature', async ({page}) => {
  const calls = await fakeKeplr(page);
  // 0.001 ZIG liquid: enough for the fee (about 0.00061 ZIG), far from the 1.5 ZIG restaked — the rewards pay for it.
  const chain = await fakeChain(page, 'practice', {liquid: ZIG(0.001)});
  await relay(page, 'practice', () => ({liquid: ZIG(0.001)}));
  await openStaking(page);
  const panel = await connect(page);
  const sweep = panel.getByRole('region', {name: 'Put your rewards to work'});
  // Only validators the person stakes with (Fictional Beta has rewards but no stake left): nothing preselected.
  await expect(sweep.getByRole('listitem')).toHaveCount(1);
  await expect(sweep).toContainText('Fictional Alpha · about 1.5 ZIG waiting');
  const mark = calls.length;
  await sweep.getByRole('button', {name: 'Restake 1.5 ZIG'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('ActionPut rewards to work (restake)');
  await expect(sheet).toContainText('Fictional Alpha');
  await expect(sheet).toContainText('1.5 ZIG');
  await expect(sheet).toContainText('(1500000000000000000 azig)');
  await expect(sheet).toContainText('One message: staking more with this validator first pays out the rewards waiting with it to your wallet (the chain does this by itself), then stakes this amount');
  await expect(sheet).toContainText('Your address, the validator and the amount are recorded on ZIGChain Testnet for anyone to see, forever.');
  await sheet.getByText('Raw message', {exact: true}).click();
  await expect(sheet.locator('pre')).toContainText('"typeUrl": "/cosmos.staking.v1beta1.MsgDelegate"');
  await expect(sheet.locator('pre')).toContainText(`"validatorAddress": "${V1}"`);
  await expect(sheet.locator('pre')).toContainText('"amount": "1500000000000000000"');
  expect(calls.slice(mark).filter(c => SIGNER_CALLS.test(c)), 'no signer before the Sign press').toEqual([]);
  const before = calls.length;
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.slice(before).filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(chain.broadcasts).toHaveLength(1);
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-journal:v1') ?? 'null') as {entries: {action: string; state: string; validator: string; amount: string}[]});
  expect(journal.entries.map(e => [e.action, e.state, e.validator, e.amount])).toEqual([['sweep', 'CONFIRMED', V1, ZIG(1.5)]]);
  // The same 1.5 ZIG as a plain stake is refused before any review: the balance cannot cover it.
  await page.getByRole('region', {name: 'Confirmed on the network.'}).getByRole('button', {name: 'Done', exact: true}).click();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).first().check();
  await panel.getByLabel('Amount of ZIG').fill('1.5');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  await expect(panel.getByRole('alert')).toContainText('Keep enough ZIG for this and its network fee.');
});

test('the real network: restaking asks the first-real confirm first, and the review says REAL', async ({page}) => {
  const calls = await fakeKeplr(page); await fakeChain(page, 'real');
  await relay(page, 'real');
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  const confirm = page.getByRole('dialog', {name: 'This is real money'});
  await expect(confirm).toBeVisible();
  await confirm.getByLabel('I understand').check();
  await confirm.getByRole('button', {name: 'Continue on the real network'}).click();
  await connect(page, 'REAL');
  await panel.getByRole('region', {name: 'Put your rewards to work'}).getByRole('button', {name: 'Restake 1.5 ZIG'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('REAL · zigchain-1 · real ZIG');
  await expect(sheet).toContainText('ActionPut rewards to work (restake)');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('a Goal Vault\'s one action opens the restake on Staking, which says where its rewards live', async ({page}) => {
  const E18 = 10n ** 18n, AT = '2026-10-19T08:00:00.000Z';
  const goal = privateGoalSchema.parse({id: '92', name: 'Fictional garden', type: 'QUANTITY', status: 'active', asset: 'ZIG', denom: 'azig', decimals: 18, target: (1000n * E18).toString(), notes: '', createdAt: AT, milestones: []});
  const position = (id: string, sourceType: string, quantity: string) => ({id, providerId: 'native-zig', sourceType, network: 'zigchain-1', account: ME, asset: 'ZIG', denom: 'azig', decimals: 18, quantity, liquidity: sourceType === 'NATIVE_STAKING' ? 'BONDED' : 'LIQUID', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), provenance: 'Fictional relay fixture'});
  await page.route(url => url.pathname.startsWith('/api/') && url.hostname === '127.0.0.1', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.route('**/api/positions?**', route => route.fulfill({json: {positions: [position('s1', 'NATIVE_STAKING', (400n * E18).toString()), position('r1', 'NATIVE_REWARDS', (2n * E18).toString())]}}));
  await page.addInitScript(({platform, wallets, vaults}) => {
    if (sessionStorage.getItem('fixture-seeded')) return;
    localStorage.setItem('zigoals:platform:v1', platform); localStorage.setItem('zigoals:linked-wallets:v1', wallets); localStorage.setItem('zigoals:goal-vaults:v1', vaults);
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    sessionStorage.setItem('fixture-seeded', '1');
  }, {platform: JSON.stringify({...emptyPlatform(), goals: [goal]}), wallets: JSON.stringify({version: 1, wallets: [{id: 'w-fic', kind: 'cosmos', wallet: 'leap', label: 'Fictional', address: ME, addedAt: AT}]}),
    vaults: JSON.stringify({version: 1, links: [{id: 'l1', goalId: '92', walletId: 'w-fic', parts: ['delegations'], linkedAt: AT, baseline: {stakedAzig: (400n * E18).toString(), rewardsAzig: '0', stzigUnits: '0'}}]})});
  await page.goto('/app/goals/tracked/92');
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  const vaultModule = page.locator('details#goal-vault');
  await expect(async () => { if (!await vaultModule.evaluate(d => (d as HTMLDetailsElement).open)) await vaultModule.locator('summary').click(); await expect(vaultModule.locator('[data-vault]')).toContainText('Rewards waiting2 ZIG', {timeout: 3000}); }).toPass({timeout: 20000});
  const action = vaultModule.getByRole('link', {name: 'Put your rewards to work →'});
  await expect(action).toHaveAttribute('href', '/app/staking#rewards-sweep');
  await action.click();
  await expect(page).toHaveURL(/\/app\/staking#rewards-sweep$/);
  await expect(page.getByRole('region', {name: 'Stake, unstake and claim'})).toContainText('From your Goal Vault: connect Keplr to restake its rewards. Goal Vaults count your stake on the real network.');
});
