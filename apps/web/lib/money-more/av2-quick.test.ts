import {describe, expect, test} from 'vitest';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry} from '../money-log/schema';
import {byCategory, totals} from '../money-log/engine';
import {budgetMonthParts, mineCents, mineParts} from '../money-log/counted';
import {searchEntries} from '../money-log/search';
import {monthView} from '../budgets/engine';
import {addSub, byPaidWith, bySub, categoryPath, entryFromSaved, moveSaved, removeSub, subsOf, withSaved, withoutSaved} from './quick';
import {emptyMoneyMore, moneyMoreSchema} from './schema';

/** Session AV lane 2, round 2 (money; Wallet's record templates and payment types, Emma's subcategories and split). */
const at = '2026-11-20T10:00:00.000Z';
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: 'x', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', date: '2026-11-10', createdAt: at, ...over});

describe('saved entries', () => {
  test('kept by name (the same name replaced), at most 20, removed and moved; one tap makes an ordinary entry dated today', () => {
    let m = withSaved(emptyMoneyMore(), {name: ' Coffee ', kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Food & drink', sub: 'Coffee', paidWith: 'debit'}, 's1');
    m = withSaved(m, {name: 'coffee', kind: 'expense', amount: '3.50', currency: 'EUR', category: 'Food & drink'}, 's2');
    expect(m.saved).toEqual([{id: 's1', name: 'coffee', kind: 'expense', amount: '3.50', currency: 'EUR', category: 'Food & drink'}]);
    m = withSaved(m, {name: 'Bus', kind: 'expense', amount: '2.00', currency: 'EUR', category: 'Transport', paidWith: 'cash'}, 's3');
    expect(moveSaved(m, 's3', -1).saved!.map(s => s.id)).toEqual(['s3', 's1']);
    expect(moneyMoreSchema.parse(m)).toEqual(m);
    const entry = entryFromSaved(m.saved![1]!, '2026-11-22', 'n1', at);
    expect(entry).toEqual({id: 'n1', kind: 'expense', amount: '2.00', currency: 'EUR', category: 'Transport', date: '2026-11-22', createdAt: at, source: 'form', paidWith: 'cash'});
    expect(withoutSaved(withoutSaved(m, 's1'), 's3')).toEqual({version: 1});
    let full = emptyMoneyMore();
    for (let i = 0; i < 20; i++) full = withSaved(full, {name: `n${i}`, kind: 'expense', amount: '1.00', currency: 'EUR', category: 'Other'}, `id${i}`);
    expect(() => withSaved(full, {name: 'one more', kind: 'expense', amount: '1.00', currency: 'EUR', category: 'Other'}, 'z')).toThrow('Up to 20');
    expect(() => withSaved(full, {name: ' ', kind: 'expense', amount: '1.00', currency: 'EUR', category: 'Other'}, 'z')).toThrow('Give the saved entry a name');
  });
});

describe('paid with', () => {
  test('the month by method, counted entries only, unmarked apart, each currency on its own; and the search filter', () => {
    const list = [e({id: 'a', paidWith: 'cash', amount: '5.00'}), e({id: 'b', paidWith: 'credit', amount: '40.00'}), e({id: 'c', amount: '7.00'}), e({id: 'd', paidWith: 'cash', excluded: true}), e({id: 'f', paidWith: 'cash', currency: 'USD', amount: '2.00'}), e({id: 'g', paidWith: 'cash', date: '2026-10-30'})];
    expect(byPaidWith(list, '2026-11-01', '2026-11-30')).toEqual([
      {method: 'credit', currency: 'EUR', cents: 4000, count: 1}, {method: 'cash', currency: 'EUR', cents: 500, count: 1}, {method: 'unmarked', currency: 'EUR', cents: 700, count: 1}, {method: 'cash', currency: 'USD', cents: 200, count: 1}]);
    expect(searchEntries(list, {paidWith: 'cash'}).map(x => x.id).sort()).toEqual(['a', 'd', 'f', 'g']);
    expect(searchEntries(list, {paidWith: 'unmarked'}).map(x => x.id)).toEqual(['c']);
  });
});

describe('subcategories', () => {
  test('kept per category, at most 20, removed from the choices only; rolled up into the main category, shown apart', () => {
    let log = addSub(emptyMoneyLog(), 'Food & drink', ' Coffee ');
    log = addSub(log, 'food & drink', 'Lunch');
    expect(subsOf(log, 'Food & Drink')).toEqual(['Coffee', 'Lunch']);
    expect(() => addSub(log, 'Food & drink', 'coffee')).toThrow('already under');
    expect(() => addSub(log, 'Food & drink', 'Food & drink')).toThrow('the category itself');
    expect(removeSub(removeSub(log, 'Food & drink', 'Coffee'), 'Food & drink', 'Lunch').subs).toEqual({});
    const list = [e({id: 'a', sub: 'Coffee', amount: '3.00'}), e({id: 'b', sub: 'Coffee', amount: '2.50'}), e({id: 'c', sub: 'Lunch', amount: '12.00'}), e({id: 'd', amount: '8.00'})];
    expect(byCategory(list, '2026-11-01', '2026-11-30')).toEqual([{category: 'Food & drink', currency: 'EUR', total: 2550, count: 4}]);
    expect(bySub(list, 'Food & drink', '2026-11-01', '2026-11-30', mineParts)).toEqual([{sub: 'Lunch', currency: 'EUR', cents: 1200, count: 1}, {sub: 'Coffee', currency: 'EUR', cents: 550, count: 2}, {sub: null, currency: 'EUR', cents: 800, count: 1}]);
    expect(categoryPath(list[0]!)).toBe('Food & drink › Coffee');
    expect(searchEntries(list, {text: 'coffee'}).map(x => x.id).sort()).toEqual(['a', 'b']);
    expect(searchEntries(list, {sub: 'Lunch'}).map(x => x.id)).toEqual(['c']);
    expect(moneyLogSchema.parse({...log, entries: list}).entries[0]!.sub).toBe('Coffee');
  });
});

describe('my share of a shared cost', () => {
  test('spending figures and budgets count the share; a share above the amount or missing counts the whole', () => {
    const dinner = e({id: 'a', amount: '60.00', share: '20.00', parts: [{amount: '45.00', category: 'Food & drink'}, {amount: '15.00', category: 'Fun'}]});
    expect(mineCents(dinner)).toBe(2000);
    expect(mineCents(e({share: '99.00'}))).toBe(1000);
    expect(mineParts(dinner)).toEqual([{cents: 1500, category: 'Food & drink'}, {cents: 500, category: 'Fun'}]);
    expect(mineParts(e({amount: '10.00', share: '3.33', parts: [{amount: '5.00'}, {amount: '5.00', category: 'Fun'}]})).reduce((s, p) => s + p.cents, 0)).toBe(333);
    expect(totals([dinner], '2026-11-01', '2026-11-30')[0]).toMatchObject({expenses: 2000});
    expect(budgetMonthParts({...dinner, spread: 2}, '2026-11').reduce((s, p) => s + p.cents, 0)).toBe(1000);
    const view = monthView([dinner], {version: 1, budgets: [{id: 'b', category: 'Food & drink', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]}, '2026-11', '2026-11-22');
    expect(view.rows[0]).toMatchObject({spent: 1500, left: 8500});
  });
});
