import {toBech32} from '@cosmjs/encoding';
import {Registry} from '@cosmjs/proto-signing';
import {AminoTypes, createDefaultAminoConverters, defaultRegistryTypes} from '@cosmjs/stargate';
import {describe, expect, test} from 'vitest';
import {ATTESTATION_TYPE_URL, NATIVE_STAKING_TYPE_URLS} from '../app-environment';
import {MAX_CLAIM_VALIDATORS, STAKING_TYPE_URLS, StakingInputError, assertStakingMessages, claim, delegate, liquidSpend, redelegate, undelegate, validatorsOf, vote} from './messages';

// Session AF (ADR-028 H46, H60): the five builders.
const ME = toBech32('zig', new Uint8Array(20).fill(1)), A = toBech32('zigvaloper', new Uint8Array(20).fill(2)), B = toBech32('zigvaloper', new Uint8Array(20).fill(3));
const registry = new Registry(defaultRegistryTypes), amino = new AminoTypes(createDefaultAminoConverters());
const ZIG25 = '25000000000000000000';

describe('builders', () => {
  test('exactly the build flag\'s type URLs, plus the testnet practice badge\'s bank send (Session AF chunk 3)', () => {
    expect(Object.values(STAKING_TYPE_URLS).sort()).toEqual([...NATIVE_STAKING_TYPE_URLS, ATTESTATION_TYPE_URL].sort());
  });
  test('delegate, undelegate and redelegate carry azig only, as typed', () => {
    expect(delegate({delegator: ME, validator: A, amount: ZIG25})).toEqual({typeUrl: '/cosmos.staking.v1beta1.MsgDelegate', value: {delegatorAddress: ME, validatorAddress: A, amount: {denom: 'azig', amount: ZIG25}}});
    expect(undelegate({delegator: ME, validator: A, amount: '1'}).value.amount).toEqual({denom: 'azig', amount: '1'});
    expect(redelegate({delegator: ME, source: A, destination: B, amount: ZIG25})).toEqual({typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate', value: {delegatorAddress: ME, validatorSrcAddress: A, validatorDstAddress: B, amount: {denom: 'azig', amount: ZIG25}}});
    // No builder takes a denom: a look-alike token cannot be passed in.
    expect(delegate({delegator: ME, validator: A, amount: ZIG25, denom: 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig'} as never).value.amount.denom).toBe('azig');
    expect(Object.isFrozen(delegate({delegator: ME, validator: A, amount: '1'}).value)).toBe(true);
  });
  test('claim one is one message; claim all is one per validator in order (H60)', () => {
    expect(claim({delegator: ME, validators: [A]})).toEqual([{typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', value: {delegatorAddress: ME, validatorAddress: A}}]);
    const all = claim({delegator: ME, validators: [B, A]});
    expect(all.map(m => m.value.validatorAddress)).toEqual([B, A]);
    expect(validatorsOf(all)).toEqual([B, A]);
    expect(() => claim({delegator: ME, validators: []})).toThrow('no rewards');
    expect(() => claim({delegator: ME, validators: [A, A]})).toThrow('once');
    expect(() => claim({delegator: ME, validators: Array.from({length: MAX_CLAIM_VALIDATORS + 1}, (_, i) => toBech32('zigvaloper', new Uint8Array(20).fill(i + 4)))})).toThrow('at most');
  });
  test('vote is gov v1beta1 MsgVote with the SDK option numbers', () => {
    expect(vote({voter: ME, proposalId: '42', option: 'yes'})).toEqual({typeUrl: '/cosmos.gov.v1beta1.MsgVote', value: {proposalId: 42n, voter: ME, option: 1}});
    expect([vote({voter: ME, proposalId: '1', option: 'abstain'}), vote({voter: ME, proposalId: '1', option: 'no'}), vote({voter: ME, proposalId: '1', option: 'no_with_veto'})].map(m => m.value.option)).toEqual([2, 3, 4]);
    for (const id of ['0', '-1', '1.5', '01', 'x', '1'.repeat(20)]) expect(() => vote({voter: ME, proposalId: id, option: 'yes'}), id).toThrow(StakingInputError);
    expect(() => vote({voter: ME, proposalId: '1', option: 'maybe' as 'yes'})).toThrow('Choose');
    expect(() => vote({voter: ME, proposalId: '1', option: 'toString' as 'yes'})).toThrow('Choose');
  });
  test.each([
    ['a validator address as the delegator', () => delegate({delegator: A, validator: A, amount: '1'})],
    ['an account address as the validator', () => delegate({delegator: ME, validator: ME, amount: '1'})],
    ['another chain\'s validator', () => delegate({delegator: ME, validator: toBech32('cosmosvaloper', new Uint8Array(20)), amount: '1'})],
    ['an upper-case validator', () => delegate({delegator: ME, validator: A.toUpperCase(), amount: '1'})],
    ['a 32-byte validator', () => delegate({delegator: ME, validator: toBech32('zigvaloper', new Uint8Array(32)), amount: '1'})],
    ['zero', () => delegate({delegator: ME, validator: A, amount: '0'})],
    ['a decimal', () => delegate({delegator: ME, validator: A, amount: '1.5'})],
    ['a leading zero', () => undelegate({delegator: ME, validator: A, amount: '01'})],
    ['a negative', () => undelegate({delegator: ME, validator: A, amount: '-1'})],
    ['the same validator twice', () => redelegate({delegator: ME, source: A, destination: A, amount: '1'})],
  ])('refuses %s', (_, build) => { expect(build).toThrow(StakingInputError); });
});
describe('encoding (the registry and the Ledger amino path accept each message)', () => {
  test('every builder encodes with CosmJS\'s default registry and round-trips through its amino converters', () => {
    const messages = [delegate({delegator: ME, validator: A, amount: ZIG25}), undelegate({delegator: ME, validator: A, amount: '1'}), redelegate({delegator: ME, source: A, destination: B, amount: '2'}), ...claim({delegator: ME, validators: [A, B]}), vote({voter: ME, proposalId: '7', option: 'no_with_veto'})];
    for (const m of messages) {
      const any = registry.encodeAsAny(m);
      expect(any.typeUrl).toBe(m.typeUrl);
      const back = amino.fromAmino(amino.toAmino(m));
      expect(registry.encodeAsAny(back).value, m.typeUrl).toEqual(any.value);
    }
  });
});
describe('checks before a quote', () => {
  test('liquid spend counts delegations only', () => {
    expect(liquidSpend([delegate({delegator: ME, validator: A, amount: '5'}), delegate({delegator: ME, validator: B, amount: '7'})])).toBe(12n);
    expect(liquidSpend([undelegate({delegator: ME, validator: A, amount: '5'}), ...claim({delegator: ME, validators: [A]})])).toBe(0n);
  });
  test('only the signer\'s own messages, of the five types, in ZIG', () => {
    expect(() => assertStakingMessages([delegate({delegator: ME, validator: A, amount: '1'})], ME)).not.toThrow();
    expect(() => assertStakingMessages([], ME)).toThrow('Nothing to sign');
    expect(() => assertStakingMessages([delegate({delegator: ME, validator: A, amount: '1'})], toBech32('zig', new Uint8Array(20).fill(9)))).toThrow('your own');
    expect(() => assertStakingMessages([{typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: {delegatorAddress: ME}} as never], ME)).toThrow('your own');
    expect(() => assertStakingMessages([{typeUrl: STAKING_TYPE_URLS.delegate, value: {delegatorAddress: ME, validatorAddress: A, amount: {denom: 'uzig', amount: '1'}}} as never], ME)).toThrow('Only ZIG');
  });
});
