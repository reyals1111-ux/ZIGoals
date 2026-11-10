import {describe, expect, it} from 'vitest';
import {parseNumberInput} from '../numbers/parse';

// Session AL (3f, TK-003: "1500,75" was saved as 1,500.00): one reader for every typed number.
const read = (raw: string | number, o = {}) => parseNumberInput(raw, o);
describe('parseNumberInput', () => {
  it('reads decimal commas, grouping, spaces and apostrophes the one way they can be read', () => {
    const cases: [string, number, string][] = [
      ['1.234,56', 1234.56, '1234.56'], ['1,234.56', 1234.56, '1234.56'], ['1234,5', 1234.5, '1234.5'], ['0,5', 0.5, '0.5'],
      ['1500,75', 1500.75, '1500.75'], [',5', 0.5, '0.5'], ['.5', 0.5, '0.5'], ['1 234,56', 1234.56, '1234.56'],
      ['1 234,56', 1234.56, '1234.56'], ['1 234', 1234, '1234'], ["1'234.50", 1234.5, '1234.50'], ['1’234', 1234, '1234'],
      ['1,234,567', 1234567, '1234567'], ['1.234.567', 1234567, '1234567'], ['  72.5  ', 72.5, '72.5'], ['0,125', 0.125, '0.125'],
      ['1.234', 1.234, '1.234'], ['007', 7, '007'],
    ];
    for (const [raw, value, text] of cases) expect(read(raw, {locale: 'en-US'}), raw).toEqual({ok: true, value, text, error: null});
  });
  it('refuses ambiguous text with a sentence, never a guess', () => {
    expect(read('1,234').error).toMatch(/could mean 1234 or 1\.234/);
    expect(read('1.234', {locale: 'de-DE'}).error).toMatch(/could mean 1234 or 1\.234/);
    expect(read('1234.567,8').error).toMatch(/mixes separators/);
    expect(read('12 34').error).toMatch(/mixes separators|Enter a number/);
  });
  it('refuses empty, words, exponents and (unless allowed) signs', () => {
    expect(read('').error).toBe('Enter a number.');
    expect(read('   ').ok).toBe(false);
    expect(read('abc').error).toMatch(/Enter a number/);
    expect(read('1e5').error).toMatch(/plain number/);
    expect(read('-5').error).toMatch(/not negative/);
    expect(read('−2,5', {allowNegative: true})).toMatchObject({ok: true, value: -2.5, text: '-2.5'});
    expect(read('-0', {allowNegative: true})).toMatchObject({ok: true, value: 0, text: '0'});
    expect(read('1'.repeat(31)).error).toMatch(/30 digits/);
    expect(read('$5').ok).toBe(false);
  });
  it('a decimal comma can be turned off; grouping commas still read', () => {
    expect(read('0,5', {allowDecimalComma: false}).error).toMatch(/point for decimals/);
    expect(read('1,234.5', {allowDecimalComma: false}).value).toBe(1234.5);
  });
  it('numbers from a card pass through, never in exponent notation', () => {
    expect(read(0.0000001)).toMatchObject({ok: true, value: 1e-7, text: '0.0000001'});
    expect(read(Number.NaN).ok).toBe(false);
    expect(read(-1).ok).toBe(false);
  });
});
