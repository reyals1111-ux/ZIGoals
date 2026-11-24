import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {budgetsSchema, type BudgetsRecord} from '../budgets/schema';
import {daysLeftInMonth, perDay, perDayWords} from '../budgets/per-day';
import {ownBudgetIssue, ownBudgetRows, payeeBudgets, withOwnBudget, withPayeeAmount, withoutOwnBudget} from './own-budgets';
import {emptyMoneyMore, moneyMoreSchema} from './schema';

/** Session AV lane 2, round 2 (money; Spendee's daily amount left and label budgets, Wallet's one-time budgets, Emma's merchant budgets). */
const at = '2026-11-20T10:00:00.000Z';
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: 'x', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', date: '2026-11-10', createdAt: at, ...over});
const money = (c: number) => `€${(c / 100).toFixed(2)}`;

describe('a day left', () => {
  test('left ÷ the days left, rounded down to the cent; nothing when nothing is left', () => {
    expect(daysLeftInMonth('2026-11-22')).toBe(9);
    expect(perDay(5800, 9)).toBe(644);
    expect(perDay(0, 9)).toBeNull(); expect(perDay(-100, 9)).toBeNull(); expect(perDay(100, 0)).toBeNull();
    expect(perDayWords(5800, 9, money, 'EUR')).toBe('About €6.44 a day left for 9 days');
    expect(perDayWords(500, 1, money, 'EUR')).toBe('€5.00 left for the last day');
  });
});

describe('your own budgets', () => {
  const tagged = (tag: string) => new Set(tag === 'holiday' ? ['h1', 'h2'] : []);
  test('checked in words, saved, read back and removed', () => {
    expect(ownBudgetIssue({name: '', currency: 'EUR', amount: '10.00', every: 'month', categories: ['Fun']})).toContain('name');
    expect(ownBudgetIssue({name: 'Trip', currency: 'EUR', amount: '10.00', every: 'month'})).toContain('a tag, or one or more categories');
    expect(ownBudgetIssue({name: 'Trip', currency: 'EUR', amount: '10.00', every: 'once', tag: 'holiday', from: '2026-12-10', to: '2026-12-01'})).toContain('after the first');
    const m = withOwnBudget(emptyMoneyMore(), {name: 'Holiday', currency: 'EUR', amount: '500.00', tag: 'holiday', every: 'once', from: '2026-11-15', to: '2026-11-30'}, 'b1');
    expect(moneyMoreSchema.parse(m)).toEqual(m);
    expect(withoutOwnBudget(m, 'b1')).toEqual({version: 1});
  });
  test('a tag budget counts tagged entries in any category; a categories budget its categories; days to go and a day left', () => {
    let m = withOwnBudget(emptyMoneyMore(), {name: 'Holiday', currency: 'EUR', amount: '500.00', tag: 'holiday', every: 'once', from: '2026-11-15', to: '2026-11-30'}, 'b1');
    m = withOwnBudget(m, {name: 'Out', currency: 'EUR', amount: '100.00', categories: ['Food & drink', 'Fun'], every: 'month'}, 'b2');
    m = withOwnBudget(m, {name: 'Later', currency: 'EUR', amount: '100.00', categories: ['Fun'], every: 'once', from: '2026-12-01', to: '2026-12-31'}, 'b3');
    const entries = [e({id: 'h1', category: 'Transport', amount: '120.00', date: '2026-11-16'}), e({id: 'h2', category: 'Fun', amount: '30.00', date: '2026-11-14'}), e({id: 'f', category: 'Fun', amount: '40.00', date: '2026-11-18'}), e({id: 'g', amount: '25.00', share: '5.00', date: '2026-11-19'}), e({id: 'x', category: 'Fun', amount: '99.00', excluded: true})];
    const rows = ownBudgetRows(m, entries, tagged, '2026-11-22');
    const holiday = rows.find(r => r.budget.id === 'b1')!, out = rows.find(r => r.budget.id === 'b2')!, later = rows.find(r => r.budget.id === 'b3')!;
    expect(holiday).toMatchObject({spent: 12000, left: 38000, state: 'running', daysLeft: 9, perDay: 4222, count: 1});
    expect(out).toMatchObject({spent: 3000 + 4000 + 500, left: 2500, from: '2026-11-01', to: '2026-11-30', state: 'running'});
    expect(later).toMatchObject({spent: 0, state: 'not-started', daysToStart: 9, perDay: null});
    expect(ownBudgetRows(m, entries, tagged, '2026-12-31').find(r => r.budget.id === 'b1')!.state).toBe('ended');
  });
});

describe('payee budgets', () => {
  test('an amount on a watched payee: spent, left, near and over; taken off again', () => {
    let r: BudgetsRecord = budgetsSchema.parse({version: 1, budgets: [], payees: [{payee: 'Albert Heijn', currency: 'EUR'}]});
    expect(() => withPayeeAmount(r, 'Jumbo', 'EUR', '100.00')).toThrow('not watched');
    expect(() => withPayeeAmount(r, 'Albert Heijn', 'EUR', 'lots')).toThrow('above zero');
    r = withPayeeAmount(r, 'albert heijn', 'EUR', '100.00');
    expect(budgetsSchema.parse(r).payees![0]).toEqual({payee: 'Albert Heijn', currency: 'EUR', amount: '100.00'});
    const rows = payeeBudgets(r, [e({id: 'a', note: 'Albert Heijn · card', amount: '85.00', date: '2026-11-05', category: 'Groceries'})], '2026-11-22');
    expect(rows[0]).toMatchObject({payee: 'Albert Heijn', amount: 10000, thisMonth: 8500, left: 1500, near: true, over: false, perDay: 166});
    expect(payeeBudgets(withPayeeAmount(r, 'Albert Heijn', 'EUR', null), [], '2026-11-22')).toEqual([]);
  });
});
