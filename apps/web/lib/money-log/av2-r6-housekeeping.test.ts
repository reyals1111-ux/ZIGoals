import {describe, expect, test} from 'vitest';
import {addBackCategory, addBackSub, checkRecords, clearSub, dropBudget, dropSplit, forgetAccount, keepFirst, moveCategory, unlinkRefund, untransfer} from './check';
import {bringBack, pastYears, putAwayPlan, putAwayYear, readable, yearCsv} from './put-away';
import {totals} from './engine';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import {emptyBudgets, type BudgetsRecord} from '../budgets/schema';

/**
 * Session AV lane 2, round 6 (money; Banktivity; LEDGER #430, #431): the check of the money records (read-only, each repair
 * a normal write), and old years put away (nothing deleted, Bring back returns them exactly).
 */
const TODAY = '2026-11-20', AT = '2026-11-20T10:00:00.000Z';
let n = 0;
const e = (extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `h${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-10', createdAt: AT, ...extra});
const log = (entries: MoneyEntry[], extra: Partial<MoneyLog> = {}): MoneyLog => ({...emptyMoneyLog(), entries, ...extra});

describe('the check of the money records (#430)', () => {
  const twinA = e({id: 'da', note: 'Shop · card'}), twinB = e({id: 'db', note: 'Shop · card', createdAt: '2026-11-20T11:00:00.000Z'}), refA = e({id: 'ra', ref: 'R1', note: 'x'}), refB = e({id: 'rb', ref: 'R1', note: 'y', amount: '11.00'});
  const lostCat = e({id: 'lc', category: 'Pets'}), lostSub = e({id: 'ls', sub: 'Coffee', note: 'Cafe'}), badSplit = e({id: 'bs', note: 'Market', parts: [{amount: '3.00'}, {amount: '3.00'}]});
  const lone = e({id: 'lt', transfer: 'nobody'}), linkGone = e({id: 'lg', kind: 'income', refund: true, refundOf: 'gone'});
  const L = log([twinA, twinB, refA, refB, lostCat, lostSub, badSplit, lone, linkGone], {accounts: {notes: {'acc-gone': 'old card', 'acc-1': 'main'}}});
  const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [{id: 'b1', category: 'Pets', currency: 'EUR', monthly: '20.00', rollover: false, since: '2026-01'}, {id: 'b2', category: 'Groceries', currency: 'EUR', monthly: '20.00', rollover: false, since: '2026-01'}]};
  const issues = checkRecords(L, {budgets, accountIds: new Set(['acc-1'])});
  test('it finds each kind and changes nothing', () => {
    expect(issues.map(i => i.kind).sort()).toEqual(['account', 'budget', 'category', 'duplicate', 'duplicate', 'refund-link', 'split', 'sub', 'transfer']);
    expect(issues.find(i => i.kind === 'duplicate' && i.entries[0]!.id === 'da')).toMatchObject({entries: [{id: 'da'}, {id: 'db'}]});
    expect(L.entries).toHaveLength(9);
    expect(checkRecords(log([e(), e({amount: '11.00'})]))).toEqual([]);
    // A refund naming a purchase put away is not an orphan.
    expect(checkRecords(log([linkGone], {putAway: {years: [{id: 'y', year: '2025', at: AT, entries: [{id: 'gone'}]}]}}))).toEqual([]);
  });
  test('the repairs: each a normal write of only what it names', () => {
    expect(keepFirst(L, ['da', 'db']).entries.map(x => x.id)).not.toContain('db');
    expect(moveCategory(L, new Set(['lc']), 'Fun', AT).entries.find(x => x.id === 'lc')).toMatchObject({category: 'Fun', history: [{field: 'category', from: 'Pets', to: 'Fun'}]});
    expect(addBackCategory(L, 'expense', 'Pets').own?.expense).toEqual(['Pets']);
    expect(addBackSub(L, 'Groceries', 'Coffee').subs).toEqual({Groceries: ['Coffee']});
    expect(clearSub(L, new Set(['ls'])).entries.find(x => x.id === 'ls')).not.toHaveProperty('sub');
    expect(dropSplit(L, 'bs').entries.find(x => x.id === 'bs')).not.toHaveProperty('parts');
    expect(untransfer(L, 'lt', AT).entries.find(x => x.id === 'lt')).not.toHaveProperty('transfer');
    expect(unlinkRefund(L, 'lg').entries.find(x => x.id === 'lg')).toMatchObject({refund: true});
    expect(forgetAccount(L, 'acc-gone').accounts?.notes).toEqual({'acc-1': 'main'});
    expect(dropBudget(budgets, 'b1').budgets.map(b => b.id)).toEqual(['b2']);
    const fixed = forgetAccount(unlinkRefund(untransfer(dropSplit(clearSub(moveCategory(keepFirst(keepFirst(L, ['da', 'db']), ['ra', 'rb']), new Set(['lc']), 'Fun', AT), new Set(['ls'])), 'bs'), 'lt', AT), 'lg'), 'acc-gone');
    expect(checkRecords(fixed, {budgets: dropBudget(budgets, 'b1'), accountIds: new Set(['acc-1'])})).toEqual([]);
  });
});

describe('put old entries away (#431)', () => {
  const y24 = [e({id: 'a', date: '2024-02-01'}), e({id: 'b', date: '2024-05-01', kind: 'income', category: 'Salary', amount: '500.00'})];
  const spread = e({id: 's', date: '2025-12-01', spread: 12, amount: '120.00'}), t1 = e({id: 't1', date: '2025-12-30', transfer: 't2'}), t2 = e({id: 't2', date: '2026-01-02', kind: 'income', category: 'Other', transfer: 't1'});
  const bought = e({id: 'p', date: '2025-12-20', amount: '40.00'}), back = e({id: 'r', date: '2026-01-05', kind: 'income', refund: true, refundOf: 'p', amount: '40.00'}), plain = e({id: 'q', date: '2025-06-01'});
  const L = log([...y24, spread, t1, t2, bought, back, plain, e({id: 'now'})]);
  test('the plan: what goes, what that year counted, what stays and why', () => {
    expect(pastYears(L, TODAY).map(y => [y.year, y.count])).toEqual([['2025', 4], ['2024', 2]]);
    const plan = putAwayPlan(L, null, '2025', TODAY);
    expect(plan.moving.map(x => x.id)).toEqual(['q']);
    expect(plan.kept.map(k => [k.entry.id, k.why]).sort()).toEqual([['p', 'refund'], ['s', 'spread'], ['t1', 'transfer']]);
    expect(putAwayPlan(L, null, '2024', TODAY)).toMatchObject({count: 2, byCurrency: [{currency: 'EUR', spent: 1000, received: 50000}]});
    expect(() => putAwayPlan(L, null, '2026', TODAY)).toThrow(/before this one/);
  });
  test('put away: out of every list and figure, kept exactly; Bring back returns them; nothing is deleted', () => {
    const away = putAwayYear(L, null, '2024', TODAY, AT, 'y24');
    expect(away.entries.map(x => x.id)).not.toContain('a');
    expect(totals(away.entries, '2024-01-01', '2024-12-31')).toEqual([]);
    expect(moneyLogSchema.parse(away).putAway?.years).toEqual([{id: 'y24', year: '2024', at: AT, entries: y24}]);
    expect(readable(away.putAway!.years[0]!)).toEqual({entries: y24, unreadable: 0});
    expect(yearCsv(away.putAway!.years[0]!).split('\r\n')[0]).toMatch(/^"Date","Kind","Category"/);
    const again = bringBack(away, 'y24');
    expect(again.entries.slice(0, 2)).toEqual(y24); expect(again).not.toHaveProperty('putAway');
    expect(new Set(again.entries.map(x => x.id))).toEqual(new Set(L.entries.map(x => x.id)));
  });
  test('a rollover budget’s carry into this month is said in the plan', () => {
    const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '50.00', rollover: true, since: '2025-11'}]};
    const plan = putAwayPlan(log([e({id: 'old', date: '2025-12-05', amount: '50.00'}), e({id: 'x'})]), budgets, '2025', TODAY);
    // From Nov 2025 at €50 a month: with December's €50 spent, €550.00 carries into this month; without it, €600.00.
    expect(plan.carry).toEqual([{category: 'Groceries', currency: 'EUR', now: 55000, after: 60000}]);
  });
  test('an entry this build cannot read stays put away when the year comes back', () => {
    const odd = log([], {putAway: {years: [{id: 'y', year: '2023', at: AT, entries: [y24[0], {id: 'future', kind: 'gift'}]}]}});
    const back = bringBack(odd, 'y');
    expect(back.entries.map(x => x.id)).toEqual(['a']);
    expect(back.putAway?.years[0]?.entries).toEqual([{id: 'future', kind: 'gift'}]);
  });
});
