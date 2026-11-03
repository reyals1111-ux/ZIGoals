import {describe, expect, test} from 'vitest';
import {cashForecast, contributionDates, plannedContributions, type KnownForecast, type PlannedContribution} from './model';
import {accountsSchema, type Accounts} from '../accounts/schema';
import {emptyBills, type BillsRecord} from '../bills/schema';
import type {MoneyEntry} from '../money-log/schema';
import {addLocalDays} from '../local-date';

const TODAY = '2026-11-01', AT = '2026-10-01T10:00:00.000Z';
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const account = (kind: 'cash' | 'savings' | 'investment' | 'loan', currency: string, balance?: string, date = '2026-10-31') => ({id: uuid(), kind, name: `${kind} ${currency}`, currency, snapshots: balance ? [{id: uuid(), date, value: balance, decimals: 2}] : [], payments: [], createdAt: AT, updatedAt: AT});
const accounts = (...items: ReturnType<typeof account>[]): Accounts => accountsSchema.parse({version: 1, items});
const bills = (...list: {title: string; amount: string; currency?: string; cadence?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'; nextDue: string}[]): BillsRecord => ({...emptyBills(), bills: list.map((b, i) => ({id: `b${i}`, title: b.title, amount: b.amount, currency: b.currency ?? 'EUR', cadence: b.cadence ?? 'monthly', nextDue: b.nextDue, origin: 'manual' as const, createdAt: AT}))});
const entry = (date: string, amount: string, kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR', category = 'Other'): MoneyEntry => ({id: `m${++seq}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
const known = (r: unknown) => { const f = r as KnownForecast; expect(f.known).toBe(true); return f; };
const at = (f: KnownForecast, date: string) => f.points.find(p => p.date === date)!;

describe('BUILD list 2 #11: cash forecast, next 60 days', () => {
  test('no accounts: no line at all (the page teaches); a cash account without a balance is unknown, never zero', () => {
    expect(cashForecast({accounts: accounts(), bills: emptyBills(), entries: [], today: TODAY})).toEqual({rows: [], unplaced: []});
    const out = cashForecast({accounts: accounts(account('cash', 'EUR'), account('investment', 'EUR', '500000')), bills: bills({title: 'Rent', amount: '900.00', nextDue: '2026-11-03'}), entries: [], today: TODAY});
    expect(out.rows).toEqual([{currency: 'EUR', known: false, reason: 'no-balance', missingBalances: 1}]);
  });
  test('only bills: the dated items, the everyday part said to be unknown, the lowest point marked', () => {
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '150000'), account('savings', 'EUR')), bills: bills({title: 'Rent', amount: '900.00', nextDue: '2026-11-03'}, {title: 'Phone', amount: '20.00', nextDue: '2026-11-20'}), entries: [], today: TODAY}).rows[0]);
    expect(f.startCents).toBe(150000n);
    expect(f.missingBalances).toBe(1);
    expect(f.everyday.source).toBe('none');
    expect(f.points).toHaveLength(61);
    expect(at(f, '2026-11-02').mid).toBe(150000n);
    expect(at(f, '2026-11-03').mid).toBe(60000n);
    expect(at(f, '2026-12-31').mid).toBe(150000n - 2n * 90000n - 2n * 2000n);
    expect(f.lowest).toEqual({date: '2026-12-20', cents: -34000n}); // the first day it gets that low
    expect(f.range).toBe(false);
    expect(f.events.map(e => [e.date, e.title, e.cents])).toEqual([['2026-11-03', 'Rent', -90000n], ['2026-11-20', 'Phone', -2000n], ['2026-12-03', 'Rent', -90000n], ['2026-12-20', 'Phone', -2000n]]);
  });
  test('a bill due today is not taken again; one due on the 60th day is', () => {
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '10000')), bills: bills({title: 'Today', amount: '1.00', nextDue: TODAY}, {title: 'Last', amount: '2.00', nextDue: addLocalDays(TODAY, 60), cadence: 'yearly'}), entries: [], today: TODAY}).rows[0]);
    expect(f.events.map(e => e.title)).toEqual(['Today', 'Last']); // "Today" again on 1 Dec
    expect(f.events[0]!.date).toBe('2026-12-01');
  });
  test('month ends: a bill on the 31st falls on the last day of shorter months', () => {
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '100000')), bills: bills({title: 'Insurance', amount: '10.00', nextDue: '2026-10-31'}), entries: [], today: '2026-11-01', days: 120}).rows[0]);
    expect(f.events.map(e => e.date)).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
  });
  test('mixed currencies: one line each, never converted; a bill in a currency without a cash account is named, not drawn', () => {
    const out = cashForecast({accounts: accounts(account('cash', 'EUR', '100000'), account('cash', 'USD', '5000')), bills: bills({title: 'Rent', amount: '500.00', nextDue: '2026-11-05'}, {title: 'Cloud', amount: '9.99', currency: 'USD', nextDue: '2026-11-10'}, {title: 'Flat', amount: '1000.00', currency: 'GBP', nextDue: '2026-11-10'}), entries: [], today: TODAY});
    expect(out.rows.map(r => r.currency)).toEqual(['EUR', 'USD']);
    const eur = known(out.rows[0]), usd = known(out.rows[1]);
    expect(eur.events.every(e => e.title === 'Rent')).toBe(true);
    expect(at(usd, '2026-11-10').mid).toBe(5000n - 999n);
    expect(out.unplaced).toEqual(['GBP']);
  });
  test('the everyday average of the log, exact, without the bill\'s own entries', () => {
    // 30 days of history (2026-10-03 … 2026-11-01): 10.00 a day spent; the rent entry is a known bill and stays out.
    const entries = Array.from({length: 30}, (_, i) => entry(addLocalDays(TODAY, -i), '10.00'));
    entries.push(entry('2026-10-03', '900.00', 'expense', 'Rent'));
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '200000')), bills: bills({title: 'Rent', amount: '900.00', nextDue: '2026-11-03'}), entries, today: TODAY}).rows[0]);
    expect(f.everyday).toEqual({source: 'log', days: 30, outCents: 30000n, inCents: 0n});
    expect(at(f, '2026-11-02').mid).toBe(199000n);
    expect(at(f, '2026-11-03').mid).toBe(200000n - 2000n - 90000n);
    expect(f.range).toBe(false);
  });
  test('a repeating salary in the log lands on its dates; the lowest point is just before it', () => {
    const entries = [entry('2026-08-25', '2000.00', 'income', 'Salary ACME'), entry('2026-09-25', '2000.00', 'income', 'Salary ACME'), entry('2026-10-25', '2000.00', 'income', 'Salary ACME')];
    for (let i = 0; i < 90; i++) entries.push(entry(addLocalDays(TODAY, -i), '50.00'));
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '100000')), bills: emptyBills(), entries, today: TODAY}).rows[0]);
    expect(f.events.filter(e => e.kind === 'repeat-in').map(e => [e.date, e.cents])).toEqual([['2026-11-25', 200000n], ['2026-12-25', 200000n]]);
    expect(f.everyday.inCents).toBe(0n);
    expect(f.lowest.date).toBe('2026-11-24');
    expect(f.lowest.cents).toBe(100000n - 23n * 5000n);
  });
  test('a range from the 30-day windows once there are 60 days or more; it always holds the middle line', () => {
    const entries: MoneyEntry[] = [];
    for (let i = 0; i < 90; i++) entries.push(entry(addLocalDays(TODAY, -i), i < 30 ? '20.00' : i < 60 ? '10.00' : '30.00'));
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '500000')), bills: emptyBills(), entries, today: TODAY}).rows[0]);
    expect(f.range).toBe(true);
    const day30 = f.points[30]!;
    expect(day30.mid).toBe(500000n - 60000n); // 20.00 a day on average
    expect(day30.low).toBe(500000n - 90000n); // the 30.00 a day month
    expect(day30.high).toBe(500000n - 30000n); // the 10.00 a day month
    expect(f.lowestLow).toEqual({date: f.points[60]!.date, cents: 500000n - 180000n});
    for (const p of f.points) expect(p.low! <= p.mid && p.mid <= p.high!).toBe(true);
  });
  test('short history: a budget stands in for the everyday spending; neither: none', () => {
    const budgets = {version: 1 as const, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '365.00', rollover: false, since: '2026-11'}]};
    const f = known(cashForecast({accounts: accounts(account('cash', 'EUR', '100000')), bills: emptyBills(), entries: [entry(TODAY, '5.00')], budgets, today: TODAY}).rows[0]);
    expect(f.everyday.source).toBe('budgets');
    expect(f.points[1]!.mid).toBe(100000n - 1200n); // 365.00 × 12 ÷ 365 = 12.00 a day
  });
  test('planned Goal contributions in the cash currency leave on their dates; another asset or an irregular plan does not', () => {
    const plans: PlannedContribution[] = [
      {goalName: 'House', amount: '25000', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: '2026-11-15', active: true},
      {goalName: 'Stack ZIG', amount: '1000000', asset: 'ZIG', decimals: 6, cadence: 'weekly', nextDate: '2026-11-02', active: true},
      {goalName: 'Trip', amount: '1000', asset: 'EUR', decimals: 2, cadence: 'irregular', nextDate: '2026-11-02', active: true},
      {goalName: 'Paused', amount: '1000', asset: 'EUR', decimals: 2, cadence: 'weekly', nextDate: '2026-11-02', active: false},
    ];
    const out = cashForecast({accounts: accounts(account('cash', 'EUR', '100000')), bills: emptyBills(), entries: [], contributions: plans, today: TODAY});
    const f = known(out.rows[0]);
    expect(f.events.map(e => [e.date, e.title, e.cents])).toEqual([['2026-11-15', 'House', -25000n], ['2026-12-15', 'House', -25000n]]);
    expect(out.unplaced).toEqual([]);
  });
  test('contribution dates step from the plan, stop at its end, and catch up from a past next date', () => {
    expect(contributionDates({cadence: 'monthly', nextDate: '2026-01-31', active: true}, '2026-11-02', '2026-12-31')).toEqual(['2026-11-30', '2026-12-31']);
    expect(contributionDates({cadence: 'weekly', nextDate: '2026-11-02', endDate: '2026-11-16', active: true}, '2026-11-02', '2026-12-31')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(plannedContributions([{name: 'A', status: 'active', plan: {amount: '100', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: '2026-11-02', active: true}}, {name: 'B', status: 'completed', plan: {amount: '100', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: '2026-11-02', active: true}}, {name: 'C', status: 'active'}]).map(p => p.goalName)).toEqual(['A']);
  });
  test('the newest balance on or before today is the start; a future balance is not used', () => {
    const a = account('cash', 'EUR', '10000', '2026-09-01');
    a.snapshots.push({id: uuid(), date: '2026-12-01', value: '99999999', decimals: 2});
    const f = known(cashForecast({accounts: accounts(a), bills: emptyBills(), entries: [], today: TODAY}).rows[0]);
    expect(f.startCents).toBe(10000n);
    expect(f.oldestBalance).toBe('2026-09-01');
  });
});
