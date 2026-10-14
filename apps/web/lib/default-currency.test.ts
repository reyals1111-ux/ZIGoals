import {describe, expect, test} from 'vitest';
import {defaultCurrency, localeRegion} from './default-currency';
import {numberSeparators, parseAmountInput, parseLocaleAmount, amountInputPreview} from './amount-input';

// Session AB-Cloud Part 8 (ADR-023 C25): grouped amounts read when they read one way only; the device's default currency.
describe('grouped amounts', () => {
  test('grouping that reads one way only is read on any device, and saved exactly as the plain text', () => {
    for (const locale of ['en-US', 'nl-NL', 'fr-FR', 'de-CH']) {
      expect(parseAmountInput('3,250.50', 2, locale)).toBe(325050n);
      expect(parseAmountInput('3.250,50', 2, locale)).toBe(325050n);
      expect(parseAmountInput('1,234,567', 2, locale)).toBe(123456700n);
      expect(parseAmountInput('1.234.567', 0, locale)).toBe(1234567n);
      expect(parseAmountInput('1 234,56', 2, locale)).toBe(123456n);
      expect(parseAmountInput('1 234,56', 2, locale)).toBe(123456n);
      expect(parseAmountInput("1'234.50", 2, locale)).toBe(123450n);
    }
    expect(amountInputPreview('3,250.50', 2, 'en-US')).toEqual({text: '3250.50'});
    expect(parseLocaleAmount(' 12,345,678.9 ')).toBe('12345678.9');
  });
  test('ambiguous input is never guessed: "1,234" everywhere, and "1.234" where "." groups thousands', () => {
    for (const locale of ['en-US', 'nl-NL']) expect(() => parseAmountInput('1,234', 2, locale)).toThrow('“1,234” could mean 1234 or 1.234');
    expect(numberSeparators('nl-NL')).toEqual({group: '.', decimal: ','});
    expect(() => parseAmountInput('1.234', 3, 'nl-NL')).toThrow('“1.234” could mean 1234 or 1.234. Type it without a thousands separator.');
    expect(parseAmountInput('1.234', 3, 'en-US')).toBe(1234n);
    // A leading zero is a decimal on every device; malformed grouping is left for the strict reader to refuse.
    expect(parseAmountInput('0.125', 3, 'nl-NL')).toBe(125n);
    for (const bad of ['1,23,456', '12,34.5', '1.23.456', '1,234.5,6']) expect(() => parseAmountInput(bad, 2, 'en-US'), bad).toThrow();
  });
});

describe('the default currency', () => {
  test('euro for a euro-area region, US dollars otherwise or when unknown; the first language with a region decides', () => {
    expect(defaultCurrency(['nl-NL'])).toBe('EUR'); expect(defaultCurrency(['fr-BE'])).toBe('EUR'); expect(defaultCurrency(['de-AT'])).toBe('EUR');
    expect(defaultCurrency(['en-US'])).toBe('USD'); expect(defaultCurrency(['en-GB'])).toBe('USD'); expect(defaultCurrency(['de-CH'])).toBe('USD');
    expect(localeRegion('nl')).toBe('NL'); expect(defaultCurrency(['nl'])).toBe('EUR');
    expect(defaultCurrency(['not a locale', 'pt-PT'])).toBe('EUR');
    expect(defaultCurrency([])).toBe('USD');
  });
});
