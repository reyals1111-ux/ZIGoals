import {describe, expect, test} from 'vitest';
import {categoriesToMark, markOf, needWantMonth, setMark, shareOfIncome} from './needs-wants';
import {totals} from '../money-log/engine';
import {emptyMoneyLog, type MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard, LEDGER #295): each category's mark is the person's own; a month's
 * spending per mark, as a share of its income, by Wealth → Spending's own figures. Never a target.
 */
const at = '2026-11-20T10:00:00.000Z';
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Other', date: '2026-11-05', createdAt: at, ...over});
const entries = [
  e({kind: 'income', amount: '2000.00', category: 'Salary', date: '2026-11-01'}),
  e({amount: '600.00', category: 'Home'}), e({amount: '200.00', category: 'Groceries'}),
  e({amount: '150.00', category: 'Fun'}), e({amount: '90.00', category: 'Fun', share: '30.00'}), e({amount: '80.00', category: 'Fun', excluded: true}),
  e({amount: '300.00', category: 'Savings pot'}), e({amount: '40.00', category: 'Gifts'}),
  e({amount: '500.00', category: 'Home', date: '2026-10-05'}),
];
const marks = {Home: 'need' as const, groceries: 'need' as const, Fun: 'want' as const, 'Savings pot': 'saving' as const};

describe('needs, wants and saving', () => {
  test('marks are set, matched without case, and cleared', () => {
    const log = setMark(setMark(emptyMoneyLog(), 'Home', 'need'), 'Fun', 'want');
    expect(log.needWant).toEqual({Home: 'need', Fun: 'want'});
    expect(markOf(log.needWant, 'home')).toBe('need');
    expect(setMark(log, 'fun', 'saving').needWant).toEqual({Home: 'need', fun: 'saving'});
    expect(setMark(setMark(log, 'Home', null), 'Fun', null)).toEqual(emptyMoneyLog());
  });
  test('a month per mark, by Wealth → Spending’s own figures (left out, my share)', () => {
    const [r] = needWantMonth(entries, marks, '2026-11');
    expect(r!.spent).toBe(totals(entries, '2026-11-01', '2026-11-30')[0]!.expenses);
    expect(r!.parts).toEqual({need: {cents: 80000, categories: ['Home', 'Groceries']}, want: {cents: 18000, categories: ['Fun']}, saving: {cents: 30000, categories: ['Savings pot']}, unmarked: {cents: 4000, categories: ['Gifts']}});
    expect(r!.notSpent).toBe(200000 - 132000);
    expect(shareOfIncome(r!.parts.need.cents, r!)).toBe(0.4);
    expect(needWantMonth(entries, marks, '2026-10')[0]).toMatchObject({income: 0, notSpent: null});
    expect(shareOfIncome(100, {income: 0})).toBeNull();
  });
  test('the categories to mark: spent in during the last 90 days, then marked ones', () => {
    expect(categoriesToMark(entries, {Health: 'need'}, '2026-11-22')).toEqual(['Fun', 'Gifts', 'Groceries', 'Health', 'Home', 'Savings pot']);
  });
});
