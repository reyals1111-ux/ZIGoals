import {describe, expect, it} from 'vitest';
import fixture from './fixtures/live-2026-10-19.json';
import {aprAtCommission, aprBreakdown, nanoseconds, YEAR_SECONDS} from './apr';
import {div, fixed, mul, percent, rounded, text, units} from './decimal';

/**
 * Session AF (ADR-028 H9, H51; `TIER 3 (data formats)`): the native staking APR from the recorded mainnet read
 * (lib/earn/fixtures/live-2026-10-19.json, one real read of the chain). Each step is checked against the same arithmetic
 * done independently with plain BigInt here, so the module cannot drift from the formula it states.
 */
type Chain = {mint: {annualProvisions: string; blocksPerYear: string}; staking: {bondedTokens: string}; distribution: {communityTax: string}; blocks: {latest: {height: string; time: string}; earlier: {height: string; time: string}}; apr: Record<string, string>};
const chain = (fixture.answers.chainMainnet as unknown as {data: Chain}).data;
const inputs = {annualProvisions: chain.mint.annualProvisions, bondedTokens: chain.staking.bondedTokens, communityTax: chain.distribution.communityTax, mintBlocksPerYear: chain.mint.blocksPerYear, latest: chain.blocks.latest, earlier: chain.blocks.earlier};

describe('fixed-point decimals', () => {
  it('reads chain decimals exactly and cuts past 18 places', () => {
    expect(text(fixed('24438865427046207987769200.159838743647053428'))).toBe('24438865427046207987769200.159838743647053428');
    expect(text(fixed('0.0100000000000000009'))).toBe('0.01');
    expect(text(units('181660424460329', 6))).toBe('181660424.460329');
    expect(text(units('1', 24))).toBe('0');
    expect(rounded(fixed('0.0506198'), 4)).toBe('0.0506');
    expect(percent(fixed('0.050619836'), 2)).toBe('5.06');
    expect(percent(fixed('0.0574276'), 2)).toBe('5.74');
    expect(text(mul(fixed('2'), fixed('0.5')))).toBe('1');
    expect(text(div(fixed('1'), fixed('3')))).toBe('0.333333333333333333');
  });
  it.each(['', '-1', '1e5', '0x10', '1.', '.5', 'NaN', ' 1'])('refuses %j', bad => { expect(() => fixed(bad)).toThrow(); });
  it('refuses a division by zero', () => { expect(() => div(fixed('1'), 0n)).toThrow(); });
});

describe('native staking APR from the recorded read', () => {
  const b = aprBreakdown(inputs);
  it('gross is annual provisions ÷ bonded tokens', () => {
    const want = BigInt(inputs.annualProvisions.split('.')[0]!) * 10n ** 18n / BigInt(inputs.bondedTokens);
    expect(fixed(b.gross) / 10n ** 6n).toBe(want / 10n ** 6n);
    expect(Number(b.gross)).toBeGreaterThan(0.05);
    expect(Number(b.gross)).toBeLessThan(0.07);
  });
  it('after tax is gross × (1 − community tax)', () => {
    expect(b.afterTax).toBe(text(mul(fixed(b.gross), fixed('1') - fixed(inputs.communityTax))));
  });
  it('real blocks per year come from the two headers, and correct the mint module\'s blocks_per_year', () => {
    const ns = nanoseconds(inputs.latest.time) - nanoseconds(inputs.earlier.time);
    expect(b.windowBlocks).toBe('10000');
    expect(b.windowSeconds).toBe(text(ns * 10n ** 9n));
    const real = 10000n * YEAR_SECONDS * 10n ** 9n * 10n ** 18n / ns;
    expect(b.realBlocksPerYear).toBe(text(real));
    expect(b.factor).toBe(text(real * 10n ** 18n / (BigInt(inputs.mintBlocksPerYear) * 10n ** 18n)));
    // About 3.17 s per block on 2026-10-18 against the mint module's 3.0 s (H51).
    expect(Number(b.blockSeconds)).toBeGreaterThan(3.1);
    expect(Number(b.blockSeconds)).toBeLessThan(3.25);
    expect(Number(b.factor)).toBeGreaterThan(0.92);
    expect(Number(b.factor)).toBeLessThan(0.97);
    expect(b.beforeCommission).toBe(text(mul(fixed(b.afterTax), fixed(b.factor))));
  });
  it('the commission is taken last, and the recorded answer is what the module computes', () => {
    const at5 = aprAtCommission(b, '0.05'), at10 = aprAtCommission(b, '0.100000000000000000');
    expect(at5).toBe(text(mul(fixed(b.beforeCommission), fixed('0.95'))));
    expect(Number(at10)).toBeLessThan(Number(at5));
    expect(aprAtCommission(b, '0')).toBe(b.beforeCommission);
    expect(aprAtCommission(b, '1')).toBe('0');
    expect(chain.apr).toEqual(b);
    for (const value of [b.gross, b.afterTax, b.factor, b.beforeCommission, at5]) expect(Number.isFinite(Number(value))).toBe(true);
  });
  it('refuses inputs it cannot compute honestly', () => {
    expect(() => aprBreakdown({...inputs, bondedTokens: '0'})).toThrow();
    expect(() => aprBreakdown({...inputs, mintBlocksPerYear: '0'})).toThrow();
    expect(() => aprBreakdown({...inputs, communityTax: '1.5'})).toThrow();
    expect(() => aprBreakdown({...inputs, earlier: inputs.latest})).toThrow();
    expect(() => aprBreakdown({...inputs, latest: {...inputs.latest, time: 'yesterday'}})).toThrow();
    expect(() => aprAtCommission(b, '1.2')).toThrow();
    expect(() => aprAtCommission(b, '-0.1')).toThrow();
  });
  it('reads RFC 3339 nanoseconds', () => {
    expect(nanoseconds('1970-01-01T00:00:01.5Z')).toBe(1_500_000_000n);
    expect(nanoseconds('2026-10-18T20:57:32.994539222Z') - nanoseconds('2026-10-18T20:57:32Z')).toBe(994_539_222n);
    expect(() => nanoseconds('2026-10-18T20:57:32+02:00')).toThrow();
  });
});
