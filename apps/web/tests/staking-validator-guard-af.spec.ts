import {expect, test, type Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {ME, SIGNER_CALLS, V1, ZIG, fakeChain, fakeKeplr, openStaking, relay, validatorsWire} from './staking-chain';
import {STAKING_PREFILL_KEY, STAKING_PREFS_KEY} from '../lib/af-signing-keys';

/**
 * Session AF Gate C, the security review's fix round (ADR-028 H133; `TIER 3 (wallet/signing)`):
 * - S1: only an active validator (bonded, not jailed — what the picker offers) can be staked with or moved to. A validator
 *   remembered from before, pre-filled by ZIGi or carried over from another tab that is not active is unchosen, the person
 *   is told, and Review refuses it; the review shows each validator's status and commission.
 * - S2: a ZIGi pre-fill never switches the network by itself; the form stays and offers the switch.
 * No signer is asked for in any of it.
 */
const JAILED = toBech32('zigvaloper', new Uint8Array(20).fill(7));
async function withJailed(page: Page) {
  const wire = validatorsWire('practice');
  wire.validators.push({...wire.validators[0]!, operator: JAILED, moniker: 'Fictional Jailed', jailed: true, status: 'unbonded', votingPowerShare: '0'});
  await page.route('**/api/chain/validators?**', route => route.fulfill({json: wire}));
}
async function connect(page: Page) {
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  return panel;
}

test('S1: a remembered validator that is jailed now is not chosen, the person is told, and Review cannot be pressed', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice', () => ({liquid: ZIG(500)}));
  await withJailed(page);
  await page.addInitScript(([key, jailed]) => { localStorage.setItem(key!, JSON.stringify({version: 1, lastValidator: {'zig-test-2': jailed}})); }, [STAKING_PREFS_KEY, JAILED] as const);
  const panel = await connect(page);
  await expect(panel.getByText('The validator chosen before is not active right now (jailed or outside the active set), so it earns nothing and is not chosen. Choose one from the list.')).toBeVisible();
  // Not offered, not chosen.
  await expect(panel.getByRole('radio', {name: /Fictional Jailed/})).toHaveCount(0);
  expect(await panel.getByRole('radio', {checked: true}).count()).toBe(0);
  await panel.getByLabel('Amount of ZIG').fill('10');
  // Nothing is chosen, so Review cannot be pressed at all.
  await expect(panel.getByRole('button', {name: 'Review', exact: true})).toBeDisabled();
  await expect(page.getByRole('dialog', {name: 'Review before you sign'})).toHaveCount(0);
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('S1: a ZIGi pre-fill naming a jailed validator is not chosen; an active one is reviewed with its status and commission', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice', () => ({liquid: ZIG(500)}));
  await withJailed(page);
  await page.addInitScript(([key, jailed]) => { sessionStorage.setItem(key!, JSON.stringify({version: 1, at: new Date().toISOString(), network: 'practice', action: 'delegate', validator: jailed, amount: '10'})); }, [STAKING_PREFILL_KEY, JAILED] as const);
  const panel = await connect(page);
  await expect(panel.getByText(/The validator chosen before is not active right now/)).toBeVisible();
  expect(await panel.getByRole('radio', {checked: true}).count()).toBe(0);
  await expect(panel.getByLabel('Amount of ZIG')).toHaveValue('10');
  // The person chooses an active one: the review names its status and commission.
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(`Fictional Alpha · ${V1.slice(0, 10)}`);
  await expect(sheet).toContainText('active · commission 5');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('S1: a validator chosen on another tab is not carried into Stake', async ({page}) => {
  await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice', () => ({liquid: ZIG(500), staked: {[V1]: ZIG(40)}}));
  const panel = await connect(page);
  await panel.getByRole('tab', {name: 'Unstake', exact: true}).click();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByRole('tab', {name: 'Stake', exact: true}).click();
  expect(await panel.getByRole('radio', {checked: true}).count()).toBe(0);
});

test('S2: a pre-fill for the real network leaves the form on practice and offers the switch, which still asks to confirm the first time', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice');
  await page.addInitScript(key => { sessionStorage.setItem(key, JSON.stringify({version: 1, at: new Date().toISOString(), network: 'real', action: 'delegate', amount: '50'})); }, STAKING_PREFILL_KEY);
  const panel = await openStaking(page);
  await expect(panel.getByRole('button', {name: /Practice network \(no real value\)/})).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByText('ZIGi filled this in for the real network; this form is on the practice network. Switch networks to use it; nothing is signed until you review and sign.')).toBeVisible();
  await panel.getByRole('button', {name: 'Switch to the real network', exact: true}).click();
  // The real network's first-time confirm, as for any switch.
  await expect(page.getByRole('dialog').filter({hasText: /real network/i}).first()).toBeVisible();
  await expect(panel.getByRole('button', {name: /Practice network \(no real value\)/})).toHaveAttribute('aria-pressed', 'true');
  expect(calls).toEqual([]);
});
