import {afterEach, expect, test, vi} from 'vitest';

// Session AF (ADR-028 H4, H46, H85): NATIVE_STAKING_SIGNING_ALLOWED beside the untouched FINANCIAL_EXECUTION_ALLOWED.
const load = async (value: string | undefined) => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT', value as string);
  return import('../app-environment');
};
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

test.each(['LOCAL_DEMO', 'PUBLIC_ALPHA_UNDEPLOYED', 'TESTNET_DEPLOYED'])('%s: native staking may sign; contract execution only on TESTNET_DEPLOYED', async mode => {
  const env = await load(mode);
  expect(env.APP_ENVIRONMENT).toBe(mode);
  expect(env.NATIVE_STAKING_SIGNING_ALLOWED).toBe(true);
  expect(env.FINANCIAL_EXECUTION_ALLOWED).toBe(mode === 'TESTNET_DEPLOYED');
  expect(() => env.assertNativeStakingAllowed()).not.toThrow();
  if (mode !== 'TESTNET_DEPLOYED') expect(() => env.assertFinancialExecutionAllowed()).toThrow('Financial actions are unavailable');
});
test.each([undefined, '', 'MAINNET', 'public_alpha_undeployed'])('an invalid build mode (%j) signs nothing', async mode => {
  const env = await load(mode);
  expect(env.APP_ENVIRONMENT).toBe('INVALID_CONFIGURATION');
  expect(env.NATIVE_STAKING_SIGNING_ALLOWED).toBe(false);
  expect(() => env.assertNativeStakingAllowed()).toThrow(env.NATIVE_STAKING_REFUSED);
});
// Assertion moved (Session AF chunk 3, ADR-028 H45, H46): the exact list gains authz MsgRevoke, the one message H46 adds
// for ending a grant; it stays an exact, frozen list, and every refusal below still holds (a send included, outside a
// practice badge's own rules, which have their own tests below).
test('exactly the six native module messages pass; a contract call, a send, an IBC transfer or a v1 vote does not', async () => {
  const env = await load('PUBLIC_ALPHA_UNDEPLOYED');
  expect(env.NATIVE_STAKING_TYPE_URLS).toEqual(['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgUndelegate', '/cosmos.staking.v1beta1.MsgBeginRedelegate', '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.gov.v1beta1.MsgVote', '/cosmos.authz.v1beta1.MsgRevoke']);
  expect(Object.isFrozen(env.NATIVE_STAKING_TYPE_URLS)).toBe(true);
  expect(() => env.assertNativeStakingAllowed(env.NATIVE_STAKING_TYPE_URLS.map(typeUrl => ({typeUrl})))).not.toThrow();
  for (const typeUrl of ['/cosmwasm.wasm.v1.MsgExecuteContract', '/cosmos.bank.v1beta1.MsgSend', '/ibc.applications.transfer.v1.MsgTransfer', '/cosmos.gov.v1.MsgVote', '/cosmos.authz.v1beta1.MsgExec', '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation', '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress', ''])
    expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}, {typeUrl}]), typeUrl).toThrow(env.NOT_A_STAKING_MESSAGE);
});

