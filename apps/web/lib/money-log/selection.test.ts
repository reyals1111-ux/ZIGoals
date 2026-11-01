import {describe, expect, test} from 'vitest';
import {selectionLine, signedMoney, summarizeSelection} from './selection';
import type {MoneyEntry} from './schema';

const e = (id: string, amount: string, kind: 'expense' | 'income' = 'expense', currency = 'EUR', extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind, amount, currency, category: 'Other', date: '2026-10-30', createdAt: '2026-10-30T10:00:00.000Z', ...extra});
const fmt = (cents: number, currency: string) => new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(cents / 100);

describe('BUILD list 2 #7: the running total of selected entries', () => {
  test('decimals add up exactly (no floating point drift)', () => {
    const entries = [e('a', '0.10'), e('b', '0.20'), e('c', '84.20', 'income'), e('d', '19.99'), e('e', '0.01')];
    const s = summarizeSelection(entries, ['a', 'b', 'd', 'e']);
    expect(s.totals).toEqual([{currency: 'EUR', cents: -2030, expenses: 4, income: 0}]);
    const many = Array.from({length: 1000}, (_, i) => e(`x${i}`, '0.10'));
    expect(summarizeSelection(many, many.map(x => x.id)).totals[0]!.cents).toBe(-10000);
  });
  test('the spec\'s line: two expenses and one income in one currency', () => {
    const entries = [e('a', '50.00'), e('b', '44.20'), e('c', '10.00', 'income')];
    const s = summarizeSelection(entries, new Set(['a', 'b', 'c']));
    expect(selectionLine(s, fmt)).toBe('3 selected · −€84.20 (2 expenses, 1 income)');
  });
  test('mixed currencies are named apart, never converted', () => {
    const entries = [e('a', '50.00'), e('b', '30.00'), e('c', '4.20', 'income', 'USD')];
    const s = summarizeSelection(entries, ['a', 'b', 'c']);
    expect(s.totals.map(t => [t.currency, t.cents])).toEqual([['EUR', -8000], ['USD', 420]]);
    expect(selectionLine(s, fmt)).toBe('3 selected · 2 currencies: −€80.00 and +US$4.20 (2 expenses, 1 income)');
    const three = summarizeSelection([...entries, e('d', '1.00', 'expense', 'GBP')], ['a', 'c', 'd']);
    expect(selectionLine(three, fmt)).toBe('3 selected · 3 currencies: −€50.00, −£1.00 and +US$4.20 (2 expenses, 1 income)');
  });
  test('a split entry counts once, whole', () => {
    const split = e('a', '100.00', 'expense', 'EUR', {parts: [{amount: '70.00'}, {amount: '30.00', category: 'Home'}]});
    const s = summarizeSelection([split, split], ['a']);
    expect(s.count).toBe(1);
    expect(s.totals[0]!.cents).toBe(-10000);
  });
  test('nothing selected, an id that is gone, a zero sum', () => {
    expect(selectionLine(summarizeSelection([e('a', '1.00')], []), fmt)).toBe('Nothing selected');
    expect(summarizeSelection([e('a', '1.00')], ['gone']).count).toBe(0);
    const zero = summarizeSelection([e('a', '5.00'), e('b', '5.00', 'income')], ['a', 'b']);
    expect(selectionLine(zero, fmt)).toBe('2 selected · €0.00 (1 expense, 1 income)');
    expect(signedMoney(-1, 'EUR', fmt)).toBe('−€0.01');
  });
});
