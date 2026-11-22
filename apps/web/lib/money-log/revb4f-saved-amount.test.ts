import {describe, expect, test} from 'vitest';
import {fromQuestion, questionEntries, toQuestion} from './saved-searches';
import {searchEntries} from './search';
import type {MoneyEntry} from './schema';

/**
 * Review b4f #4 (Major): "Save this search" reads the amount range exactly as the search does (parseNumberInput: Dutch
 * and grouped forms), and refuses in words an amount it cannot read instead of dropping it.
 */
const state = (min: string, max = '') => ({query: {text: '', kind: 'expense' as const, category: '', from: '', to: '', not: '', payee: '', counted: 'all' as const, tax: false, paidWith: '', sub: ''}, min, max, tag: ''});
const e = (amount: string): MoneyEntry => ({id: `m${amount}`, kind: 'expense', amount, currency: 'EUR', category: 'Home', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z'});

describe('review b4f #4: the saved amount range is the one searched', () => {
  test('Dutch, grouped and plain forms are kept as two decimals', () => {
    expect(toQuestion('q', 'Big', state('1.250,00')).min).toBe('1250.00');
    expect(toQuestion('q', 'Big', state('1,250.00')).min).toBe('1250.00');
    expect(toQuestion('q', 'Mid', state('12,5', '99')).max).toBe('99.00');
    expect(toQuestion('q', 'Mid', state('12,5')).min).toBe('12.50');
    expect(toQuestion('q', 'Any', state('0')).min).toBeUndefined();
  });
  test('what the saved search finds is what the search found', () => {
    const entries = [e('900.00'), e('1250.00'), e('3000.00')], q = toQuestion('q', 'Big', state('1.250,00'));
    expect(questionEntries(entries, q).map(x => x.amount)).toEqual(searchEntries(entries, {minCents: 125_000}).map(x => x.amount));
    expect(fromQuestion(q).min).toBe('1250.00');
  });
  test('an amount it cannot read is refused in words, never dropped', () => {
    expect(() => toQuestion('q', 'Odd', state('twelve'))).toThrow('The amount from “twelve” cannot be read: type it as a number, for example 50 or 12,50.');
    expect(() => toQuestion('q', 'Odd', state('', '1,234'))).toThrow('The amount up to “1,234” cannot be read'); // ambiguous: the search leaves it out too, and says so
    expect(() => toQuestion('q', 'Odd', state('', '1.2345'))).toThrow('The amount up to “1.2345” cannot be read');
  });
});
