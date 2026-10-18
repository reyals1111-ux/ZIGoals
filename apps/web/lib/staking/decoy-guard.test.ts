import {expect, test} from 'vitest';
import {LOOKALIKE_WARNING, classifyDenom, lookalikesOf, zigBalanceOf} from './decoy-guard';

// Session AF (ADR-028 H21, L2 design §1): ZIG by base denom only; look-alikes are never counted.
const DECOY = 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig';
test('azig is ZIG; the known decoy and any token that reads as ZIG are look-alikes; others are other tokens', () => {
  expect(classifyDenom({denom: 'azig'})).toBe('zig');
  expect(classifyDenom({denom: DECOY, symbol: 'ZIG'})).toBe('lookalike');
  expect(classifyDenom({denom: DECOY})).toBe('lookalike');
  expect(classifyDenom({denom: 'coin.zig1abc.zig'})).toBe('lookalike');
  expect(classifyDenom({denom: 'ibc/ABC', symbol: 'zig'})).toBe('lookalike');
  expect(classifyDenom({denom: 'factory/zig1x/token', display: ' ZIG '})).toBe('lookalike');
  expect(classifyDenom({denom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', symbol: 'stZIG'})).toBe('other');
  expect(classifyDenom({denom: 'uzig'})).toBe('other');
  expect(LOOKALIKE_WARNING).toBe('Not ZIG. Never stake, buy or send this.');
});
test('the ZIG balance is the azig entry alone; a decoy with a larger amount is never added', () => {
  const balances = [{denom: DECOY, symbol: 'ZIG', amount: '999000000'}, {denom: 'azig', amount: '25000000000000000000'}, {denom: 'ibc/X', amount: '5'}];
  expect(zigBalanceOf(balances)).toBe('25000000000000000000');
  expect(lookalikesOf(balances).map(b => b.denom)).toEqual([DECOY]);
  expect(zigBalanceOf([{denom: DECOY, amount: '1'}])).toBe('0');
  expect(() => zigBalanceOf([{denom: 'azig', amount: '1'}, {denom: 'azig', amount: '2'}])).toThrow('Duplicate');
  expect(() => zigBalanceOf([{denom: 'azig', amount: '1.5'}])).toThrow('Malformed');
});
