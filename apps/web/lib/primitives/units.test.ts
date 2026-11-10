import {describe, expect, it} from 'vitest';
import {convertUnit, inOneUnit, kcalText, lengthText, measureText, sameDimension, type MeasureUnit} from '../health-units';

describe('one conversion table (MO-140)', () => {
  it('round-trips every pair of units of one dimension', () => {
    const groups: MeasureUnit[][] = [['g', 'kg', 'lb'], ['mm', 'cm', 'in'], ['ml', 'l', 'fl-oz-us'], ['kcal', 'kj']];
    for (const group of groups) for (const a of group) for (const b of group) for (const v of [0, 1, 35.4, 91.5, 1234.5]) {
      expect(convertUnit(convertUnit(v, a, b), b, a), `${v} ${a}→${b}→${a}`).toBeCloseTo(v, 9);
    }
  });
  it('knows the exact factors', () => {
    expect(convertUnit(1, 'in', 'cm')).toBeCloseTo(2.54, 12);
    expect(convertUnit(1, 'lb', 'kg')).toBeCloseTo(0.45359237, 12);
    expect(convertUnit(1, 'fl-oz-us', 'ml')).toBeCloseTo(29.5735295625, 10);
    expect(convertUnit(1, 'kcal', 'kj')).toBeCloseTo(4.184, 12);
  });
  it('refuses converting across dimensions', () => {
    expect(sameDimension('kg', 'cm')).toBe(false);
    expect(() => convertUnit(1, 'kg', 'cm')).toThrow(/can’t be shown in cm/);
  });
  it('a waist series in cm and inches is drawn in one unit, and a stray unit is left out', () => {
    const series = inOneUnit([{value: 91.5, unit: 'cm' as MeasureUnit}, {value: 90.8, unit: 'cm' as MeasureUnit}, {value: 35.4, unit: 'in' as MeasureUnit}, {value: 70, unit: 'kg' as MeasureUnit}], 'cm');
    expect(series.map(r => Math.round(r.converted * 10) / 10)).toEqual([91.5, 90.8, 89.9]);
  });
  it('shows each unit with its usual decimals, half up', () => {
    expect(lengthText(89.916, 'cm')).toBe('89.9 cm');
    expect(lengthText(89.916, 'in')).toBe('35.4 in');
    expect(kcalText(1999.5)).toBe('2,000 kcal');
    expect(measureText(1250, 'ml')).toBe('1,250 mL');
    expect(measureText(42.27, 'fl-oz-us')).toBe('42 fl oz');
    expect(measureText(-0.04, 'kg')).toBe('0 kg');
    expect(measureText(Number.NaN, 'kg')).toBe('—');
  });
});
