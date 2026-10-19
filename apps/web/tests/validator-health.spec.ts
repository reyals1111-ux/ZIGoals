import {expect, test, type Page} from '@playwright/test';
import {ME, SIGNER_CALLS, V1, V2, ZIG, fakeChain, fakeKeplr, openStaking, relay, validatorsWire} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 P6.7, R5 rank 3): the health of the validators the person delegates to, on the
 * Staking page only — jailed, tombstoned, inactive, missing blocks (the chain's window), and a commission change since this
 * device last looked (a baseline in zigoals:validator-alerts:v1). In the app only: nothing is sent, nothing is signed.
 * Validators answered by a fixture (tests/staking-chain.ts's wire, changed per test); no real node.
 */
type Wire = ReturnType<typeof validatorsWire>;
async function setup(page: Page, change: (wire: Wire) => Wire) {
  const calls = await fakeKeplr(page); await fakeChain(page, 'practice');
  await relay(page, 'practice', () => ({staked: {[V1]: ZIG(50), [V2]: ZIG(10)}}));
  let wire = change(validatorsWire('practice'));
  await page.route('**/api/chain/validators?**', route => route.fulfill({json: wire}));
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  return {calls, panel, set: (next: (w: Wire) => Wire) => { wire = next(validatorsWire('practice')); }};
}
const at = (operator: string, w: Wire, over: Record<string, unknown>) => ({...w, validators: w.validators.map(v => v.operator === operator ? {...v, ...over} : v)});

test('jailed and missing blocks in plain words; a recent commission change said once; baselines kept on this device', async ({page}) => {
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const {calls, panel} = await setup(page, w => at(V2, at(V1, w, {jailed: true}), {uptime: {window: 35000, missed: 4000, signedShare: '0.885714285714285714'}, commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: twoDaysAgo}}));
  const health = panel.getByRole('region', {name: 'Your validators’ health'});
  await expect(health).toBeVisible();
  const alpha = health.locator('.staking-health-item').filter({hasText: 'Fictional Alpha'});
  await expect(alpha).toContainText('Needs a look');
  await expect(alpha).toContainText('Jailed: it stopped signing blocks and earns nothing for you while jailed. Your stake is not lost; you can move it to another validator at once.');
  await expect(alpha).toHaveClass(/is-high/);
  const beta = health.locator('.staking-health-item').filter({hasText: 'Fictional Beta'});
  await expect(beta).toContainText('Missing blocks: 4,000 of the last 35,000. The chain jails a validator that misses more than 7,000 of them.');
  await expect(beta).toContainText(`Commission set to 5% recently, on ${twoDaysAgo.slice(0, 10)}.`);
  await expect(beta).toContainText('Commission 5% · missed 4,000 of the last 35,000 blocks (the chain jails above 7,000)');
  await expect(health).toContainText('Read from https://testnet-api.zigchain.com at block 8290599');
  await expect(health).toContainText('Shown here only: ZIGoals sends no notifications.');
  // The baselines are this device's, per network and validator, for the two validators the person stakes with.
  await expect.poll(async () => Object.keys((await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:validator-alerts:v1') ?? '{}'))).seen ?? {}).sort()).toEqual([`zig-test-2 ${V1}`, `zig-test-2 ${V2}`].sort());
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('a commission change since the last look is said with both rates; "Got it" clears it; a healthy validator says Healthy', async ({page}) => {
  const {panel, set} = await setup(page, w => w);
  const health = panel.getByRole('region', {name: 'Your validators’ health'});
  await expect(health.locator('.staking-health-item').filter({hasText: 'Fictional Alpha'})).toContainText('Healthy');
  await expect.poll(async () => Object.keys((await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:validator-alerts:v1') ?? '{}'))).seen ?? {})).toHaveLength(2);
  // The chain now answers a raised commission for Fictional Alpha; the page reads it again.
  set(w => at(V1, w, {commission: {rate: '0.1', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-10-18T09:00:00.000Z'}}));
  await page.reload();
  const panel2 = page.getByRole('region', {name: 'Stake, unstake and claim'});
  const alpha = panel2.getByRole('region', {name: 'Your validators’ health'}).locator('.staking-health-item').filter({hasText: 'Fictional Alpha'});
  await expect(alpha).toContainText(/Commission changed from 5% to 10% on 2026-10-18, since this device last looked on \d{4}-\d{2}-\d{2}\. It may change at most once a day, by at most 1%, and never above 20%\./);
  await alpha.getByRole('button', {name: 'Got it'}).click();
  await expect(alpha).toContainText('Healthy');
  const seen = await page.evaluate(v => JSON.parse(localStorage.getItem('zigoals:validator-alerts:v1')!).seen[`zig-test-2 ${v}`], V1);
  expect(seen).toMatchObject({rate: '0.1', updatedAt: '2026-10-18T09:00:00.000Z'});
});

test('alerts switched off on this device: the panel says so, no alert and no baseline', async ({page}) => {
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:validator-alerts:v1')) localStorage.setItem('zigoals:validator-alerts:v1', JSON.stringify({version: 1, off: true})); });
  const {panel} = await setup(page, w => at(V1, w, {jailed: true}));
  const health = panel.getByRole('region', {name: 'Your validators’ health'});
  await expect(health).toContainText('Validator alerts are off on this device. Turn them on again in Settings.');
  await expect(health).not.toContainText('Jailed');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:validator-alerts:v1')!))).toEqual({version: 1, off: true});
});
