import {expect, test} from 'vitest';
import {emptyPlatform, platformSchema, type Position} from '../positions';
import {canonicalAddress, checkWalletName, nameOf, removeTrackedWallet, restoreTrackedWallet, trackedWallets, withName, WALLET_NAMES} from './tracked-wallets';

// Session AL (BN-085, BN-112, BN-079): tracked wallets get a name and a Remove; fictional addresses.
const A = 'zig1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu', B = 'zig1testnetaddressfictional000000000000000';
const pos = (network: string, account: string, kind: string): Position => ({id: `${network}:${account}:${kind}`, providerId: 'native-zig', sourceType: 'WALLET_LIQUID', network, account, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '1000', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-11-04T01:00:00.000Z', liquidity: 'LIQUID', provenance: 'test', executionAuthority: 'NONE', notes: '', risk: ''} as Position);
const platform = () => platformSchema.parse({...emptyPlatform(), positions: [pos('zigchain-1', A, 'liquid'), pos('zigchain-1', A, 'staked'), pos('zig-test-2', B, 'liquid')], snapshots: [{positionId: `zigchain-1:${A}:liquid`, quantity: '1000', observedAt: '2026-11-04T01:00:00.000Z'}], watchScope: {network: 'zigchain-1', account: A}, aprAssumptions: [{network: 'zigchain-1', account: A, percent: '5'}]});

test('lists each wallet once per network', () => {
  expect(trackedWallets(platform())).toEqual([{network: 'zigchain-1', account: A, positions: 2}, {network: 'zig-test-2', account: B, positions: 1}]);
});
test('BN-085/BN-112: removing a wallet takes its positions, history, APR and scope; Undo puts them back', () => {
  const before = platform();
  const out = removeTrackedWallet(before, 'zigchain-1', A);
  if (!out.ok) throw Error(out.reason);
  const next = platformSchema.parse(out.next);
  expect(trackedWallets(next)).toEqual([{network: 'zig-test-2', account: B, positions: 1}]);
  expect(next.snapshots).toEqual([]);
  expect(next.aprAssumptions).toEqual([]);
  expect(next.watchScope).toBeUndefined();
  const back = platformSchema.parse(restoreTrackedWallet(next, before, 'zigchain-1', A));
  expect(trackedWallets(back).map(w => w.account).sort()).toEqual([A, B].sort());
  expect(back.watchScope).toEqual({network: 'zigchain-1', account: A});
  expect(back.snapshots).toHaveLength(1);
});
test('a wallet that funds a Goal is not removed, and the reason says so', () => {
  const s = platform();
  const goal = {id: 'g1', name: 'Emergency fund'};
  const withGoal = {...s, goals: [goal as never], allocations: [{goalId: 'g1', positionId: `zigchain-1:${A}:liquid`, quantity: '10'}]};
  const out = removeTrackedWallet(withGoal, 'zigchain-1', A);
  expect(out.ok).toBe(false);
  expect(!out.ok && out.reason).toMatch(/Emergency fund/);
});
test('BN-079: addresses are kept in lower case; names are device-only, trimmed and capped', () => {
  expect(canonicalAddress(`  ${A.toUpperCase()} `)).toBe(A);
  const named = withName(WALLET_NAMES.empty(), 'zigchain-1', A.toUpperCase(), 'Savings');
  expect(nameOf(named, 'zigchain-1', A)).toBe('Savings');
  expect(nameOf(withName(named, 'zigchain-1', A, ''), 'zigchain-1', A)).toBe('');
  expect(checkWalletName('  My   wallet ')).toEqual({ok: true, name: 'My wallet'});
  expect(checkWalletName('x'.repeat(41)).ok).toBe(false);
  expect(WALLET_NAMES.schema.safeParse({version: 1, names: [], later: 1}).success).toBe(true);
});
