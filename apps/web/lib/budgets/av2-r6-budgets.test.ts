import {describe, expect, test} from 'vitest';
import {monthView} from './engine';
import {readyToAssign} from './ready-to-assign';
import {emptyBudgets, type BudgetsRecord} from './schema';
import {budgetsInOrder, clearOrder, hasOwnOrder, moveBudget, moveBudgetTo, setOrder} from './order';
import {aheadRows, coveredIn, setAside, setAsideFrom} from './set-aside';
import {emptyBudgetPeriods, periodRows} from './periods';
import {monthLines, paycheckIssue, paycheckMonth, paydaysIn, removePaycheck, savePaycheck, setLine} from './paychecks';
import {emptyBills, type BillsRecord} from '../bills/schema';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity; LEDGER #426, #428, #429): budgets in the person's own order,
 * money set aside for next month, and each paycheck's plan — from the person's own amounts, never advice.
 */
const TODAY = '2026-11-20', AT = '2026-11-20T10:00:00.000Z';
const e = (id: string, amount: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', date: '2026-11-10', createdAt: AT, ...extra});
const RECORD: BudgetsRecord = {...emptyBudgets(), budgets: [
  {id: 'food', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'},
  {id: 'fun', category: 'Fun', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-01'},
  {id: 'rent', category: 'Home', currency: 'EUR', monthly: '900.00', rollover: false, since: '2026-01'},
]};
const ENTRIES = [e('g', '120.00'), e('f', '60.00', {category: 'Fun'}), e('s', '2000.00', {kind: 'income', category: 'Salary', date: '2026-11-01'})];

describe('budgets in your own order (#429)', () => {
  test('without an order the month view sorts as before (most spent first); with one, in the person’s order', () => {
    expect(monthView(ENTRIES, RECORD, '2026-11', TODAY).rows.map(r => r.id)).toEqual(['food', 'fun', 'rent']);
    expect(hasOwnOrder(RECORD.budgets)).toBe(false);
    const own = moveBudget(moveBudget(RECORD, 'rent', -1), 'rent', -1);
    expect(budgetsInOrder(own.budgets).map(b => b.id)).toEqual(['rent', 'food', 'fun']);
    expect(own.budgets.map(b => b.order)).toEqual([1, 2, 0]);
    expect(monthView(ENTRIES, own, '2026-11', TODAY).rows.map(r => r.id)).toEqual(['rent', 'food', 'fun']);
    expect(periodRows(ENTRIES, own, emptyBudgetPeriods(), TODAY).map(r => r.budget.id)).toEqual(['rent', 'food', 'fun']);
  });
  test('the ends stay put; a drag moves to a place; back to the usual order', () => {
    expect(moveBudget(RECORD, 'food', -1)).toBe(RECORD);
    expect(budgetsInOrder(moveBudgetTo(RECORD, 'food', 2).budgets).map(b => b.id)).toEqual(['fun', 'rent', 'food']);
    expect(budgetsInOrder(setOrder(RECORD, ['fun', 'gone']).budgets).map(b => b.id)).toEqual(['fun', 'food', 'rent']);
    expect(clearOrder(setOrder(RECORD, ['fun'])).budgets.every(b => b.order === undefined)).toBe(true);
  });
  test('each currency stays apart', () => {
    const two = setOrder({...RECORD, budgets: [...RECORD.budgets, {id: 'usd', category: 'Fun', currency: 'USD', monthly: '50.00', rollover: false, since: '2026-01'}]}, ['usd', 'rent', 'food', 'fun']);
    expect(monthView(ENTRIES, two, '2026-11', TODAY).rows.map(r => r.id)).toEqual(['rent', 'food', 'fun', 'usd']);
  });
});

describe('set aside for next month (#428)', () => {
  test('held this month, covering next month: Ready to assign is lower now and not asked again then', () => {
    expect(readyToAssign(ENTRIES, RECORD, '2026-11')).toEqual([{currency: 'EUR', status: 'ok', income: 200000, held: 130000, ready: 70000, incomeEntries: 1}]);
    const next = setAside(RECORD, '2026-11', {food: '200', fun: '100.00'}, new Map([['EUR', 70000]]), AT, () => `a${Math.random().toString(36).slice(2, 8)}`);
    expect(setAsideFrom(next, '2026-11')).toEqual(new Map([['EUR', 30000]]));
    expect(readyToAssign(ENTRIES, next, '2026-11')[0]).toMatchObject({held: 160000, ready: 40000, setAside: 30000});
    expect(readyToAssign([e('s2', '2000.00', {kind: 'income', category: 'Salary', date: '2026-12-01'})], next, '2026-12')[0]).toMatchObject({held: 100000, ready: 100000, covered: 30000});
    expect([...coveredIn(next, '2026-12')]).toEqual([['food', 20000], ['fun', 10000]]);
    // The month view of December still budgets the amounts (it is the same money, held a month early).
    expect(monthView([], next, '2026-12', '2026-12-01').rows.find(r => r.id === 'food')).toMatchObject({available: 30000});
    expect(aheadRows(next, '2026-11').find(r => r.budget.id === 'food')).toMatchObject({next: 30000, covered: 20000, room: 10000});
  });
  test('never more than the ready money, never more than the budget next month; an empty amount takes it back', () => {
    const ready = new Map([['EUR', 70000]]), id = () => 'x';
    expect(() => setAside(RECORD, '2026-11', {food: '800'}, ready, AT, id)).toThrow(/up to €300\.00, its amount next month/);
    expect(() => setAside(RECORD, '2026-11', {rent: '800'}, ready, AT, id)).toThrow(/more than this month’s ready money in EUR \(€700\.00\)/);
    expect(() => setAside(RECORD, '2026-11', {food: '10'}, new Map(), AT, id)).toThrow(/No income is logged this month in EUR/);
    expect(() => setAside(RECORD, '2026-11', {food: 'ten'}, ready, AT, id)).toThrow(/enter an amount/);
    const once = setAside(RECORD, '2026-11', {food: '50'}, ready, AT, () => 'a1');
    expect(setAside(once, '2026-11', {food: ''}, new Map([['EUR', 65000]]), AT, id)).not.toHaveProperty('ahead');
  });
});

test('review B6O-2: next month’s amount lowered after setting aside — the excess is ready again where it came from, none lost', () => {
  const b: BudgetsRecord = {...emptyBudgets(), budgets: [{id: 'food', category: 'Groceries', currency: 'EUR', monthly: '400.00', rollover: false, since: '2026-01'}]};
  const pay = (m: string) => e(`s${m}`, '1000.00', {kind: 'income', category: 'Salary', date: `${m}-01`});
  const set = setAside(b, '2026-11', {food: '300'}, new Map([['EUR', 60000]]), AT, () => 'a1');
  const lowered: BudgetsRecord = {...set, budgets: [{...set.budgets[0]!, months: {'2026-12': '100.00'}}]};
  const nov = readyToAssign([pay('2026-11')], lowered, '2026-11')[0]!, dec = readyToAssign([pay('2026-12')], lowered, '2026-12')[0]!;
  expect(nov).toMatchObject({held: 50000, ready: 50000, setAside: 10000});
  expect(dec).toMatchObject({held: 0, ready: 100000, covered: 10000});
  expect(nov.status === 'ok' && dec.status === 'ok' ? nov.ready + dec.ready : null).toBe(150000); // €2,000 in, €400 + €100 budgeted: €1,500 ready, nothing gone
  expect(setAsideFrom(lowered, '2026-11')).toEqual(new Map([['EUR', 10000]]));
  expect([...coveredIn(lowered, '2026-12')]).toEqual([['food', 10000]]);
  // Setting it again counts only what was held: up to the €500 ready, plus the €100 held now.
  expect(setAsideFrom(setAside(lowered, '2026-11', {food: '100'}, new Map([['EUR', 50000]]), AT, () => 'a2'), '2026-11')).toEqual(new Map([['EUR', 10000]]));
});

describe('each paycheck’s plan (#426)', () => {
  const bills: BillsRecord = {...emptyBills(), bills: [{id: 'phone', title: 'Phone', amount: '25.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-08', origin: 'manual', createdAt: '2026-01-01T00:00:00.000Z'}]};
  test('the days a paycheck comes: a day of the month (clamped), each Friday, every other Friday', () => {
    expect(paydaysIn({every: 'month', day: 31}, '2026-11')).toEqual(['2026-11-30']);
    expect(paydaysIn({every: 'week', day: 5}, '2026-11')).toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
    expect(paydaysIn({every: 'fortnight', day: 5}, '2026-11')).toHaveLength(2);
  });
  test('per paycheck: what it holds, what is set against it, what is left; the rest is listed apart', () => {
    let plan = savePaycheck(emptyBudgetPeriods(), {name: '1st', every: 'month', day: 1, amount: '1000', currency: 'EUR'}, 'p1');
    plan = savePaycheck(plan, {name: 'Fridays', every: 'week', day: 5, amount: '250', currency: 'EUR'}, 'pf');
    plan = setLine(setLine(setLine(plan, 'b:rent', 'p1'), 'b:food', 'pf'), 'bill:phone', 'p1');
    const m = paycheckMonth(RECORD, bills, plan, '2026-11', TODAY);
    expect(m.plans.map(p => [p.paycheck.name, p.dates.length, p.holds, p.covered, p.left])).toEqual([['1st', 1, 100000, 92500, 7500], ['Fridays', 4, 100000, 30000, 70000]]);
    expect(m.unset.map(l => l.name)).toEqual(['Fun']);
    expect(monthLines(RECORD, bills, '2026-11', TODAY).find(l => l.key === 'bill:phone')).toMatchObject({cents: 2500, due: ['2026-11-08']});
    const gone = removePaycheck(plan, 'p1');
    expect(gone.paychecks?.lines).toEqual({'b:food': 'pf'});
    expect(removePaycheck(gone, 'pf')).not.toHaveProperty('paychecks');
  });
  test('plain words for what cannot be kept; at most six', () => {
    expect(paycheckIssue({name: '', every: 'month', day: 1, amount: '1', currency: 'EUR'})).toMatch(/name/);
    expect(paycheckIssue({name: 'x', every: 'week', day: 9, amount: '1', currency: 'EUR'})).toMatch(/day of the week/);
    expect(paycheckIssue({name: 'x', every: 'month', day: 1, amount: '0', currency: 'EUR'})).toMatch(/brings in/);
    let plan = emptyBudgetPeriods();
    for (let i = 0; i < 6; i++) plan = savePaycheck(plan, {name: `P${i}`, every: 'month', day: i + 1, amount: '10', currency: 'EUR'}, `p${i}`);
    expect(() => savePaycheck(plan, {name: 'P7', every: 'month', day: 7, amount: '10', currency: 'EUR'}, 'p7')).toThrow(/Up to 6/);
    expect(() => setLine(emptyBudgetPeriods(), 'b:food', 'p1')).toThrow(/Add a paycheck first/);
  });
});
