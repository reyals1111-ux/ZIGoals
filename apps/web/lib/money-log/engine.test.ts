import {describe, expect, test} from 'vitest';
import {addEntry, byCategory, cents, fromCents, monthOf, removeEntry, roomToSpend, totals, weekOf} from './engine';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry} from './schema';
import {showcaseMoneyLog} from './showcase';

const e = (id: string, date: string, amount: string, kind: 'expense' | 'income' = 'expense', category = 'Food & drink', currency = 'EUR'): MoneyEntry => ({id, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`});
describe('the expense log (Session AI)', () => {
  test('cents, both ways', () => { expect(cents('12.5')).toBe(1250); expect(fromCents(1250)).toBe('12.50'); expect(fromCents(-5)).toBe('-0.05'); });
  test('a week starts on the person\'s day', () => {
    expect(weekOf('2026-10-28', 'monday')).toEqual({start: '2026-10-26', end: '2026-11-01'});
    expect(weekOf('2026-10-28', 'sunday')).toEqual({start: '2026-10-25', end: '2026-10-31'});
  });
  test('totals per currency, never converted; categories by size', () => {
    const entries = [e('a', '2026-10-27', '10.00'), e('b', '2026-10-28', '5.25', 'expense', 'Transport'), e('c', '2026-10-28', '7.00', 'expense', 'Food & drink', 'USD'), e('d', '2026-10-28', '100', 'income', 'Salary')];
    expect(totals(entries, '2026-10-26', '2026-11-01')).toEqual([{currency: 'EUR', expenses: 1525, income: 10000, count: 3}, {currency: 'USD', expenses: 700, income: 0, count: 1}]);
    expect(byCategory(entries, '2026-10-26', '2026-11-01').map(r => [r.category, r.currency, r.total])).toEqual([['Food & drink', 'EUR', 1000], ['Food & drink', 'USD', 700], ['Transport', 'EUR', 525]]);
  });
  test('room to spend: the budget minus this week\'s spending in its currency', () => {
    const log = {...emptyMoneyLog(), budget: {weekly: '200.00', currency: 'EUR'}, entries: [e('a', '2026-10-26', '50.00'), e('b', '2026-10-28', '25.50'), e('c', '2026-10-25', '99.00'), e('d', '2026-10-28', '30', 'expense', 'Fun', 'USD')]};
    expect(roomToSpend(log, '2026-10-28')).toMatchObject({currency: 'EUR', budget: 20000, spent: 7550, left: 12450, daysLeft: 5});
    expect(roomToSpend(emptyMoneyLog(), '2026-10-28')).toBeNull();
  });
  test('add and remove keep the record valid', () => {
    const log = removeEntry(addEntry(emptyMoneyLog(), e('a', '2026-10-28', '1.00')), 'nope');
    expect(moneyLogSchema.safeParse(log).success).toBe(true);
    expect(log.currency).toBe('EUR');
  });
  test('the month runs first to last day', () => expect(monthOf('2026-02-10')).toEqual({start: '2026-02-01', end: '2026-02-28'}));
  test('the Showcase log is valid and has this week\'s room', () => {
    const log = showcaseMoneyLog('2026-10-28');
    expect(moneyLogSchema.safeParse(log).success).toBe(true);
    expect(roomToSpend(log, '2026-10-28')?.left).toBeGreaterThan(0);
    expect(log.entries.every(x => x.note?.includes('SHOWCASE DATA'))).toBe(true);
  });
  test('amounts above zero only, two decimals at most', () => {
    expect(moneyLogSchema.safeParse({version: 1, entries: [e('a', '2026-10-28', '0')]}).success).toBe(false);
    expect(moneyLogSchema.safeParse({version: 1, entries: [e('a', '2026-10-28', '1.234')]}).success).toBe(false);
  });
});
