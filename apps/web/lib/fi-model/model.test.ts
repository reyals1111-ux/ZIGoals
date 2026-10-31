import {describe, expect, test} from 'vitest';
import {FI_DEFAULTS, fiIssue, fiTarget, mulberry32, normals, percentile, runFiModel, type FiInput} from './model';
import {fiModelSchema} from './store';

const base: FiInput = {invested: 50_000, yearlySpend: 30_000, withdrawalPct: 4, monthlyContribution: 1_000, returnPct: 5, volatilityPct: 15, years: 50};
describe('the Financial freedom model (Session AK lane M, item 12)', () => {
  test('the target is the yearly spending ÷ the withdrawal rate', () => {
    expect(fiTarget(30_000, 4)).toBe(750_000);
    expect(fiTarget(40_000, 3.5)).toBeCloseTo(1_142_857.14, 1);
  });
  test('the generator is seeded and in [0, 1); the normals have mean ≈ 0 and sd ≈ 1', () => {
    const a = mulberry32(42), b = mulberry32(42), xs = Array.from({length: 5}, a);
    expect(Array.from({length: 5}, b)).toEqual(xs);
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    const z = normals(mulberry32(7)), n = 50_000, s = Array.from({length: n}, z);
    const mean = s.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(s.reduce((x, y) => x + (y - mean) ** 2, 0) / n);
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(sd - 1)).toBeLessThan(0.02);
  });
  test('deterministic for a seed; another seed differs', () => {
    const a = runFiModel(base), b = runFiModel(base), c = runFiModel({...base, seed: 1});
    expect(a.bands).toEqual(b.bands);
    expect(a.yearsTo).toEqual(b.yearsTo);
    expect(c.bands[30]!.p50).not.toBe(a.bands[30]!.p50);
  });
  test('the bands are ordered, start at today\'s amount and span the horizon', () => {
    const r = runFiModel(base);
    expect(r.bands).toHaveLength(51);
    expect(r.bands[0]).toEqual({year: 0, p10: 50_000, p50: 50_000, p90: 50_000});
    expect(r.bands.every(b => b.p10 <= b.p50 && b.p50 <= b.p90)).toBe(true);
    expect(r.yearsTo.p10! <= r.yearsTo.p50!).toBe(true);
    expect(r.reached).toBeGreaterThan(0.5);
  });
  test('no volatility is the plain compound path (every percentile the same)', () => {
    const r = runFiModel({...base, volatilityPct: 0, years: 10});
    let v = 50_000; const g = 1.05;
    for (let y = 0; y < 10; y++) v = v * g + 12_000 * (g - 1) / Math.log(g);
    expect(r.bands[10]!.p10).toBeCloseTo(v, 4);
    expect(r.bands[10]!.p90).toBeCloseTo(v, 4);
  });
  test('already at the target: 0 years; never reaching it: null, not a number', () => {
    expect(runFiModel({...base, invested: 800_000}).yearsTo).toEqual({p10: 0, p50: 0, p90: 0});
    const never = runFiModel({...base, invested: 0, monthlyContribution: 0, years: 5});
    expect(never.reached).toBe(0);
    expect(never.yearsTo).toEqual({p10: null, p50: null, p90: null});
  });
  test('1,000 paths × 50 years run in well under 50 ms', () => {
    runFiModel(base); // warm up
    const r = runFiModel({...base, paths: FI_DEFAULTS.paths, years: 50});
    expect(r.ms).toBeLessThan(50);
    // Reached inside a year: a fraction of a year, never past the horizon.
    expect(r.yearsTo.p50! % 1).not.toBe(0);
    expect(r.yearsTo.p90!).toBeLessThanOrEqual(50);
  });
  test('inputs out of range are refused in plain words', () => {
    expect(fiIssue({...base, yearlySpend: 0})).toMatch(/yearly spending/);
    expect(fiIssue({...base, withdrawalPct: 0.5})).toMatch(/withdrawal/);
    expect(fiIssue({...base, years: 2.5})).toMatch(/Whole years/);
    expect(fiIssue({...base, invested: Number.NaN})).toMatch(/invested/);
    expect(fiIssue(base)).toBeNull();
    expect(() => runFiModel({...base, volatilityPct: 99})).toThrow(/volatility/);
  });
  test('percentile by nearest rank', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
  });
  test('the stored inputs are optional and bounded', () => {
    expect(fiModelSchema.parse({version: 1})).toEqual({version: 1});
    expect(fiModelSchema.safeParse({version: 1, inputs: {withdrawalPct: 50}}).success).toBe(false);
    expect(fiModelSchema.safeParse({version: 1, inputs: {invested: 1, years: 30, currency: 'EUR', later: true}}).success).toBe(true);
  });
});