// Session AF chunk 3 (ADR-028 D4, H48; `TIER 3 (wallet/signing)`): a practice badge — and only a practice badge — may be a
// bank send: alone, on zig-test-2, to the sender itself, of exactly 1 azig, with a ZIGoals commitment or badge-id memo.
const SELF = 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr', OTHER = 'zig1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu';
const send = (over: Record<string, unknown> = {}) => ({typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: {fromAddress: SELF, toAddress: SELF, amount: [{denom: 'azig', amount: '1'}], ...over}});
const COMMIT = `zigoals:att:v1:c:${'ab'.repeat(32)}`, BADGE = `zigoals:att:v1:b:${'0f'.repeat(16)}`;
test('a practice badge passes only with every rule: zig-test-2, a self-send, exactly 1 azig, a ZIGoals code as the memo', async () => {
  const env = await load('PUBLIC_ALPHA_UNDEPLOYED');
  expect(() => env.assertNativeStakingAllowed([send()], {chainId: 'zig-test-2', memo: COMMIT})).not.toThrow();
  expect(() => env.assertNativeStakingAllowed([send()], {chainId: 'zig-test-2', memo: BADGE})).not.toThrow();
  const refused = (messages: unknown[], context: Record<string, unknown>, why: string) => expect(() => env.assertNativeStakingAllowed(messages as never, context), why).toThrow(env.NOT_AN_ATTESTATION);
  refused([send()], {chainId: 'zigchain-1', memo: COMMIT}, 'mainnet is refused');
  refused([send()], {memo: COMMIT}, 'no chain id is refused');
  refused([send()], {chainId: 'zig-test-2'}, 'no memo');
  refused([send({toAddress: OTHER})], {chainId: 'zig-test-2', memo: COMMIT}, 'another recipient');
  for (const amount of ['0', '2', '01', '1000000000000000000', ''] as const) refused([send({amount: [{denom: 'azig', amount}]})], {chainId: 'zig-test-2', memo: COMMIT}, `amount ${amount}`);
  refused([send({amount: [{denom: 'uzig', amount: '1'}]})], {chainId: 'zig-test-2', memo: COMMIT}, 'another denom');
  refused([send({amount: [{denom: 'azig', amount: '1'}, {denom: 'azig', amount: '1'}]})], {chainId: 'zig-test-2', memo: COMMIT}, 'two coins');
  refused([send({amount: [{denom: 'azig', amount: '1', extra: 1}]})], {chainId: 'zig-test-2', memo: COMMIT}, 'a coin with more fields');
  refused([send({extra: 'x'})], {chainId: 'zig-test-2', memo: COMMIT}, 'a message with more fields');
  refused([send({fromAddress: 'cosmos1x', toAddress: 'cosmos1x'})], {chainId: 'zig-test-2', memo: COMMIT}, 'not a zig1 account');
  refused([send(), send()], {chainId: 'zig-test-2', memo: COMMIT}, 'two sends');
  expect(() => env.assertNativeStakingAllowed([send(), {typeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}] as never, {chainId: 'zig-test-2', memo: COMMIT}), 'a send beside staking').toThrow(env.NOT_A_STAKING_MESSAGE);
  for (const memo of ['My garden goal', 'ab'.repeat(32), `zigoals:att:v1:c:${'AB'.repeat(32)}`, `zigoals:att:v1:c:${'ab'.repeat(31)}a`, `zigoals:att:v1:c:${'ab'.repeat(32)} `, `zigoals:att:v2:c:${'ab'.repeat(32)}`, `zigoals:att:v1:b:${'0f'.repeat(32)}`, `zigoals:att:v1:x:${'0f'.repeat(16)}`, `${COMMIT}\nhello`])
    refused([send()], {chainId: 'zig-test-2', memo}, `memo ${memo}`);
  // A send without the badge's context is refused as before (no context: not a staking message, not a badge).
  expect(() => env.assertNativeStakingAllowed([send()])).toThrow(env.NOT_AN_ATTESTATION);
});
test('a staking signature carries no memo; a revoke is refused to a Ledger; an invalid build signs no badge', async () => {
  const env = await load('PUBLIC_ALPHA_UNDEPLOYED');
  expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}], {chainId: 'zig-test-2', memo: ''})).not.toThrow();
  expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}], {chainId: 'zig-test-2', memo: COMMIT})).toThrow(env.NOT_A_STAKING_MESSAGE);
  expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.authz.v1beta1.MsgRevoke'}], {chainId: 'zigchain-1', memo: '', isLedger: false})).not.toThrow();
  expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.authz.v1beta1.MsgRevoke'}], {chainId: 'zigchain-1', memo: '', isLedger: true})).toThrow(env.REVOKE_NEEDS_DIRECT);
  const invalid = await load(undefined);
  expect(() => invalid.assertNativeStakingAllowed([send()], {chainId: 'zig-test-2', memo: COMMIT})).toThrow(invalid.NATIVE_STAKING_REFUSED);
});
