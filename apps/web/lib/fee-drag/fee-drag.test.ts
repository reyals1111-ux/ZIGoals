import {describe, expect, test} from 'vitest';
import {feeDrag, feeDragIssue} from './fee-drag';

describe('the fee drag calculator (Session AK lane M, item 18)', () => {
  test('the same return under two fees; the difference at the end', () => {
    const r = feeDrag({amount: 10_000, years: 30, returnPct: 6, feeAPct: 0.1, feeBPct: 1});
    expect(r.a).toHaveLength(31);
    expect(r.a[0]).toBe(10_000);
    expect(r.endA).toBeCloseTo(10_000 * (1.06 * 0.999) ** 30, 1);
    expect(r.endB).toBeCloseTo(10_000 * (1.06 * 0.99) ** 30, 1);
    expect(r.difference).toBeCloseTo(r.endA - r.endB, 2);
    expect(r.difference).toBeGreaterThan(0);
    expect(r.share).toBeGreaterThan(0.2);
    expect(r.share).toBeLessThan(0.3);
  });
  test('equal fees: no difference; B cheaper: a negative difference', () => {
    expect(feeDrag({amount: 500, years: 5, returnPct: 4, feeAPct: 0.5, feeBPct: 0.5}).difference).toBe(0);
    expect(feeDrag({amount: 500, years: 5, returnPct: 4, feeAPct: 1, feeBPct: 0}).difference).toBeLessThan(0);
  });
  test('zero return and zero fee keep the amount', () => {
    expect(feeDrag({amount: 1234.56, years: 10, returnPct: 0, feeAPct: 0, feeBPct: 0}).endA).toBe(1234.56);
  });
  test('inputs out of range are refused in plain words', () => {
    expect(feeDragIssue({amount: 0, years: 5, returnPct: 4, feeAPct: 1, feeBPct: 0})).toMatch(/amount/);
    expect(feeDragIssue({amount: 1, years: 0, returnPct: 4, feeAPct: 1, feeBPct: 0})).toMatch(/years/);
    expect(feeDragIssue({amount: 1, years: 5, returnPct: 4, feeAPct: 11, feeBPct: 0})).toMatch(/fee/);
    expect(feeDragIssue({amount: 1, years: 5, returnPct: Number.NaN, feeAPct: 1, feeBPct: 0})).toMatch(/return/);
    expect(() => feeDrag({amount: 1, years: 1.5, returnPct: 4, feeAPct: 1, feeBPct: 0})).toThrow();
  });
});
