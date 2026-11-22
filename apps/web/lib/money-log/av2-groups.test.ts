import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {groupEntries, groupLine, groupRows, groupsOf, renameGroup, ungroup} from './groups';
import {byCategory, totals} from './engine';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import {GroupItem} from '../../components/wealth/spending/group-row';
import {moneyCents} from '../../components/wealth/money-tools/format';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's grouped transactions, LEDGER #341): a group is one line in a list;
 * every figure still counts each entry, and the group's own total is Wealth → Spending's `totals`.
 */
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `g${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Fun', date: '2026-11-07', createdAt: `2026-11-07T10:0${n % 10}:00.000Z`, ...over});
const trip = [e({amount: '120.00', category: 'Home', note: 'Hotel'}), e({amount: '42.40', category: 'Food & drink', date: '2026-11-08'}), e({kind: 'income', amount: '20.00', category: 'Refund', date: '2026-11-09'}), e({amount: '30.00', share: '15.00', date: '2026-11-08'}), e({amount: '50.00', excluded: true})];
const other = e({amount: '5.00', date: '2026-11-10'});
const log: MoneyLog = {...emptyMoneyLog(), entries: [...trip, other]};
const ids = new Set(trip.map(x => x.id));
const money = (c: number, cur: string) => moneyCents(c, cur);

describe('group entries into one (#341)', () => {
  const grouped = groupEntries(log, ids, '  Weekend   in Ghent ', 'g1');
  test('each entry carries the group; nothing else changes; the record still reads', () => {
    expect(grouped.entries.filter(x => x.group).map(x => x.group)).toEqual(trip.map(() => ({id: 'g1', name: 'Weekend in Ghent'})));
    expect(grouped.entries.at(-1)!.group).toBeUndefined();
    expect(moneyLogSchema.parse(grouped).entries[0]!.group).toEqual({id: 'g1', name: 'Weekend in Ghent'});
  });
  test('every figure still counts each entry as it is; the group total is totals over its entries', () => {
    expect(totals(grouped.entries, '2026-11-01', '2026-11-30')).toEqual(totals(log.entries, '2026-11-01', '2026-11-30'));
    expect(byCategory(grouped.entries, '2026-11-01', '2026-11-30')).toEqual(byCategory(log.entries, '2026-11-01', '2026-11-30'));
    const [g] = groupsOf(grouped.entries);
    expect(g).toMatchObject({id: 'g1', name: 'Weekend in Ghent', from: '2026-11-07', to: '2026-11-09', leftOut: 1});
    expect(g!.totals).toEqual([{currency: 'EUR', expenses: 17_740, income: 2_000, count: 4}]);
    expect(groupLine(g!, money)).toBe('5 entries · spent €177.40, received €20.00 · 1 left out of the figures');
  });
  test('a list folds the group into one row where its first entry is; Select mode lists each', () => {
    const list = [...grouped.entries].reverse(), rows = groupRows(list, grouped.entries);
    expect(rows.map(r => r.kind)).toEqual(['entry', 'group']);
    expect(rows[1]!.kind === 'group' && rows[1]!.shown).toHaveLength(5);
    const part = groupRows(list.slice(0, 3), grouped.entries);
    expect(part[1]!.kind === 'group' && part[1]!.group.entries).toHaveLength(5);
  });
  test('limits and words; ungroup and rename', () => {
    expect(() => groupEntries(log, new Set([trip[0]!.id]), 'x', 'g2')).toThrow('Select at least two entries to group.');
    expect(() => groupEntries(log, ids, ' ', 'g2')).toThrow('Give the group a name');
    const many: MoneyLog = {...emptyMoneyLog(), entries: Array.from({length: 21}, () => e({}))};
    expect(() => groupEntries(many, new Set(many.entries.map(x => x.id)), 'Too many', 'g3')).toThrow('A group holds up to 20 entries.');
    expect(ungroup(grouped, 'g1').entries.some(x => x.group)).toBe(false);
    expect(groupsOf(renameGroup(grouped, 'g1', 'Ghent').entries).map(g => g.name)).toEqual(['Ghent']);
    const moved = groupEntries(grouped, new Set([trip[0]!.id, other.id]), 'Two', 'g4');
    expect(groupsOf(moved.entries).map(g => [g.name, g.entries.length])).toEqual([['Two', 2], ['Weekend in Ghent', 4]]);
  });
  test('the row: one line with its total and days, each entry inside, Ungroup named', () => {
    const [g] = groupsOf(grouped.entries);
    const html = renderToStaticMarkup(createElement(GroupItem, {group: g!, shown: g!.entries.slice(0, 2), entry: (x: MoneyEntry) => createElement('li', {key: x.id}, x.category), money, onUngroup: () => {}}));
    expect(html).toContain('<strong>Weekend in Ghent</strong>');
    expect(html).toContain('Nov 7, 2026 – Nov 9, 2026');
    expect(html).toContain('2 of its 5 entries are in this list.');
    expect(html).toContain('aria-label="Ungroup Weekend in Ghent"');
    expect(html).toContain('data-private-amount');
  });
});
