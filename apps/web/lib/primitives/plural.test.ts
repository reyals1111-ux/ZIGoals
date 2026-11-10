import {describe, expect, it} from 'vitest';
import {countText, plural, unitAmountText, unitFor} from '../plural';

describe('plurals and unit words (DV-014)', () => {
  it('countText: only exactly one is singular; numbers grouped', () => {
    expect(countText(0, 'book')).toBe('0 books');
    expect(countText(1, 'book')).toBe('1 book');
    expect(countText(-1, 'day')).toBe('-1 day');
    expect(countText(1.5, 'hour')).toBe('1.5 hours');
    expect(countText(2500, 'step')).toBe('2,500 steps');
    expect(countText(1, 'entry', 'entries')).toBe('1 entry');
    expect(countText(2, 'entry', 'entries')).toBe('2 entries');
    expect(countText(Number.NaN, 'book')).toBe('— books');
    expect(plural(1, 'goal')).toBe('goal');
  });
  it('a custom Goal unit is the word, never a currency or token symbol', () => {
    expect(unitAmountText(20, 'books')).toBe('20 books');
    expect(unitAmountText(1, 'books')).toBe('1 book');
    expect(unitAmountText(1, 'push-ups')).toBe('1 push-ups');
    expect(unitAmountText(3, '  km ')).toBe('3 km');
    expect(unitAmountText(1234.5, '')).toBe('1,234.5');
    expect(unitAmountText(20, 'books')).not.toMatch(/ZIG|\$|€/);
    expect(unitFor(1, 'Books')).toBe('Books');
  });
});
