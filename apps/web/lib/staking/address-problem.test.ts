import {describe, expect, it} from 'vitest';
import {zigAddressProblem} from './address';

// Session AL (N-BN-16, P-BN-23): Track Wallet says which kind of mistake an address has, never one message for all.
const ZIG = 'zig1qurswpc8qurswpc8qurswpc8qurswpc8jezgzf';
describe('zigAddressProblem', () => {
  it('accepts a ZIG account in either case', () => {
    expect(ZIG).toHaveLength(42);
    expect(zigAddressProblem(ZIG)).toBeNull();
    expect(zigAddressProblem(` ${ZIG.toUpperCase()} `)).toBeNull();
  });
  it('names another network’s prefix, an Ethereum-style address and a validator', () => {
    expect(zigAddressProblem('cosmos1qurswpc8qurswpc8qurswpc8qurswpc8nn86qp')).toContain('another network (cosmos1…)');
    expect(zigAddressProblem('0x52908400098527886E0F7030069857D2E4169EE7')).toContain('Ethereum-style address (0x…)');
    expect(zigAddressProblem('zigvaloper1qyqszqgpqyqszqgpqyqszqgpqyqszqgpexample')).toContain('a validator’s address');
  });
  it('tells a wrong length from a mistyped character', () => {
    expect(zigAddressProblem(ZIG.slice(0, 41))).toContain('is 41 characters long; a public ZIG address is 42');
    expect(zigAddressProblem(`${ZIG}q`)).toContain('is 43 characters long');
    const typo = ZIG.slice(0, 20) + (ZIG[20] === 'q' ? 'p' : 'q') + ZIG.slice(21);
    expect(zigAddressProblem(typo)).toContain('does not match its own check');
  });
  it('keeps the plain message for anything else, and every message starts the same way', () => {
    for (const raw of ['invalid', 'hello world', '123']) expect(zigAddressProblem(raw)).toContain('this is not a ZIGChain address');
    for (const raw of ['invalid', '0xabc', ZIG.slice(0, 30)]) expect(zigAddressProblem(raw)).toMatch(/^Could not verify public positions: .+ Nothing was read or saved\.$/);
  });
});
