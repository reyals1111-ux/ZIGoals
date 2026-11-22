import {describe, expect, test} from 'vitest';
import {emptyMoneyLog, type MoneyEntry} from '../money-log/schema';
import {wealthSheetSchema} from '../wealth-sheet/schema';
import {accountsSchema} from '../accounts/schema';
import {billsSchema} from '../bills/schema';
import {billsToRecord, limitStates, markFine, unusualEntries, withLimit} from './alerts';
import {todayExtras} from './today';
import {moneyAttention, attentionLinks} from '../money-attention';

/** Session AV lane 2, round 2 (money; Emma's unusual-transaction alerts, Wallet's balance limits and planned payments). */
const at = '2026-11-01T10:00:00.000Z';
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2), kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-10', createdAt: at, ...over});
const A1 = '00000000-0000-4000-8000-000000000001', A2 = '00000000-0000-4000-8000-000000000002';

describe('unusual entries', () => {
  const history = ['2026-09-01', '2026-09-15', '2026-10-01', '2026-10-15'].map((date, i) => e({id: `h${i}`, note: 'Albert Heijn · card', amount: ['40.00', '45.00', '50.00', '42.00'][i]!, date}));
  test('more than twice its payee\'s usual and 20 more, in the last two weeks; fine stops it; too little history names nothing', () => {
    const big = e({id: 'big', note: 'Albert Heijn · card', amount: '182.40', date: '2026-11-12'});
    const found = unusualEntries([...history, big], '2026-11-14');
    expect(found).toEqual([expect.objectContaining({basis: 'payee', name: 'Albert Heijn', usual: 4350, cents: 18240, seen: 4})]);
    expect(found[0]!.entry.id).toBe('big');
    expect(unusualEntries([...history, e({id: 'small', note: 'Albert Heijn', amount: '60.00', date: '2026-11-12'})], '2026-11-14')).toEqual([]);
    expect(unusualEntries([...history, {...big, fine: true}], '2026-11-14')).toEqual([]);
    expect(unusualEntries([...history, big], '2026-12-01')).toEqual([]);
    expect(unusualEntries([history[0]!, big], '2026-11-14')).toEqual([]);
    const log = markFine({...emptyMoneyLog(), entries: [big]}, 'big');
    expect(log.entries[0]!.fine).toBe(true);
    expect(markFine(log, 'big', false).entries[0]).not.toHaveProperty('fine');
  });
  test('with no payee history, the category\'s usual; left-out entries never count', () => {
    const cat = ['2026-10-01', '2026-10-05', '2026-10-09'].map((date, i) => e({id: `c${i}`, category: 'Fun', amount: '15.00', date}));
    expect(unusualEntries([...cat, e({id: 'x', category: 'Fun', amount: '90.00', date: '2026-11-13'})], '2026-11-14')[0]).toMatchObject({basis: 'category', name: 'Fun', usual: 1500});
    expect(unusualEntries([...cat, e({id: 'x', category: 'Fun', amount: '90.00', date: '2026-11-13', excluded: true})], '2026-11-14')).toEqual([]);
  });
});

describe('balance lines per account', () => {
  const accounts = accountsSchema.parse({version: 1, items: [
    {id: A1, kind: 'cash', name: 'Checking', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-000000000001', date: '2026-11-10', value: '42000', decimals: 2}], payments: [], createdAt: at, updatedAt: at},
    {id: A2, kind: 'savings', name: 'Savings', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-000000000002', date: '2026-11-10', value: '2500000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]});
  test('kept, checked against the latest balance, cleared', () => {
    let sheet = withLimit({version: 1}, A1, {below: '500.00'});
    sheet = withLimit(sheet, A2, {above: '20000.00'});
    expect(wealthSheetSchema.parse(sheet)).toEqual(sheet);
    expect(limitStates(accounts, sheet)).toEqual([
      {id: A1, name: 'Checking', currency: 'EUR', balance: '420.00', date: '2026-11-10', line: '500.00', side: 'below'},
      {id: A2, name: 'Savings', currency: 'EUR', balance: '25000.00', date: '2026-11-10', line: '20000.00', side: 'above'}]);
    expect(() => withLimit(sheet, A1, {below: '900.00', above: '100.00'})).toThrow('below the high line');
    expect(withLimit(withLimit(sheet, A1, {}), A2, {})).toEqual({version: 1});
  });
  test('Today names them, each with its place; the Showcase caller passes none', () => {
    const sheet = withLimit({version: 1}, A1, {below: '500.00'});
    const pieces = todayExtras({entries: [], today: '2026-11-14', accounts, sheet});
    expect(pieces).toEqual([{text: 'Checking below your line', href: '/app/wealth'}]);
    const a = moneyAttention({entries: [], today: '2026-11-14', extra: pieces});
    expect(a.count).toBe(1);
    expect(attentionLinks(a)).toEqual(pieces);
    expect(moneyAttention({entries: [], today: '2026-11-14'})).not.toHaveProperty('extra');
  });
});

describe('planned payments: due now, one tap to record, never by itself', () => {
  test('a bill of the last three days not in the log; one seen in the log is not offered', () => {
    const bills = billsSchema.parse({version: 1, dismissed: [], bills: [{id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-12', origin: 'manual', createdAt: '2026-09-01T10:00:00.000Z'}]});
    expect(billsToRecord(bills, [], '2026-11-13')).toEqual([expect.objectContaining({billId: 'gym', due: '2026-11-12', state: 'passed'})]);
    expect(billsToRecord(bills, [], '2026-11-20')).toEqual([]);
    expect(billsToRecord(bills, [e({note: 'Gym', category: 'Bills', amount: '30.00', date: '2026-11-12'})], '2026-11-13')).toEqual([]);
    expect(billsToRecord(null, [], '2026-11-13')).toEqual([]);
  });
});
