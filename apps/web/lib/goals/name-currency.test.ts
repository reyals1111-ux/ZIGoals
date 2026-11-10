import {describe, expect, it} from 'vitest';
import {currencyInName} from './name-currency';

describe('currencyInName (Session AL final pass, N-003)', () => {
  it('reads the euro from a sign, a code or the word', () => {
    expect(currencyInName('Save €5,000 crypto safety fund')).toBe('EUR');
    expect(currencyInName('5000 EUR holiday')).toBe('EUR');
    expect(currencyInName('A few euros for Lisbon')).toBe('EUR');
  });
  it('reads the dollar the same way', () => {
    expect(currencyInName('Save $5,000')).toBe('USD');
    expect(currencyInName('US$ 200 for a bike')).toBe('USD');
    expect(currencyInName('Ten thousand dollars')).toBe('USD');
  });
  it('says nothing when the name mentions neither, or both', () => {
    expect(currencyInName('Emergency fund')).toBeNull();
    expect(currencyInName('Europe trip')).toBeNull();
    expect(currencyInName('Neutral fund')).toBeNull();
    expect(currencyInName('€ and $ mix')).toBeNull();
    expect(currencyInName('')).toBeNull();
  });
});
