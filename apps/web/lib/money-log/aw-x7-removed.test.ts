import {describe, expect, test} from 'vitest';
import {KEEP_DAYS, MAX_REMOVED, MONEY_REMOVED, daysLeft, emptyMoneyRemoved, emptyRemoved, goneOn, keepRemoved, moneyRemovedSchema, putBack, recentlyRemoved, type MoneyRemoved} from './removed';
import {emptyMoneyLog, type MoneyEntry, type MoneyLog} from './schema';
import {totals} from './engine';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';

/** Session AW X7 (LEDGER #461): Removed recently — kept 30 days, Put back with its twin and links, Empty now, per space. */
const now = new Date('2026-11-25T10:00:00.000Z'), at = now.toISOString();
const entry = (over: Partial<MoneyEntry>): MoneyEntry => ({id: 'e1', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Groceries', date: '2026-11-24', createdAt: at, ...over});
const log = (...entries: MoneyEntry[]): MoneyLog => ({...emptyMoneyLog(), entries});
const removeFrom = (l: MoneyLog, bin: MoneyRemoved, e: MoneyEntry, space: 'personal' | 'business' = 'personal', when = now) => ({bin: keepRemoved(bin, space, e, l, when), log: {...l, entries: l.entries.filter(x => x.id !== e.id)}});
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);

describe('keeping and listing', () => {
  test('a removed entry is kept with its split parts and marks, listed newest first, and counts in no figure', () => {
    const split = entry({id: 'split', parts: [{amount: '5.00', category: 'Groceries'}, {amount: '7.50', category: 'Home'}], note: 'Market', taxDeductible: true});
    const a = removeFrom(log(split, entry({id: 'other'})), emptyMoneyRemoved(), split);
    const b = removeFrom(a.log, a.bin, a.log.entries[0]!, 'personal', new Date(now.getTime() + 1000));
    expect(recentlyRemoved(b.bin, 'personal', b.log, later(0.1)).map(i => i.entry.id)).toEqual(['other', 'split']);
    expect(b.bin.items.find(i => 'entry' in i && (i as {entry: MoneyEntry}).entry.id === 'split')).toMatchObject({entry: {parts: [{amount: '5.00'}, {amount: '7.50'}], taxDeductible: true, note: 'Market'}});
    expect(totals(b.log.entries, '2026-11-01', '2026-11-30')).toEqual([]);
  });
  test('30 days, then gone; days left and the day it goes', () => {
    const a = removeFrom(log(entry({})), emptyMoneyRemoved(), entry({}));
    const item = recentlyRemoved(a.bin, 'personal', a.log, now)[0]!;
    expect(daysLeft(item, now)).toBe(KEEP_DAYS);
    expect(daysLeft(item, later(29.5))).toBe(1);
    expect(goneOn(item)).toBe('2026-12-25');
    expect(recentlyRemoved(a.bin, 'personal', a.log, later(29.9))).toHaveLength(1);
    expect(recentlyRemoved(a.bin, 'personal', a.log, later(30))).toEqual([]);
    // The next keep drops what is past its days.
    const b = removeFrom(log(entry({id: 'n'})), a.bin, entry({id: 'n'}), 'personal', later(31));
    expect(b.bin.items).toHaveLength(1);
  });
  test('an entry the toast put back is not listed, and is dropped on the next change', () => {
    const a = removeFrom(log(entry({}), entry({id: 'x'})), emptyMoneyRemoved(), entry({}));
    const undone = log(entry({}), entry({id: 'x'}));
    expect(recentlyRemoved(a.bin, 'personal', undone, now)).toEqual([]);
    const b = removeFrom(undone, a.bin, entry({id: 'x'}));
    expect(b.bin.items.map(i => (i as {entry: MoneyEntry}).entry.id)).toEqual(['x']);
  });
  test('each space keeps its own; Empty now clears one space only', () => {
    const p = removeFrom(log(entry({id: 'p'})), emptyMoneyRemoved(), entry({id: 'p'}));
    const b = removeFrom(log(entry({id: 'b'})), p.bin, entry({id: 'b'}), 'business');
    expect(recentlyRemoved(b.bin, 'personal', log(), now).map(i => i.entry.id)).toEqual(['p']);
    expect(recentlyRemoved(b.bin, 'business', log(), now).map(i => i.entry.id)).toEqual(['b']);
    const emptied = emptyRemoved(b.bin, 'personal');
    expect(recentlyRemoved(emptied, 'personal', log(), now)).toEqual([]);
    expect(recentlyRemoved(emptied, 'business', log(), now).map(i => i.entry.id)).toEqual(['b']);
  });
  test('the cap keeps the newest', () => {
    let bin = emptyMoneyRemoved();
    for (let i = 0; i < MAX_REMOVED + 3; i++) bin = keepRemoved(bin, 'personal', entry({id: `e${i}`}), log(entry({id: `e${i}`})), now);
    expect(bin.items).toHaveLength(MAX_REMOVED);
    expect((bin.items[0] as {entry: MoneyEntry}).entry.id).toBe('e3');
  });
});

describe('Put back', () => {
  test('the entry returns to its space exactly as it was, and leaves the list', () => {
    const e = entry({parts: [{amount: '2.50', category: 'Fun'}, {amount: '10.00', category: 'Groceries'}], history: [{at, by: 'you', field: 'amount', from: '10.00', to: '12.50'}]});
    const a = removeFrom(log(e, entry({id: 'keep'})), emptyMoneyRemoved(), e);
    const back = putBack(a.log, a.bin, 'personal', 'e1', later(2));
    expect(back.log.entries.map(x => x.id)).toEqual(['keep', 'e1']);
    expect(back.log.entries[1]).toEqual(e);
    expect(recentlyRemoved(back.bin, 'personal', back.log, later(2))).toEqual([]);
    expect(() => putBack(back.log, back.bin, 'personal', 'e1', later(2))).toThrow('no longer in Removed recently');
  });
  test('a transfer: both sides removed come back together; one side relinks its twin', () => {
    const out = entry({id: 'out', transfer: 'in'}), into = entry({id: 'in', kind: 'income', category: 'Other income', transfer: 'out'});
    const a = removeFrom(log(out, into), emptyMoneyRemoved(), out);
    const b = removeFrom(a.log, a.bin, into);
    const both = putBack(b.log, b.bin, 'personal', 'out', now);
    expect(both.log.entries.map(x => [x.id, x.transfer])).toEqual([['out', 'in'], ['in', 'out']]);
    expect(both.bin.items).toEqual([]);
    // Only one side removed, and its twin lost the mark meanwhile (Not a transfer, Check and tidy): linked again.
    const c = removeFrom(log(out, into), emptyMoneyRemoved(), out), cut = {...c.log, entries: c.log.entries.map(x => ({...x, transfer: undefined}))};
    const one = putBack(cut, c.bin, 'personal', 'out', now);
    expect(one.relinked).toBe(1);
    expect(one.log.entries.find(x => x.id === 'in')!.transfer).toBe('out');
  });
  test('a twin paired with another entry since, or gone: the entry comes back as an entry alone', () => {
    const out = entry({id: 'out', transfer: 'in'}), into = entry({id: 'in', kind: 'income', category: 'Other income', transfer: 'out'});
    const a = removeFrom(log(out, into), emptyMoneyRemoved(), out);
    const repaired = {...a.log, entries: [{...a.log.entries[0]!, transfer: 'third'}, entry({id: 'third', transfer: 'in'})]};
    expect(putBack(repaired, a.bin, 'personal', 'out', now).log.entries.find(x => x.id === 'out')!.transfer).toBeUndefined();
    expect(putBack({...a.log, entries: []}, a.bin, 'personal', 'out', now).log.entries[0]!.transfer).toBeUndefined();
  });
  test('a purchase: the refunds that named it are linked again', () => {
    const buy = entry({id: 'buy', amount: '40.00', category: 'Shopping'}), refund = entry({id: 'ref', kind: 'income', refund: true, refundOf: 'buy', amount: '10.00', category: 'Shopping'});
    const a = removeFrom(log(buy, refund), emptyMoneyRemoved(), buy);
    expect(a.bin.items[0]).toMatchObject({refunds: ['ref']});
    const unlinked = {...a.log, entries: a.log.entries.map(x => { const {refundOf: _r, ...rest} = x; void _r; return rest as MoneyEntry; })};
    const back = putBack(unlinked, a.bin, 'personal', 'buy', now);
    expect(back.log.entries.find(x => x.id === 'ref')!.refundOf).toBe('buy');
    expect(back.relinked).toBe(1);
  });
  test('a business entry goes back to the business space only', () => {
    const a = removeFrom(log(entry({id: 'biz'})), emptyMoneyRemoved(), entry({id: 'biz'}), 'business');
    expect(() => putBack(log(), a.bin, 'personal', 'biz', now)).toThrow();
    expect(putBack(log(), a.bin, 'business', 'biz', now).log.entries.map(e => e.id)).toEqual(['biz']);
  });
});

describe('the stored record (TIER 3, additive: a new loose, versioned key)', () => {
  const storage = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m}; };
  test('an item of a later format is kept exactly as stored and never makes the list unreadable', () => {
    const s = storage(), later_ = {space: 'elsewhere', removedAt: 'later', entry: {id: 'x', future: true}};
    s.setItem(MONEY_REMOVED.key, JSON.stringify({version: 1, items: [later_], more: 'kept'}));
    const read = readDeviceRecord(s, MONEY_REMOVED);
    expect(read.unreadable).toBe(false);
    expect(recentlyRemoved(read.data, 'personal', log(), now)).toEqual([]);
    updateDeviceRecord(s, MONEY_REMOVED, bin => keepRemoved(bin, 'personal', entry({}), log(entry({})), now));
    const stored = JSON.parse(s.m.get(MONEY_REMOVED.key)!);
    expect(stored.items[0]).toEqual(later_);
    expect(stored.more).toBe('kept');
    expect(stored.items).toHaveLength(2);
    expect(JSON.parse(JSON.stringify(emptyRemoved(moneyRemovedSchema.parse(stored), 'personal'))).items).toEqual([later_]);
  });
  test('the key', () => expect(MONEY_REMOVED.key).toBe('zigoals:money-removed:v1'));
});
