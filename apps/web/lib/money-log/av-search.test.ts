import {describe, expect, it} from 'vitest';
import {searchEntries, usedCategories} from './search';
import {summarizeSelection} from './selection';
import type {MoneyEntry} from './schema';

/** Session AV (owner follow-up 1, F-MONEY-SEARCH): the whole money log, searched and filtered, with the total. */
let n = 0;
const e = (date: string, amount: string, category: string, note?: string, kind: 'expense' | 'income' = 'expense', currency = 'EUR'): MoneyEntry => ({id: `s${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
const LOG = [e('2026-09-02', '12.50', 'Dining', 'Café Noël with Sam'), e('2026-10-14', '40.00', 'Groceries', 'Weekly shop'), e('2026-11-03', '9.99', 'Subscriptions', 'Fictional music'),
  e('2026-11-05', '2000.00', 'Salary', undefined, 'income'), e('2026-11-06', '15.00', 'Dining', 'cafe on the corner', 'expense', 'USD')];
describe('Session AV (F-MONEY-SEARCH)', () => {
  it('words in the category, the note or the amount, case and accents aside; newest first', () => {
    expect(searchEntries(LOG, {text: 'cafe'}).map(x => x.note)).toEqual(['cafe on the corner', 'Café Noël with Sam']);
    expect(searchEntries(LOG, {text: 'dining sam'}).map(x => x.note)).toEqual(['Café Noël with Sam']);
    expect(searchEntries(LOG, {text: '9,99'}).map(x => x.category)).toEqual(['Subscriptions']);
  });
  it('spending or income, a category and a date range; the total per currency', () => {
    expect(searchEntries(LOG, {kind: 'income'}).map(x => x.category)).toEqual(['Salary']);
    const dining = searchEntries(LOG, {category: 'dining', from: '2026-09-01', to: '2026-11-30'});
    expect(dining).toHaveLength(2);
    expect(summarizeSelection(dining, dining.map(x => x.id)).totals.map(t => [t.currency, t.cents])).toEqual([['EUR', -1250], ['USD', -1500]]);
    expect(searchEntries(LOG, {from: '2026-11-01', to: '2026-11-05'}).map(x => x.date)).toEqual(['2026-11-05', '2026-11-03']);
    expect(usedCategories(LOG)).toEqual(['Dining', 'Groceries', 'Salary', 'Subscriptions']);
  });
});
