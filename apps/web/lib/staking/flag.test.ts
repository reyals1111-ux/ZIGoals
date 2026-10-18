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
test('exactly the five native module messages pass; a contract call, a send, an IBC transfer or a v1 vote does not', async () => {
  const env = await load('PUBLIC_ALPHA_UNDEPLOYED');
  expect(env.NATIVE_STAKING_TYPE_URLS).toEqual(['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgUndelegate', '/cosmos.staking.v1beta1.MsgBeginRedelegate', '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.gov.v1beta1.MsgVote']);
  expect(Object.isFrozen(env.NATIVE_STAKING_TYPE_URLS)).toBe(true);
  expect(() => env.assertNativeStakingAllowed(env.NATIVE_STAKING_TYPE_URLS.map(typeUrl => ({typeUrl})))).not.toThrow();
  for (const typeUrl of ['/cosmwasm.wasm.v1.MsgExecuteContract', '/cosmos.bank.v1beta1.MsgSend', '/ibc.applications.transfer.v1.MsgTransfer', '/cosmos.gov.v1.MsgVote', '/cosmos.authz.v1beta1.MsgExec', '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation', '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress', ''])
    expect(() => env.assertNativeStakingAllowed([{typeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}, {typeUrl}]), typeUrl).toThrow(env.NOT_A_STAKING_MESSAGE);
});
