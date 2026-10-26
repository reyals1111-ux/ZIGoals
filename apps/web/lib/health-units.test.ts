import {describe, expect, it} from 'vitest';
import {waterText, weightChangeText, weightChartValue, weightText} from './health-units';

describe('weight and water in the chosen unit (Session Z-Cloud Part 4.7, display only)', () => {
  it('kilograms keep the journal\'s text; pounds show one decimal', () => {
    expect(weightText(72_400, 'kg')).toBe('72.4 kg');
    // Assertion changed (Session AH TR10, one rounding rule: a tenth in either unit; equal strength).
    expect(weightText(72_345, 'kg')).toBe('72.3 kg'); expect(weightText(74_843, 'kg')).toBe('74.8 kg');
    expect(weightText(72_400, 'lb')).toBe('159.6 lb');
    expect(weightText(45_359.237, 'lb')).toBe('100 lb');
  });
  it('a change carries its sign, zero none', () => {
    expect(weightChangeText(400, 'kg')).toBe('+0.4 kg');
    expect(weightChangeText(-1_200, 'lb')).toBe('-2.6 lb');
    expect(weightChangeText(0, 'lb')).toBe('0 lb');
  });
  it('millilitres keep one decimal at most; US fluid ounces are whole', () => {
    expect(waterText(1_250, 'ml')).toBe('1,250 mL');
    expect(waterText(1_250, 'fl-oz-us')).toBe('42 fl oz');
    expect(waterText(2_000, 'fl-oz-us')).toBe('68 fl oz');
  });
  it('the chart\'s points: grams to three decimals of a kilogram, tenths of a pound', () => {
    expect(weightChartValue(72_400, 'kg')).toEqual({value: '724', decimals: 1, unit: 'kg'}); // Assertion changed (TR10), as above
    expect(weightChartValue(72_400, 'lb')).toEqual({value: '1596', decimals: 1, unit: 'lb'});
  });
});
