import {describe, expect, test} from 'vitest';
import {categoriesRecentFirst, rankRecent} from './recent';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, type MoneyEntry} from '../money-log/schema';
import {showcaseMoneyLog} from '../money-log/showcase';

const TODAY = '2026-11-01';
let n = 0;
const e = (date: string, category: string, kind: 'expense' | 'income' = 'expense', extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `e${n++}`, kind, amount: '10.00', currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...extra});

describe('BUILD list 2 #6: recent categories first', () => {
  test('an empty log keeps the fixed order exactly', () => {
    expect(categoriesRecentFirst([], 'expense', EXPENSE_CATEGORIES, TODAY)).toEqual({chips: [...EXPENSE_CATEGORIES], recent: 0});
    expect(categoriesRecentFirst([], 'income', INCOME_CATEGORIES, TODAY)).toEqual({chips: [...INCOME_CATEGORIES], recent: 0});
  });
  test('the three most used in the last 30 days lead, then the rest in the usual order, never twice', () => {
    const entries = [e('2026-10-30', 'Transport'), e('2026-10-29', 'Transport'), e('2026-10-28', 'Transport'), e('2026-10-27', 'Fun'), e('2026-10-26', 'Fun'), e('2026-10-20', 'Gifts'), e('2026-10-21', 'Home')];
    const out = categoriesRecentFirst(entries, 'expense', EXPENSE_CATEGORIES, TODAY);
    expect(out.recent).toBe(3);
    expect(out.chips.slice(0, 3)).toEqual(['Transport', 'Fun', 'Home']);
    expect(out.chips.slice(3)).toEqual(EXPENSE_CATEGORIES.filter(c => !['Transport', 'Fun', 'Home'].includes(c)));
    expect(new Set(out.chips).size).toBe(out.chips.length);
  });
  test('ties: the most recent use first, then the fixed order', () => {
    expect(rankRecent([e('2026-10-10', 'Gifts'), e('2026-10-20', 'Fun')], 'expense', TODAY, EXPENSE_CATEGORIES).map(r => r.category)).toEqual(['Fun', 'Gifts']);
    // Same count and same last day: the fixed list decides (Groceries comes before Shopping).
    expect(rankRecent([e('2026-10-20', 'Shopping'), e('2026-10-20', 'Groceries')], 'expense', TODAY, EXPENSE_CATEGORIES).map(r => r.category)).toEqual(['Groceries', 'Shopping']);
  });
  test('income and expense are counted apart', () => {
    const entries = [e('2026-10-30', 'Freelance', 'income'), e('2026-10-29', 'Freelance', 'income'), e('2026-10-28', 'Fun'), e('2026-10-28', 'Gift', 'income')];
    expect(categoriesRecentFirst(entries, 'income', INCOME_CATEGORIES, TODAY).chips.slice(0, 2)).toEqual(['Freelance', 'Gift']);
    expect(categoriesRecentFirst(entries, 'expense', EXPENSE_CATEGORIES, TODAY).chips[0]).toBe('Fun');
    expect(categoriesRecentFirst(entries, 'expense', EXPENSE_CATEGORIES, TODAY).chips).not.toContain('Freelance');
  });
  test('only the last 30 days count (today included, day 31 back left out); a future date is left out', () => {
    const entries = [e('2026-10-03', 'Gifts'), e('2026-10-02', 'Home'), e('2026-10-02', 'Home'), e('2026-11-05', 'Fun')];
    expect(rankRecent(entries, 'expense', TODAY).map(r => r.category)).toEqual(['Gifts']);
  });
  test('a split entry counts once in each part\'s category; a category of the person\'s own is kept', () => {
    const split = e('2026-10-30', 'Groceries', 'expense', {amount: '30.00', parts: [{amount: '20.00'}, {amount: '10.00', category: 'Home'}]});
    expect(rankRecent([split, e('2026-10-29', 'Coffee bars')], 'expense', TODAY, EXPENSE_CATEGORIES).map(r => [r.category, r.uses])).toEqual([['Groceries', 1], ['Home', 1], ['Coffee bars', 1]]);
    expect(categoriesRecentFirst([e('2026-10-29', 'Coffee bars')], 'expense', EXPENSE_CATEGORIES, TODAY).chips[0]).toBe('Coffee bars');
  });
  test('the Showcase log puts its own most used first', () => {
    const log = showcaseMoneyLog(TODAY);
    expect(categoriesRecentFirst(log.entries, 'expense', EXPENSE_CATEGORIES, TODAY).chips.slice(0, 3)).toEqual(['Food & drink', 'Groceries', 'Transport']);
  });
});
