import {afterEach, describe, expect, it} from 'vitest';
import {roundHalfUp, wholePercent} from '../numbers/round';
import {formatCurrencyAmount, formatDate, formatDateLong, formatDateShort, formatPercent, formatProgressPercent, formatRounded, isAlphaCurrency, progressPresentation, setDisplayLocale} from '../visual-format';

afterEach(() => setDisplayLocale('en-US'));
describe('one rounding rule (PR-023)', () => {
  it('rounds half up on the decimal, never -0', () => {
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(-0.04, 1)).toBe(0);
    expect(Object.is(roundHalfUp(-0.04, 1), -0)).toBe(false);
    expect(roundHalfUp(Number.NaN)).toBeNaN();
  });
  it('a progress percent: 99.6 is 99 until complete, the same as the Goal ring (progressPresentation)', () => {
    expect(wholePercent(99.6)).toBe(99);
    expect(wholePercent(99.6, true)).toBe(100);
    expect(wholePercent(100)).toBe(100);
    expect(wholePercent(94.5)).toBe(95);
    expect(wholePercent('37.49')).toBe(37);
    expect(wholePercent(-3)).toBe(0);
    expect(wholePercent(null)).toBeNull(); expect(wholePercent('n/a')).toBeNull(); expect(wholePercent('')).toBeNull();
    for (const v of [0, 0.4, 49.5, 94.5, 99.4, 99.6, 100, 140]) expect(String(wholePercent(v)), String(v)).toBe(progressPresentation(v)!.label);
  });
  it('formats percentages with the locale sign; unknown is "—"', () => {
    expect(formatProgressPercent(99.6)).toBe('99%');
    expect(formatProgressPercent(99.6, true)).toBe('100%');
    expect(formatProgressPercent(undefined)).toBe('—');
    expect(formatPercent(12.345, {decimals: 1})).toBe('12.3%');
    expect(formatPercent(12.35, {decimals: 1})).toBe('12.4%');
    expect(formatPercent(4, {signed: true})).toBe('+4%');
    expect(formatPercent(-0.2, {signed: true})).toBe('0%');
    expect(formatPercent(Number.NaN)).toBe('—');
    setDisplayLocale('de-DE');
    expect(formatProgressPercent(45)).toBe('45 %');
  });
  it('formatRounded: half up, grouped', () => {
    expect(formatRounded(1234.55, 1)).toBe('1,234.6');
    expect(formatRounded(null)).toBe('—');
  });
});
describe('currency: USD and EUR only, never an invented code (TK-014)', () => {
  it('writes USD and EUR as money', () => {
    expect(isAlphaCurrency('USD')).toBe(true); expect(isAlphaCurrency('GBP')).toBe(false); expect(isAlphaCurrency(undefined)).toBe(false);
    expect(formatCurrencyAmount('1500.75', 'EUR')).toBe('€1,500.75');
    expect(formatCurrencyAmount(12, 'USD')).toBe('$12.00');
  });
  it('any other code is the amount and the text typed; nothing at all is "—"', () => {
    expect(formatCurrencyAmount('40', 'XYZ')).toBe('40 XYZ');
    expect(formatCurrencyAmount('12.5', ' gbp ')).toBe('12.5 gbp');
    expect(formatCurrencyAmount('12.5', '')).toBe('—');
    expect(formatCurrencyAmount('abc', 'USD')).toBe('—');
    expect(formatCurrencyAmount(null, 'USD')).toBe('—');
    expect(formatCurrencyAmount(Number.POSITIVE_INFINITY, 'USD')).toBe('—');
  });
});
describe('dates: one short and one long style', () => {
  it('short is the medium date; long adds the weekday and the full month', () => {
    expect(formatDateShort('2026-10-17')).toBe(formatDate('2026-10-17'));
    expect(formatDateShort('2026-10-17')).toBe('Oct 17, 2026');
    expect(formatDateLong('2026-10-17')).toBe('Saturday, October 17, 2026');
    setDisplayLocale('en-GB');
    expect(formatDateLong('2026-10-17')).toMatch(/^Saturday,? 17 October 2026$/); // (ICU versions differ on the comma)
  });
});
