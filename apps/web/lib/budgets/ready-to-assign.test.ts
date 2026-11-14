import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {showcaseBudgets} from '../bills/showcase';
import {showcaseMoneyLog} from '../money-log/showcase';
import {setBudget} from './engine';
import {readyToAssign} from './ready-to-assign';
import {emptyBudgets} from './schema';

let n = 0;
const e = (date: string, amount: string, kind: 'expense' | 'income' = 'income', currency = 'EUR'): MoneyEntry => ({id: `r${n++}`, kind, amount, currency, category: kind === 'income' ? 'Salary' : 'Groceries', date, createdAt: `${date}T10:00:00.000Z`});

describe('Ready to assign (Session AP, feature 3)', () => {
  test('this month\'s logged income minus what this month\'s budgets hold, per currency', () => {
    let r = setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: true}, 'g', '2026-10');
    r = setBudget(r, {category: 'Fun', currency: 'EUR', monthly: '50.50', rollover: false}, 'f', '2026-11');
    r = setBudget(r, {category: 'Fun', currency: 'USD', monthly: '20.00', rollover: false}, 'u', '2026-11');
    // A later month's budget is not held yet.
    r = setBudget(r, {category: 'Home', currency: 'EUR', monthly: '999.00', rollover: false}, 'h', '2026-12');
    const entries = [e('2026-11-01', '2000.00'), e('2026-11-20', '0.25'), e('2026-11-02', '100.00', 'expense'), e('2026-10-31', '5000.00'), e('2026-11-03', '10.00', 'income', 'GBP')];
    expect(readyToAssign(entries, r, '2026-11')).toEqual([
      {currency: 'EUR', status: 'ok', income: 200025, held: 35050, ready: 164975, incomeEntries: 2},
      {currency: 'GBP', status: 'ok', income: 1000, held: 0, ready: 1000, incomeEntries: 1},
      {currency: 'USD', status: 'no-income', held: 2000},
    ]);
  });
  test('more held than logged as income is a negative figure, said as it is; no income at all is said plainly', () => {
    const r = setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false}, 'g', '2026-11');
    expect(readyToAssign([e('2026-11-01', '100.00')], r, '2026-11')).toEqual([{currency: 'EUR', status: 'ok', income: 10000, held: 30000, ready: -20000, incomeEntries: 1}]);
    expect(readyToAssign([], r, '2026-11')).toEqual([{currency: 'EUR', status: 'no-income', held: 30000}]);
    expect(readyToAssign([], emptyBudgets(), '2026-11')).toEqual([]);
  });
  test('the Showcase: its salary this month (the freelance income was last month) minus its three budgets', () => {
    const day = '2026-11-14', out = readyToAssign(showcaseMoneyLog(day).entries, showcaseBudgets(day), '2026-11');
    expect(out).toEqual([{currency: 'EUR', status: 'ok', income: 240000, held: 43000, ready: 197000, incomeEntries: 1}]);
  });
});
