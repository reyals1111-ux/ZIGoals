import {describe, expect, it} from 'vitest';
import {formatSignedMoney, moneyMagnitude} from './visual-format';
import {formatSignedGoalAmount} from './goal-summary';

// Session M, Part A2 (QA2-03, owner decision M3): money never reads a loss smaller than it is. Negative amounts are cut
// away from zero (toward −∞) at the currency's minor digits; positive amounts keep being cut toward zero. These are the
// helpers behind every caller that writes the sign itself: Portfolio's results (formatSignedMoney), and Wealth, a Goal's
// intelligence and Today (formatSignedGoalAmount, from base units converted before the sign is added).
const NBSP = ' ';

describe('moneyMagnitude', () => {
  it('cuts a loss away from zero and a gain toward zero, at the minor digits', () => {
    expect(moneyMagnitude('-12.349', 'USD')).toBe('12.35');
    expect(moneyMagnitude('12.349', 'USD')).toBe('12.34');
    expect(moneyMagnitude('-12.340', 'USD')).toBe('12.34');
    expect(moneyMagnitude('-0.001', 'EUR')).toBe('0.01');
    expect(moneyMagnitude('-1234.5', 'JPY')).toBe('1235');
    expect(moneyMagnitude('-1.2341', 'KWD')).toBe('1.235');
    expect(moneyMagnitude('+8', 'EUR')).toBe('8.00');
  });
  it('leaves what is not money, or not a decimal, as it was without its sign', () => {
    expect(moneyMagnitude('-1.1234567', 'ZIG')).toBe('1.1234567');
    expect(moneyMagnitude('-0.5', 'BTC')).toBe('0.5');
    expect(moneyMagnitude('-abc', 'USD')).toBe('abc');
  });
});

describe('Portfolio results (formatSignedMoney)', () => {
  it('QA2-03: a loss of −$12.349 shows −$12.35, a gain keeps its truncation, in four locales', () => {
    const cases = [
      ['en-US', '-12.349', 'USD', '−$12.35'], ['en-US', '12.349', 'USD', '+$12.34'], ['en-US', '0', 'USD', '+$0.00'],
      ['nl-BE', '-1234.561', 'EUR', `−€${NBSP}1.234,57`], ['nl-BE', '1234.569', 'EUR', `+€${NBSP}1.234,56`],
      ['de-DE', '-0.001', 'EUR', `−0,01${NBSP}€`], ['de-DE', '19.999', 'USD', `+19,99${NBSP}$`],
      ['ja-JP', '-1234.5', 'JPY', '−￥1,235'], ['ja-JP', '-12.349', 'USD', '−$12.35'],
    ] as const;
    for (const [locale, value, currency, expected] of cases) expect(formatSignedMoney(value, currency, locale), `${locale} ${value} ${currency}`).toBe(expected);
  });
});

describe('Wealth, Goal intelligence and Today (formatSignedGoalAmount)', () => {
  it('QA2-03: a negative total in money is never understated, in four locales; quantities are unchanged', () => {
    const cases = [
      ['en-US', true, '12.349', 'USD', '-$12.35'], ['en-US', false, '12.349', 'USD', '$12.34'],
      ['nl-BE', true, '1234.561', 'EUR', `-€${NBSP}1.234,57`], ['nl-BE', false, '1234.569', 'EUR', `€${NBSP}1.234,56`],
      ['de-DE', true, '0.001', 'EUR', `-0,01${NBSP}€`], ['de-DE', true, '1234.561', 'GBP', '-1.234,57 GBP'],
      ['ja-JP', true, '1234.56', 'JPY', '-1,235 JPY'], ['ja-JP', false, '1234.56', 'JPY', '1,234 JPY'],
      ['en-US', true, '1.1234567', 'ZIG', '-1.123456 ZIG'],
    ] as const;
    for (const [locale, negative, exact, currency, expected] of cases) expect(formatSignedGoalAmount(negative, exact, currency, locale), `${locale} ${negative ? '-' : ''}${exact} ${currency}`).toBe(expected);
  });
  it('Wealth totals in cents: −1,234.56 JPY (123,456 cents) shows −1,235 JPY, a gain 1,234 JPY', () => {
    expect(formatSignedGoalAmount(true, '1234.56', 'JPY', 'en-US')).toBe('-1,235 JPY');
    expect(formatSignedGoalAmount(false, '1234.56', 'JPY', 'en-US')).toBe('1,234 JPY');
  });
});
