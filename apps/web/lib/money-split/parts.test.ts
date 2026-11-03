import {describe, expect, test} from 'vitest';
import {entryParts, evenSplit, fromMinor, isSplit, minorUnits, setSplit, splitIssue} from './parts';
import {byCategory} from '../money-log/engine';
import {monthView} from '../budgets/engine';
import {emptyMoneyLog, moneyEntrySchema, moneyLogSchema, type MoneyEntry} from '../money-log/schema';

const e = (id: string, amount: string, category = 'Groceries', extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category, date: '2026-10-10', createdAt: '2026-10-10T10:00:00.000Z', ...extra});

describe('split a money entry (Session AK lane M, item 22)', () => {
  test('minor units are exact, never floating point', () => {
    expect(minorUnits('0.1')).toBe(10); expect(minorUnits('19.99')).toBe(1999); expect(minorUnits('3')).toBe(300); expect(minorUnits('1000000000')).toBe(100_000_000_000);
    expect(fromMinor(1)).toBe('0.01'); expect(fromMinor(123456)).toBe('1234.56');
  });
  test('an entry without parts counts whole in its own category', () => {
    expect(entryParts(e('a', '12.30'))).toEqual([{cents: 1230, category: 'Groceries'}]);
  });
  test('valid parts are read; a part without a category takes the entry\'s', () => {
    const entry = e('a', '100.00', 'Groceries', {parts: [{amount: '60.00'}, {amount: '30.01', category: 'Home'}, {amount: '9.99', category: 'Fun', goalId: '7'}]});
    expect(entryParts(entry)).toEqual([{cents: 6000, category: 'Groceries'}, {cents: 3001, category: 'Home'}, {cents: 999, category: 'Fun', goalId: '7'}]);
    expect(isSplit(entry)).toBe(true);
  });
  test('parts that do not add up exactly are ignored: the entry counts whole', () => {
    const off = e('a', '10.00', 'Groceries', {parts: [{amount: '5.00', category: 'Home'}, {amount: '4.99', category: 'Fun'}]});
    expect(entryParts(off)).toEqual([{cents: 1000, category: 'Groceries'}]);
    expect(isSplit(off)).toBe(false);
  });
  test('one part links the whole entry to a Goal without splitting it', () => {
    const linked = e('a', '10.00', 'Fun', {parts: [{amount: '10.00', goalId: '3'}]});
    expect(entryParts(linked)).toEqual([{cents: 1000, category: 'Fun', goalId: '3'}]);
    expect(isSplit(linked)).toBe(false);
  });
  test('the issue says what is wrong: count, amount, the exact difference', () => {
    const entry = e('a', '10.00');
    expect(splitIssue(entry, [{amount: '10.00', category: 'Fun'}])).toMatch(/2 to 5 parts/);
    expect(splitIssue(entry, Array.from({length: 6}, () => ({amount: '1.00', category: 'Fun'})))).toMatch(/2 to 5 parts/);
    expect(splitIssue(entry, [{amount: '0', category: 'Fun'}, {amount: '10.00', category: 'Home'}])).toMatch(/Part 1: enter an amount/);
    expect(splitIssue(entry, [{amount: '1.234', category: 'Fun'}, {amount: '8.766', category: 'Home'}])).toMatch(/Part 1/);
    expect(splitIssue(entry, [{amount: '5.00'}, {amount: '5.00', category: 'Home'}])).toBeNull(); // a part without a category keeps the entry's
    expect(splitIssue(entry, [{amount: '5.00', category: 'Fun'}, {amount: '5.01', category: 'Home'}])).toBe('The parts add up to 10.01; the entry is 10.00. Take 0.01 off.');
    expect(splitIssue(entry, [{amount: '5.00', category: 'Fun'}, {amount: '4.99', category: 'Home'}])).toBe('The parts add up to 9.99; the entry is 10.00. Add 0.01 on.');
    expect(splitIssue(entry, [{amount: '0.10', category: 'Fun'}, {amount: '0.20', category: 'Home'}, {amount: '9.70', goalId: '4'}])).toBeNull();
  });
  test('an even split gives the leftover cents to the first parts and adds up exactly', () => {
    expect(evenSplit('10.00', 3)).toEqual(['3.34', '3.33', '3.33']);
    expect(evenSplit('0.03', 2)).toEqual(['0.02', '0.01']);
    for (const n of [2, 3, 4, 5]) expect(evenSplit('99.99', n).reduce((s, a) => s + minorUnits(a), 0)).toBe(9999);
  });
  test('setSplit stores valid parts on the entry, removes them with null, refuses a bad sum with nothing changed', () => {
    const log = {...emptyMoneyLog(), entries: [e('a', '10.00'), e('b', '2.00')]};
    const split = setSplit(log, 'a', [{amount: '4', category: ' Home '}, {amount: '6.00', category: 'Fun'}]);
    expect(split.entries[0]!.parts).toEqual([{amount: '4.00', category: 'Home'}, {amount: '6.00', category: 'Fun'}]);
    expect(moneyLogSchema.safeParse(split).success).toBe(true);
    expect(split.entries[1]).toBe(log.entries[1]);
    expect('parts' in setSplit(split, 'a', null).entries[0]!).toBe(false);
    expect(() => setSplit(log, 'a', [{amount: '4.00', category: 'Home'}, {amount: '5.00', category: 'Fun'}])).toThrow(/add up/);
    expect(() => setSplit(log, 'zzz', null)).toThrow(/no longer/);
  });
  test('the stored format: parts are optional, kept on a round trip, and a malformed list never makes the log unreadable', () => {
    const plain = moneyEntrySchema.parse(e('a', '1.00'));
    expect(plain.parts).toBeUndefined();
    expect(moneyEntrySchema.parse({...e('a', '1.00'), parts: [{amount: '1.00', goalId: '3'}], later: 'kept'})).toMatchObject({parts: [{amount: '1.00', goalId: '3'}], later: 'kept'});
    const bad = moneyLogSchema.safeParse({version: 1, entries: [{...e('a', '1.00'), parts: 'not a list'}, {...e('b', '1.00'), parts: [{amount: '-1'}]}, {...e('c', '1.00'), parts: Array.from({length: 6}, () => ({amount: '1.00'}))}]});
    expect(bad.success).toBe(true);
    expect(bad.data!.entries.map(x => x.parts)).toEqual([undefined, undefined, undefined]);
  });
});

describe('totals and budgets read the parts', () => {
  const entries = [
    e('a', '100.00', 'Groceries', {parts: [{amount: '70.00'}, {amount: '30.00', category: 'Home'}]}),
    e('b', '20.00', 'Home'),
    e('c', '5.00', 'Fun', {parts: [{amount: '4.00', category: 'Home'}, {amount: '2.00', category: 'Gifts'}]}), // does not add up: whole
  ];
  test('byCategory', () => {
    expect(byCategory(entries, '2026-10-01', '2026-10-31').map(r => [r.category, r.total])).toEqual([['Groceries', 7000], ['Home', 5000], ['Fun', 500]]);
  });
  test('the month\'s budgets and the unbudgeted rest', () => {
    const view = monthView(entries, {version: 1, budgets: [{id: 'h', category: 'Home', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-10'}]}, '2026-10', '2026-10-15');
    expect(view.rows[0]).toMatchObject({category: 'Home', spent: 5000, left: 5000});
    expect(view.unbudgeted.map(u => [u.category, u.spent])).toEqual([['Groceries', 7000], ['Fun', 500]]);
  });
});
