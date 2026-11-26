import {describe, expect, test} from 'vitest';
import {copyDateProblem, copyEntry, copyTags} from './copy';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import {totals} from './engine';
import {moneyTagsSchema} from '../money-tags/schema';

/** Session AW X7 (LEDGER #463): copy an entry — its fields, parts and both transfer sides, on today or a chosen day. */
const at = '2026-11-20T10:00:00.000Z', now = '2026-11-25T08:00:00.000Z', today = '2026-11-25';
const entry = (over: Partial<MoneyEntry>): MoneyEntry => ({id: 'e1', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Food & drink', date: '2026-11-20', createdAt: at, ...over});
const log = (...entries: MoneyEntry[]): MoneyLog => ({...emptyMoneyLog(), entries});
const ids = () => { let n = 0; return () => `copy-${++n}`; };

describe('copy an entry', () => {
  test('the copy keeps what it is and drops what belongs to the original only', () => {
    const e = entry({sub: 'Coffee', note: 'Café Noir', paidWith: 'debit', account: 'Main bank', share: '6.25', taxDeductible: true, spread: 2, excluded: true,
      parts: [{amount: '10.00', category: 'Food & drink'}, {amount: '2.50', category: 'Fun'}], history: [{at, by: 'you', field: 'amount', from: '10.00', to: '12.50'}],
      ref: 'BANK-1', checked: '2026-11-21', group: {id: 'g1', name: 'Trip'}, fine: true, source: 'zigi'});
    const out = copyEntry(log(e), 'e1', today, today, now, ids());
    expect(out.copies).toEqual([{id: 'copy-1', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Food & drink', sub: 'Coffee', note: 'Café Noir', paidWith: 'debit', account: 'Main bank', share: '6.25', taxDeductible: true, spread: 2, excluded: true,
      parts: [{amount: '10.00', category: 'Food & drink'}, {amount: '2.50', category: 'Fun'}], date: today, createdAt: now, source: 'form'}]);
    expect(out.log.entries).toHaveLength(2);
    expect(out.log.entries[0]).toBe(e);
    expect(() => moneyLogSchema.parse(out.log)).not.toThrow();
  });
  test('a chosen earlier day; never a later one', () => {
    expect(copyEntry(log(entry({})), 'e1', '2026-11-01', today, now, ids()).copies[0]!.date).toBe('2026-11-01');
    expect(copyDateProblem('2026-11-26', today)).toBe('Choose today or an earlier day.');
    expect(copyDateProblem('', today)).toBe('Choose the day for the copy.');
    expect(() => copyEntry(log(entry({})), 'e1', '2026-12-01', today, now, ids())).toThrow('Choose today or an earlier day.');
    expect(() => copyEntry(log(), 'e1', today, today, now, ids())).toThrow('no longer in your money log');
  });
  test('a transfer copies both sides, paired with each other, both left out of the figures', () => {
    const out_ = entry({id: 'out', category: 'Other', transfer: 'in', date: '2026-11-20'}), in_ = entry({id: 'in', kind: 'income', category: 'Other income', transfer: 'out', date: '2026-11-21'});
    const copied = copyEntry(log(out_, in_), 'in', today, today, now, ids());
    expect(copied.copies.map(c => [c.id, c.kind, c.transfer, c.date])).toEqual([['copy-1', 'income', 'copy-2', today], ['copy-2', 'expense', 'copy-1', today]]);
    expect(copied.pairs).toEqual([['in', 'copy-1'], ['out', 'copy-2']]);
    expect(totals(copied.log.entries, '2026-11-01', '2026-11-30')).toEqual([]);
  });
  test('a refund stays a refund (and lowers its category) but names no purchase', () => {
    const r = entry({id: 'r', kind: 'income', refund: true, refundOf: 'buy', category: 'Shopping', amount: '5.00'});
    const c = copyEntry(log(r), 'r', today, today, now, ids()).copies[0]!;
    expect(c.refund).toBe(true);
    expect(c.refundOf).toBeUndefined();
  });
  test('tags follow the copies', () => {
    const tags = moneyTagsSchema.parse({version: 1, tags: {in: ['holiday'], other: ['x']}});
    expect(copyTags(tags, [['in', 'copy-1'], ['out', 'copy-2']]).tags).toEqual({in: ['holiday'], other: ['x'], 'copy-1': ['holiday']});
    expect(copyTags(tags, [['none', 'copy-9']])).toBe(tags);
  });
});
