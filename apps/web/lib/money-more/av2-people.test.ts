import {describe, expect, test} from 'vitest';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {totals} from '../money-log/engine';
import {addLoan, besideWorth, closeLoan, evenShares, loanRows, loanWakes, loansDue, owedTotals, removeLoan, repay, settle, shareCost, shareIssue, unshareCost} from './people';
import {emptyMoneyMore, moneyMoreSchema} from './schema';
import {todayExtras} from './today';

/** Session AV lane 2, round 2 (money; Emma's custom split and settle, Wallet's lent and borrowed). On this device only. */
const at = '2026-11-03T10:00:00.000Z';
const dinner: MoneyEntry = {id: 'd1', kind: 'expense', amount: '60.00', currency: 'EUR', category: 'Food & drink', note: 'Dinner · card', date: '2026-11-03', createdAt: at};
const log = (): MoneyLog => ({...emptyMoneyLog(), entries: [dinner]});
let n = 0; const ids = () => `ow${n++}`;

describe('a shared cost', () => {
  test('checked in words; split evenly to the cent', () => {
    expect(shareIssue(dinner, '20.00', [])).toContain('at least one person');
    expect(shareIssue(dinner, '20.00', [{name: 'Sam', amount: '30.00'}])).toContain('add up to 50.00; the cost is 60.00');
    expect(shareIssue(dinner, '0.00', [{name: 'Sam', amount: '60.00'}])).toContain('Add it under Lent');
    expect(shareIssue({...dinner, kind: 'income'}, '20.00', [{name: 'Sam', amount: '40.00'}])).toContain('Only spending');
    expect(evenShares('10.00', 2)).toEqual(['3.34', '3.33', '3.33']);
  });
  test('your share counts; each person owes their part; settle writes the money back left out; unshare counts it whole', () => {
    const out = shareCost(log(), emptyMoneyMore(), 'd1', '20.00', [{name: 'Sam', amount: '20.00'}, {name: ' Lee ', amount: '20.00'}], ids);
    expect(out.log.entries[0]!.share).toBe('20.00');
    expect(totals(out.log.entries, '2026-11-01', '2026-11-30')[0]!.expenses).toBe(2000);
    expect(owedTotals(out.more).map(o => [o.name, o.cents])).toEqual([['Lee', 2000], ['Sam', 2000]]);
    expect(moneyMoreSchema.parse(out.more)).toEqual(out.more); expect(moneyLogSchema.parse(out.log)).toEqual(out.log);
    const s = settle(out.log, out.more, 'sam', 'EUR', '2026-11-05', 'back1', at);
    expect(s.cents).toBe(2000);
    expect(s.log.entries.at(-1)).toMatchObject({id: 'back1', kind: 'income', amount: '20.00', category: 'Refund', excluded: true, date: '2026-11-05'});
    expect(totals(s.log.entries, '2026-11-01', '2026-11-30')[0]).toMatchObject({expenses: 2000, income: 0});
    expect(owedTotals(s.more).map(o => o.name)).toEqual(['Lee']);
    expect(() => settle(s.log, s.more, 'Sam', 'EUR', '2026-11-05', 'x', at)).toThrow('owes you nothing open');
    const off = unshareCost(s.log, s.more, 'd1');
    expect(off.log.entries[0]!.share).toBeUndefined();
    expect(off.more.owed!.map(o => [o.name, o.settled])).toEqual([['Sam', '2026-11-05']]);
  });
});

describe('lent and borrowed', () => {
  test('added, repaid in parts (closing when paid), closed or forgiven, removed; beside net worth; due reminders', () => {
    let m = addLoan(emptyMoneyMore(), {kind: 'lent', name: 'Noor', amount: '100.00', currency: 'EUR', date: '2026-10-01', due: '2026-11-15', remind: true}, 'l1');
    m = addLoan(m, {kind: 'borrowed', name: 'Mum', amount: '50.00', currency: 'EUR', date: '2026-10-02'}, 'l2');
    expect(() => addLoan(m, {kind: 'lent', name: 'X', amount: '5.00', currency: 'EUR', date: '2026-10-02', remind: true}, 'x')).toThrow('needs a due day');
    m = repay(m, 'l1', '40.00', '2026-11-01');
    expect(() => repay(m, 'l1', '70.00', '2026-11-02')).toThrow('Only 60.00 is left');
    expect(loanRows(m, '2026-11-14').find(r => r.loan.id === 'l1')).toMatchObject({left: 6000, repaid: 4000, state: 'due-soon', days: 1});
    expect(besideWorth(m)).toEqual([{currency: 'EUR', lent: 6000, borrowed: 5000, owed: 0, net: 1000}]);
    expect(loansDue(m, '2026-11-14').map(r => r.loan.id)).toEqual(['l1']);
    expect(loansDue(m, '2026-11-10')).toEqual([]);
    expect(loanWakes(m, '2026-11-14')).toEqual([{id: 'money:loan:l1:1', date: '2026-11-14', title: 'Noor owes you: due tomorrow', detail: 'EUR 60.00 left'}, {id: 'money:loan:l1:0', date: '2026-11-15', title: 'Noor owes you: due today', detail: 'EUR 60.00 left'}]);
    expect(todayExtras({entries: [], today: '2026-11-14', more: m})).toEqual([{text: 'Noor owes you €60.00, due tomorrow', href: '/app/wealth#spending'}]);
    const paid = repay(m, 'l1', '60.00', '2026-11-14');
    expect(paid.loans![0]!.closed).toBe('2026-11-14');
    expect(loanRows(closeLoan(m, 'l1', '2026-11-20', true), '2026-11-20').find(r => r.loan.id === 'l1')).toMatchObject({state: 'forgiven'});
    expect(closeLoan(m, 'l2', '2026-11-20', true).loans![1]!.forgiven).toBeUndefined();
    expect(besideWorth(closeLoan(closeLoan(m, 'l1', '2026-11-20'), 'l2', '2026-11-20'))).toEqual([]);
    expect(removeLoan(removeLoan(m, 'l1'), 'l2')).toEqual({version: 1});
    expect(moneyMoreSchema.parse(paid)).toEqual(paid);
  });
});
