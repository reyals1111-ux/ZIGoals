import {describe, expect, test} from 'vitest';
import {addChallenge, billNotesDue, budgetsLeft, challengeStates, lowBalanceCross, moneyWakes, paydayCash, payeeRows, payeesAbove, removeChallenge, withPayee, withoutPayee, yearRecap} from './money-notices';
import {attentionLinks, moneyAttention} from './money-attention';
import {emptyBudgets, type BudgetsRecord} from './budgets/schema';
import {emptyBills, type BillsRecord} from './bills/schema';
import type {MoneyEntry} from './money-log/schema';
import type {CurrencyForecast} from './cash-forecast/model';
import {inOrder, moveAccount, withAccountNote} from './money-log/counted';
import {emptyMoneyLog} from './money-log/schema';
import {buildPlan} from './notify/plan';
import {emptyNotifyPrefs} from './notify/prefs';

/** Session AV lane 2 (money; YNAB's Spotlight, Rocket Money, Copilot, Monarch): the money notices, pure. */
let n = 0;
const e = (date: string, amount: string, category = 'Food & drink', note?: string, kind: MoneyEntry['kind'] = 'expense'): MoneyEntry => ({id: `n${n++}`, kind, amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
const TODAY = '2026-11-14';
const forecast = (points: [string, number][]): CurrencyForecast => ({currency: 'EUR', known: true, startCents: BigInt(points[0]![1]), oldestBalance: TODAY, missingBalances: 0, points: points.map(([date, c]) => ({date, mid: BigInt(c)})), lowest: {date: points[0]![0], cents: BigInt(points[0]![1])}, lowestLow: null, events: [], everyday: {source: 'none', days: 0, outCents: 0n, inCents: 0n}, range: false});

describe('a bill note coming due', () => {
  test('within three days, or passed in the last week; never without a day', () => {
    const bills: BillsRecord = {...emptyBills(), bills: [
      {id: 'b1', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-01', origin: 'manual', cancelNote: 'Cancel before the trial ends', cancelBy: '2026-11-16', createdAt: '2026-10-01T10:00:00.000Z'},
      {id: 'b2', title: 'Music', amount: '9.99', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-01', origin: 'manual', cancelNote: 'Check the family plan', createdAt: '2026-10-01T10:00:00.000Z'},
      {id: 'b3', title: 'Box', amount: '20.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-01', origin: 'manual', cancelNote: 'Later', cancelBy: '2026-12-20', createdAt: '2026-10-01T10:00:00.000Z'}]};
    expect(billNotesDue(bills, TODAY).map(x => [x.title, x.days])).toEqual([['Gym', 2]]);
    const a = moneyAttention({entries: [], bills, today: TODAY});
    expect(attentionLinks(a).map(l => l.text)).toEqual(['Gym: your note is due in 2 days']);
  });
});

describe('watching a payee', () => {
  const log = [e('2026-11-02', '30.00', 'Food & drink', 'Café Noël · card'), e('2026-11-10', '25.00', 'Food & drink', 'cafe noel'), e('2026-10-05', '12.00', 'Food & drink', 'Café Noël'), e('2026-10-20', '9.00', 'Food & drink', 'Café Noël')];
  test('this month against last by the same day, accents and the detail after " · " left out; well above is named', () => {
    let r: BudgetsRecord = withPayee(emptyBudgets(), ' Café Noël ', 'EUR');
    expect(withPayee(r, 'café noël', 'EUR')).toBe(r);
    expect(payeeRows(r, log, TODAY)).toEqual([{payee: 'Café Noël', currency: 'EUR', thisMonth: 5500, count: 2, lastBySameDay: 1200, lastMonth: 2100, difference: 4300}]);
    expect(payeesAbove(r, log, TODAY).map(p => p.payee)).toEqual(['Café Noël']);
    expect(attentionLinks(moneyAttention({entries: log, budgets: r, today: TODAY})).map(l => l.text)).toContain('Café Noël well above last month');
    r = withoutPayee(r, 'Café Noël', 'EUR');
    expect(r.payees).toBeUndefined();
  });
});

describe('challenges', () => {
  test('spend less than last month: on track, close, over; settled after the month', () => {
    const log = [e('2026-10-03', '100.00'), e('2026-11-02', '60.00')];
    let r = addChallenge(emptyBudgets(), 'Food & drink', 'EUR', '2026-11', 'c1');
    expect(() => addChallenge(r, 'food & drink', 'EUR', '2026-11', 'c2')).toThrow('already');
    expect(challengeStates(r, log, TODAY)[0]).toMatchObject({lastMonth: 10000, spent: 6000, left: 4000, state: 'on-track', daysLeft: 17});
    expect(challengeStates(r, [...log, e('2026-11-12', '32.00')], TODAY)[0]!.state).toBe('close');
    expect(challengeStates(r, [...log, e('2026-11-12', '45.00')], TODAY)[0]!.state).toBe('over');
    expect(challengeStates(r, log, '2026-12-02')[0]!.state).toBe('won');
    expect(attentionLinks(moneyAttention({entries: [...log, e('2026-11-12', '45.00')], budgets: r, today: TODAY})).map(l => l.text)).toContain('Food & drink challenge: past last month');
    r = removeChallenge(r, 'c1');
    expect(r.challenges).toBeUndefined();
  });
});

describe('payday, the low-balance line and budgets on Today', () => {
  const rows = [forecast([['2026-11-14', 80000], ['2026-11-20', 30000], ['2026-11-26', 15000], ['2026-11-30', 260000]])];
  test('the cash the forecast leaves the day before payday; the first day below the line', () => {
    expect(paydayCash(rows, {date: '2026-11-28', currency: 'EUR'})).toEqual({date: '2026-11-26', currency: 'EUR', cents: 15000n});
    expect(paydayCash(rows, {date: '2026-11-28', currency: 'USD'})).toBeNull();
    expect(lowBalanceCross(rows, {amount: '200.00', currency: 'EUR'})).toEqual({date: '2026-11-26', currency: 'EUR', cents: 15000n, line: 20000n});
    expect(lowBalanceCross(rows, {amount: '100.00', currency: 'EUR'})).toBeNull();
    const low = lowBalanceCross(rows, {amount: '200.00', currency: 'EUR'});
    expect(attentionLinks(moneyAttention({entries: [], today: TODAY, low})).map(l => l.text)[0]).toMatch(/^Cash may go below €200\.00 on /);
  });
  test('what is left in each budget, only when the person turned it on', () => {
    const r: BudgetsRecord = {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}]};
    const log = [e('2026-11-03', '120.00', 'Groceries')];
    expect(budgetsLeft(r, log, TODAY)).toEqual([]);
    expect(budgetsLeft({...r, onToday: true}, log, TODAY)).toEqual([{category: 'Groceries', currency: 'EUR', left: 18000}]);
  });
});

describe('device notices (no new stored state)', () => {
  test('a budget the morning after it passed 80 %; payday the day before; the low line a week and a day ahead; words only with names on', () => {
    const r: BudgetsRecord = {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]};
    const log = [e('2026-11-02', '70.00', 'Groceries'), e('2026-11-13', '15.00', 'Groceries'), e('2026-10-28', '2000.00', 'Salary', 'Salary', 'income'), e('2026-09-28', '2000.00', 'Salary', 'Salary', 'income')];
    const rows = [forecast([['2026-11-14', 80000], ['2026-11-21', 15000], ['2026-11-27', 12000]])];
    const wakes = moneyWakes({entries: log, budgets: r, rows, line: {amount: '200.00', currency: 'EUR'}, today: TODAY});
    expect(wakes.map(w => [w.id, w.date])).toEqual([['money:near:g:2026-11', TODAY], ['money:payday:2026-11-28', '2026-11-27'], ['money:low:2026-11-21:7', TODAY], ['money:low:2026-11-21:1', '2026-11-20']]);
    expect(moneyWakes({entries: log, budgets: r, rows, today: '2026-11-15'}).filter(w => w.id.startsWith('money:near'))).toEqual([]);
    const plan = (labels: boolean) => buildPlan({now: Date.parse('2026-11-14T06:00:00Z'), zone: 'UTC', prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], money: wakes.map(w => ({id: w.id, date: w.date, title: w.title, ...(w.detail ? {detail: w.detail} : {})}))});
    const named = plan(true).snapshot.items.filter(i => i.kind === 'money');
    // Session AV lane 2 (review b2a #7: money through the app's formatter, "€15.00", not "EUR 15.00", deliberate)
    expect(named[0]).toMatchObject({label: 'Groceries is near its limit', detail: '€15.00 left'});
    expect(plan(false).snapshot.items.filter(i => i.kind === 'money').every(i => i.label === undefined && i.detail === undefined)).toBe(true);
    expect(plan(false).registration.once.length).toBeGreaterThan(0);
  });
});

