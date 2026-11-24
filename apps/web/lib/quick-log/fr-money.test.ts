import {describe, expect, test} from 'vitest';
import {quickLogItems, type QuickLogContext} from './multi';

// Session AV lane 2 (fr-money, FR-L-15, the friend-readiness walk's Lina): a category word and a price is spending.
const ctx: QuickLogContext = {habits: [], counters: [], waterUnit: 'ml', weightUnit: 'kg', goals: [], foods: [], expenses: true, now: new Date('2026-11-24T12:30:00')};
const one = (line: string, lang: 'en' | 'nl' = 'nl') => quickLogItems(line, ctx, lang)[0]?.action ?? null;
describe('a price beside a category word', () => {
  test('"boodschappen 23,10" and "23,10 boodschappen" are an expense of €23.10, as "€8,40 koffie" was', () => {
    expect(one('boodschappen 23,10')).toMatchObject({kind: 'log-expense', amount: 23.1, currency: 'EUR', note: 'boodschappen'});
    expect(one('23,10 boodschappen')).toMatchObject({kind: 'log-expense', amount: 23.1, note: 'boodschappen'});
    expect(one('groceries 23.10', 'en')).toMatchObject({kind: 'log-expense', amount: 23.1});
    expect(one('€8,40 koffie')).toMatchObject({kind: 'log-expense', amount: 8.4});
  });
  test('a measure or a word that is no category stays as it was', () => {
    expect(one('gewicht 78,40')).toMatchObject({kind: 'log-weight'});
    expect(one('markt 2,50 km')?.kind).not.toBe('log-expense');
    expect(one('hallo 23,10')?.kind ?? null).not.toBe('log-expense');
  });
});
