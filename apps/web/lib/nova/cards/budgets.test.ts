import {describe, expect, it} from 'vitest';
import {budgetsSchema, emptyBudgets, type Budget} from '../../budgets/schema';
import type {MoneyEntry} from '../../money-log/schema';
import {budgetWords, budgetsAsOf, budgetsCard, budgetsRows} from './budgets';

const TODAY = '2026-11-11';
let n = 0;
const entry = (date: string, amount: string, category: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `e${++n}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T12:00:00.000Z`, ...extra});
const budget = (category: string, monthly: string, extra: Partial<Budget> = {}): Budget => ({id: `b-${category.toLowerCase().replace(/\W+/g, '-')}-${extra.currency ?? 'EUR'}`, category, currency: 'EUR', monthly, rollover: false, since: '2026-10', ...extra});
const record = (budgets: Budget[]) => budgetsSchema.parse({version: 1, budgets});

describe('budgets card (Session AM)', () => {
  it('teaches with no budget (spending alone is not a budget)', () => {
    const card = budgetsCard(emptyBudgets(), [entry('2026-11-02', '10.00', 'Fun')], TODAY);
    expect(card).toMatchObject({state: 'empty', count: 0, within: 0, lines: []});
  });
  it('counts the budgets within plan and says an overspend in words', () => {
    const card = budgetsCard(record([budget('Groceries', '250.00'), budget('Food & drink', '120.00'), budget('Fun', '60.00'), budget('Transport', '40.00')]), [
      entry('2026-11-02', '142.30', 'Groceries'), entry('2026-11-03', '49.10', 'Food & drink'), entry('2026-11-04', '100.00', 'Fun'), entry('2026-11-09', '40.00', 'Transport'),
      entry('2026-10-30', '999.00', 'Fun'), entry('2026-11-05', '15.00', 'Health'), entry('2026-11-06', '5.00', 'Gifts'),
    ], TODAY);
    expect(card).toMatchObject({state: 'live', hero: '3 of 4', within: 3, count: 4, daysLeft: 20, lastDate: '2026-11-09'});
    // Over first, then the fullest.
    expect(card.lines.map(l => [l.category, l.over, l.words])).toEqual([['Fun', true, 'over by €40.00'], ['Transport', false, 'all used'], ['Groceries', false, '€107.70 left'], ['Food & drink', false, '€70.90 left']]);
    expect(card.lines[0]!.share).toBeCloseTo(100 / 60, 6);
    expect(card.lines[0]).toMatchObject({spent: '€100.00', available: '€60.00'});
    expect(card.unbudgeted).toEqual([{currency: 'EUR', text: '€20.00', categories: 2}]);
    expect(budgetsRows(card, 3)).toEqual([
      ['Budgets within plan this month', '3 of 4'], ['Fun', '€100.00 of €60.00 spent, over by €40.00'], ['Transport', '€40.00 of €40.00 spent, all used'], ['Groceries', '€142.30 of €250.00 spent, €107.70 left'],
      ['More budgets', '1 more on Wealth'], ['Spent with no budget in EUR', '€20.00'], ['Days left this month', '20'],
    ]);
    expect(budgetsAsOf(card)).toBe('last entry Nov 9');
  });
  it('each budget keeps its own currency: the same category in two currencies is two budgets, nothing is added across', () => {
    const card = budgetsCard(record([budget('Fun', '60.00'), budget('Fun', '50.00', {currency: 'USD'})]), [entry('2026-11-02', '70.00', 'Fun'), entry('2026-11-03', '10.00', 'Fun', {currency: 'USD'}), entry('2026-11-04', '8.00', 'Gifts', {currency: 'USD'})], TODAY);
    expect(card.hero).toBe('1 of 2');
    expect(card.lines.map(l => [l.currency, l.spent, l.available, l.words])).toEqual([['EUR', '€70.00', '€60.00', 'over by €10.00'], ['USD', '$10.00', '$50.00', '$40.00 left']]);
    expect(card.unbudgeted).toEqual([{currency: 'USD', text: '$8.00', categories: 1}]);
  });
  it('a budget with nothing logged is untouched, and the foot says nothing is logged yet', () => {
    const card = budgetsCard(record([budget('Fun', '60.00')]), [], TODAY);
    expect(card).toMatchObject({hero: '1 of 1', lastDate: null});
    expect(card.lines[0]).toMatchObject({share: 0, over: false, words: '€60.00 left', spent: '€0.00'});
    expect(budgetsAsOf(card)).toBe('nothing logged yet this month');
  });
  it('what an earlier month left unspent carries over only with rollover', () => {
    const entries = [entry('2026-10-10', '20.00', 'Fun'), entry('2026-11-02', '70.00', 'Fun')];
    expect(budgetsCard(record([budget('Fun', '60.00')]), entries, TODAY).lines[0]).toMatchObject({over: true, available: '€60.00', words: 'over by €10.00'});
    expect(budgetsCard(record([budget('Fun', '60.00', {rollover: true})]), entries, TODAY).lines[0]).toMatchObject({over: false, available: '€100.00', words: '€30.00 left'});
  });
  it('the words of one budget', () => {
    expect(budgetWords({left: -4000, over: true, currency: 'EUR'})).toBe('over by €40.00');
    expect(budgetWords({left: 0, over: false, currency: 'EUR'})).toBe('all used');
    expect(budgetWords({left: 1, over: false, currency: 'USD'})).toBe('$0.01 left');
  });
});
