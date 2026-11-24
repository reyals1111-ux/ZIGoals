import {describe, expect, test} from 'vitest';
import {applyReimport, changedOnReimport, refKey, setTransfer, transferPairs, withImportMarks, withRuleHistory} from './reimport';
import {emptyMoneyLog, type MoneyEntry} from '../money-log/schema';
import {totals} from '../money-log/engine';
import type {BankTransaction} from './types';
import {draftAlreadyLogged, fileDay, receiptMatches} from '../money-photos/match';

/** Session AV lane 2 (money; Monarch's re-import and activity log, YNAB's card payment match, Monarch's receipt match). */
const AT = '2026-11-22T10:00:00.000Z';
const row = (index: number, date: string, amount: string, direction: 'in' | 'out', payee: string, reference: string): BankTransaction => ({index, date, amount, currency: 'EUR', direction, payee, reference, description: ''});
let n = 0;
const e = (date: string, amount: string, more: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `r${n++}`, kind: 'expense', amount, currency: 'EUR', category: 'Other', date, createdAt: `${date}T10:00:00.000Z`, ...more});

describe('re-import', () => {
  test('an imported entry keeps its account and reference; a re-import updates the row the bank changed, with history', () => {
    const rows = [row(1, '2026-11-03', '12.50', 'out', 'Café', 'R-1'), row(2, '2026-11-04', '40.00', 'out', 'Market', '')];
    const marked = withImportMarks([e('2026-11-03', '12.50', {note: 'Café'}), e('2026-11-04', '40.00', {note: 'Market'})], [1, 2], rows, 'NL01 BANK 0001');
    expect(marked[0]).toMatchObject({account: 'NL01 BANK 0001', ref: 'out|EUR|R-1'});
    expect(marked[1]!.ref).toBeUndefined();
    expect(refKey(rows[1]!)).toBeNull();
    const log = {...emptyMoneyLog(), entries: marked};
    const again = [row(1, '2026-11-03', '13.50', 'out', 'Café Noël', 'R-1'), row(2, '2026-11-04', '40.00', 'out', 'Market', '')];
    const changed = changedOnReimport(again, log);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({amount: '13.50', note: 'Café Noël'});
    const updated = applyReimport(log, changed, AT).entries[0]!;
    expect(updated).toMatchObject({id: marked[0]!.id, amount: '13.50', note: 'Café Noël'});
    expect(updated.history!.map(h => `${h.by}:${h.field}:${h.from}→${h.to}`)).toEqual(['import:amount:12.50→13.50', 'import:note:Café→Café Noël']);
    expect(changedOnReimport(again, applyReimport(log, changed, AT))).toEqual([]);
  });
  test('a rule\'s change is in the entry\'s history', () => {
    const before = e('2026-11-03', '5.00', {category: 'Other'}), after = {...before, category: 'Groceries'};
    expect(withRuleHistory([after], [{id: before.id, ruleId: 'r', before, after}], AT)[0]!.history).toEqual([{at: AT, by: 'rule', field: 'category', from: 'Other', to: 'Groceries'}]);
  });
});

describe('card payments across two files', () => {
  test('the same amount out of one account and into another within 5 days pairs up; marked, neither counts', () => {
    const out = e('2026-11-10', '450.00', {account: 'Checking', note: 'Card payment'}), into = e('2026-11-12', '450.00', {kind: 'income', account: 'Credit card', category: 'Other income'});
    const far = e('2026-11-25', '450.00', {kind: 'income', account: 'Credit card'}), same = e('2026-11-11', '450.00', {kind: 'income', account: 'Checking'});
    const pairs = transferPairs([out, into, far, same]);
    expect(pairs.map(p => [p.out.id, p.in.id, p.days])).toEqual([[out.id, into.id, 2]]);
    expect(transferPairs([out, into], new Set(['nothing']))).toEqual([]);
    const log = setTransfer({...emptyMoneyLog(), entries: [out, into]}, out.id, into.id, true, AT);
    expect(log.entries.map(x => x.transfer)).toEqual([into.id, out.id]);
    expect(totals(log.entries, '2026-11-01', '2026-11-30')).toEqual([]);
    expect(transferPairs(log.entries)).toEqual([]);
    const back = setTransfer(log, out.id, into.id, false, AT);
    expect(back.entries.every(x => x.transfer === undefined)).toBe(true);
    expect(back.entries[0]!.history).toHaveLength(2);
  });
});

describe('receipts matched to entries', () => {
  const lunch = e('2026-11-10', '12.50', {note: 'Lunch'}), shop = e('2026-11-11', '40.00', {note: 'Market'}), old = e('2026-10-01', '12.50');
  test('a week either side, the same amount first, then the nearest day', () => {
    expect(receiptMatches([lunch, shop, old], {date: '2026-11-11'}).map(m => m.entry.id)).toEqual([shop.id, lunch.id]);
    expect(receiptMatches([lunch, shop, old], {date: '2026-11-11', cents: 1250})[0]).toMatchObject({entry: lunch, sameAmount: true});
    expect(draftAlreadyLogged([lunch, shop], {amount: '12.50', date: '2026-11-12'})).toBe(lunch);
    expect(draftAlreadyLogged([lunch, shop], {amount: '12.50', date: '2026-11-20'})).toBeNull();
    expect(draftAlreadyLogged([lunch], {amount: '9.00', date: '2026-11-10'})).toBeNull();
    expect(fileDay(new Date(2026, 10, 9, 15).getTime())).toBe('2026-11-09');
  });
});
