import {expect, test, type Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {ME, SIGNER_CALLS, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16 (a), H45, H46): "Permissions you have given" on Staking — the authz grants and
 * fee allowances the connected address gave, read-only through ZIGoals' relay (/api/chain/grants), in plain words; a
 * grant revoked (MsgRevoke) through the review screen by a direct signer only; a Ledger is told why it cannot; nothing is
 * ever granted. The grants answer is a fixture in the chain's own shapes (recorded 2026-10-19, values fictional).
 */
const GRANTEE = toBech32('zig', new Uint8Array(20).fill(7)), BOT = toBech32('zig', new Uint8Array(20).fill(6));
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
function grantsWire(network = 'zig-test-2', over: {grants?: unknown[]; allowances?: unknown[]} = {}) {
  return {version: 1, status: 'ok', network, source: network === 'zigchain-1' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com', height: '8290600', observedAt: '2026-10-19T00:16:00.000Z',
    grants: over.grants ?? [
      {grantee: GRANTEE, kind: 'generic', authorization: '/cosmos.authz.v1beta1.GenericAuthorization', msgTypeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', limit: null, validators: null, expiration: null},
      {grantee: BOT, kind: 'stake', authorization: '/cosmos.staking.v1beta1.StakeAuthorization', msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate', limit: '5000000000000000000', validators: {allow: [], deny: []}, expiration: '2027-01-01T00:00:00.000Z'},
    ],
    allowances: over.allowances ?? [{grantee: BOT, kind: 'basic', allowance: '/cosmos.feegrant.v1beta1.BasicAllowance', limit: '1000000000000000000', expiration: null, allowedMessages: []}]};
}
async function setup(page: Page, options: {ledger?: boolean; answer?: () => unknown} = {}) {
  const calls = await fakeKeplr(page, {ledger: options.ledger}), chain = await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const asked: URL[] = [];
  await page.route('**/api/chain/grants?**', route => { const url = new URL(route.request().url()); asked.push(url); expect(url.searchParams.get('address')).toBe(ME); return route.fulfill({json: options.answer?.() ?? grantsWire(url.searchParams.get('network')!)}); });
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(short(ME), {exact: true})).toBeVisible();
  return {calls, chain, asked, panel, grants: panel.getByRole('region', {name: 'Permissions you have given'})};
}

test('the grants and allowances in plain words; revoke one through the review screen; one signature; read again after', async ({page}) => {
  let revoked = false;
  const {calls, chain, asked, grants} = await setup(page, {answer: () => revoked ? grantsWire('zig-test-2', {grants: [grantsWire().grants[1]]}) : undefined});
  await expect(grants).toContainText(`${short(GRANTEE)} may claim your staking rewards, with no end date.`);
  await expect(grants).toContainText(`${short(BOT)} may stake your ZIG, up to 5 ZIG, until 2027-01-01.`);
  await expect(grants).toContainText(`${short(BOT)} may use your ZIG to pay its own network fees, up to 1 ZIG, with no end date.`);
  await expect(grants).toContainText('Ending a fee allowance is not offered here.');
  await expect(grants).toContainText('ZIGoals never creates either.');
  await expect(grants).toContainText('Read from https://testnet-api.zigchain.com at block 8290600');
  expect(asked.map(u => u.searchParams.toString())).toEqual([`network=zig-test-2&address=${ME}`]);
  await expect(grants.getByRole('list', {name: 'Grants'}).getByRole('button', {name: 'Revoke'})).toHaveCount(2);
  const mark = calls.length;
  await grants.getByRole('list', {name: 'Grants'}).getByRole('listitem').first().getByRole('button', {name: 'Revoke'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('ActionEnd a permission you gave (revoke)');
  await expect(sheet).toContainText(`Who had the permission${GRANTEE}`);
  await expect(sheet).toContainText('What endsThey may no longer claim your staking rewards (/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward). Nothing else changes; no ZIG moves.');
  await expect(sheet).toContainText('Your address, the address that had the permission and the permission you end are recorded on ZIGChain Testnet for anyone to see, forever.');
  await sheet.getByText('Raw message', {exact: true}).click();
  await expect(sheet.locator('pre')).toContainText('"typeUrl": "/cosmos.authz.v1beta1.MsgRevoke"');
  await expect(sheet.locator('pre')).toContainText(`"granter": "${ME}"`);
  await expect(sheet.locator('pre')).toContainText(`"grantee": "${GRANTEE}"`);
  expect(calls.slice(mark).filter(c => SIGNER_CALLS.test(c)), 'no signer before the Sign press').toEqual([]);
  revoked = true;
  const before = calls.length;
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.slice(before).filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(chain.broadcasts).toHaveLength(1);
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-journal:v1') ?? 'null') as {entries: {action: string; state: string; grantee: string; msgTypeUrl: string}[]});
  expect(journal.entries.map(e => [e.action, e.state, e.grantee, e.msgTypeUrl])).toEqual([['revoke', 'CONFIRMED', GRANTEE, '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward']]);
  // The panel reads the permissions again: the revoked one is gone.
  await expect(grants).not.toContainText('may claim your staking rewards');
  expect(asked).toHaveLength(2);
});

test('a Ledger account sees the permissions but no Revoke, and is told why', async ({page}) => {
  const {calls, grants} = await setup(page, {ledger: true});
  await expect(grants).toContainText('may claim your staking rewards');
  await expect(grants.getByRole('button', {name: 'Revoke'})).toHaveCount(0);
  await expect(grants).toContainText('This Keplr account is a Ledger: a revoke cannot be signed here, because ZIGoals’ signing library has no Ledger format for it.');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('none given says so; an unavailable read says why, never "none"', async ({page}) => {
  let down = false;
  const {grants} = await setup(page, {answer: () => down ? {version: 1, status: 'unavailable', reason: 'The chain did not answer just now, so the permissions you have given could not be read. Try again in a minute.', network: 'zig-test-2', source: 'https://testnet-api.zigchain.com', grants: [], allowances: []} : grantsWire('zig-test-2', {grants: [], allowances: []})});
  await expect(grants).toContainText('You have given no permissions on this network: no other address can act for this one.');
  down = true;
  await grants.getByRole('button', {name: 'Read again'}).click();
  await expect(grants).toContainText('The permissions could not be read: The chain did not answer just now');
  await expect(grants).not.toContainText('You have given no permissions');
});
