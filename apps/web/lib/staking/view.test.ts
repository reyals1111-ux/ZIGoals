import {toBech32} from '@cosmjs/encoding';
import {expect, test} from 'vitest';
import type {WireValidator} from '../chain/validators-wire';
import type {Position} from '../positions';
import {concentrationOf, daysText, feeText, holdingsOf, percentText, zigText} from './view';

// Session AF (L2 design §4): the staking screens' words and figures, exact (no floats in amounts), never ranked by return.
test('percent, days, ZIG and fee words', () => {
  expect(percentText('0.05')).toBe('5%');
  expect(percentText('0.083249673843021991')).toBe('8.32%');
  expect(percentText('0.081')).toBe('8.1%');
  expect(percentText('0.0805')).toBe('8.05%');
  expect(percentText('1')).toBe('100%');
  expect(percentText('0')).toBe('0%');
  expect(percentText('-1')).toBe('unavailable');
  expect(daysText(1814400)).toBe('21 days');
  expect(daysText(86400)).toBe('1 day');
  expect(zigText('25000000000000000000')).toBe('25 ZIG');
  expect(zigText('1234567890000000000000')).toBe('1,234.56789 ZIG');
  expect(zigText('1')).toBe('0.000000000000000001 ZIG');
  expect(zigText('x')).toBe('unavailable');
  expect(feeText((244012n * 2500000000n).toString())).toBe('about 0.00061 ZIG');
  expect(feeText('1000000000000000000')).toBe('about 1 ZIG');
});
test('holdings: the connected address\'s own ZIG on one network; stZIG, other accounts and zero rows left out', () => {
  const me = toBech32('zig', new Uint8Array(20).fill(1)), other = toBech32('zig', new Uint8Array(20).fill(2)), v = toBech32('zigvaloper', new Uint8Array(20).fill(3));
  const p = (over: Partial<Position>) => ({providerId: 'native-zig', network: 'zig-test-2', account: me, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '5', sourceType: 'WALLET_LIQUID', observedAt: '2026-10-18T21:00:00.000Z', provenance: 'x · block 9', ...over}) as Position;
  const validator = {address: v, name: 'Alpha', status: 'BOND_STATUS_BONDED', commission: '0.05', votingTokens: '1'};
  const h = holdingsOf([p({}), p({sourceType: 'NATIVE_STAKING', validator, quantity: '7'}), p({sourceType: 'NATIVE_REWARDS', validator, quantity: '0'}), p({sourceType: 'LIQUID_STAKING', asset: 'stZIG', quantity: '9'}), p({account: other, quantity: '99'}), p({network: 'zigchain-1', quantity: '98'})], 'zig-test-2', me);
  expect(h).toMatchObject({observed: true, liquid: '5', delegations: [{validator: v, name: 'Alpha', amount: '7'}], rewards: []});
  expect(holdingsOf([], 'zig-test-2', me)).toMatchObject({observed: false, liquid: undefined});
});
test('concentration: the share the largest bonded validators hold, as an exact decimal', () => {
  const v = (share: string, status: WireValidator['status'] = 'bonded') => ({status, votingPowerShare: share}) as WireValidator;
  expect(concentrationOf([v('0.2'), v('0.2'), v('0.15'), v('0.08'), v('0.37'), v('0.5', 'unbonded')])).toEqual({count: 4, share: '0.92'});
  expect(concentrationOf([v('0.5'), v('0.5')])).toBeNull();
});