describe('a year in review', () => {
  test('spent, came in, against the same months a year before, top categories, largest, bills due in it', () => {
    const log = [e('2026-02-10', '50.00', 'Groceries'), e('2026-11-02', '120.00', 'Home', 'Sofa · shop'), e('2026-03-01', '2000.00', 'Salary', undefined, 'income'), e('2025-05-01', '100.00'), e('2025-12-20', '500.00')];
    const bills: BillsRecord = {...emptyBills(), bills: [{id: 'b', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-03', origin: 'manual', createdAt: '2026-09-10T10:00:00.000Z'}]};
    const [r] = yearRecap(log, bills, '2026', TODAY);
    expect(r).toMatchObject({spent: 17000, income: 200000, previousSpent: 10000, top: [{category: 'Home', cents: 12000}, {category: 'Groceries', cents: 5000}], largest: {note: 'Sofa', cents: 12000, date: '2026-11-02'}, bills: {cents: 6000, count: 2}, busiest: '2026-11'});
  });
});

describe('account notes and order', () => {
  test('a note set and cleared; moved up and down, the rest after', () => {
    let log = withAccountNote(emptyMoneyLog(), 'a1', ' Joint with Sam ');
    expect(log.accounts?.notes).toEqual({a1: 'Joint with Sam'});
    log = withAccountNote(log, 'a1', '');
    expect(log.accounts?.notes).toEqual({});
    const items = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    log = moveAccount(log, ['a', 'b', 'c'], 'c', -1);
    expect(inOrder(items, log.accounts?.order).map(x => x.id)).toEqual(['a', 'c', 'b']);
    expect(moveAccount(log, ['a', 'c', 'b'], 'a', -1)).toBe(log);
    expect(inOrder([...items, {id: 'd'}], log.accounts?.order).map(x => x.id)).toEqual(['a', 'c', 'b', 'd']);
  });
});
