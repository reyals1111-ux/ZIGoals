import {describe, expect, test} from 'vitest';
import {cashFlow, categoryTrend, monthlyAverage, totalTrend} from './cash-flow';
import {crossover} from './crossover';
import {monthCalendar} from './month-days';
import {countedBetween, countedByCategoryBetween} from '../money-log/counted';
import {totals} from '../money-log/engine';
import {questionChart, questionEntries} from '../money-log/saved-searches';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Review b4f #2 (Blocker; the lead's decision): every figure that shows a month or a day spreads a cost over its months
 * exactly as the budgets do (budgetDayParts / budgetMonthParts) — the calendar, the 3/6/12-month average, All spending,
 * Month by month, investment income beside spending and the saved-search charts — so €1,200 spread over 12 months is
 * €100.00 in each of its months everywhere, and a period holding all twelve months still counts €1,200.00.
 */
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `s${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-10-05', createdAt: '2026-10-05T10:00:00.000Z', ...over});
const TODAY = '2026-11-14';
const insurance = e({amount: '1200.00', category: 'Bills', note: 'Insurance', date: '2026-09-10', spread: 12});
const entries = [insurance, e({}), e({date: '2026-11-05'}), e({kind: 'income', amount: '6.00', category: 'Interest', date: '2026-09-01'})];
const month = (m: string) => cashFlow(entries, 'EUR', TODAY).months.find(x => x.month === m)!;

describe('review b4f #2: a cost spread over months, one rule everywhere', () => {
  test('the calendar and Month by month: €100.00 in September, €110.00 in October and in November', () => {
    expect(monthCalendar(entries, '2026-09', 'EUR', TODAY).spent).toBe(10_000);
    expect(monthCalendar(entries, '2026-10', 'EUR', TODAY).spent).toBe(11_000);
    expect([month('2026-09').spending, month('2026-10').spending, month('2026-11').spending]).toEqual([10_000, 11_000, 11_000]);
  });
  test('the 3-month average, All spending and the category lines agree with the calendar', () => {
    const avg = monthlyAverage(entries, 'EUR', TODAY, 3);
    expect(avg.total).toEqual({average: 10_500, thisMonth: 11_000, diff: 500});
    expect(avg.categories.get('Bills')).toEqual({average: 10_000, thisMonth: 10_000, diff: 0});
    const view = categoryTrend(entries, 'EUR', TODAY);
    expect(totalTrend(entries, view, TODAY).slice(-3)).toEqual([10_000, 11_000, 11_000]);
    expect(view.categories.find(c => c.category === 'Bills')!.values.slice(-3)).toEqual([10_000, 10_000, 10_000]);
  });
  test('investment income is set beside the spread share, not the whole cost', () => {
    expect(crossover(entries, ['Interest'], 'EUR', TODAY).months.find(m => m.month === '2026-09')).toMatchObject({invest: 600, spending: 10_000, share: 0.06});
  });
  test('a saved search charts the share each month; its total is what the months hold so far', () => {
    const q = {id: 'q', name: 'Insurance', text: 'insurance'};
    const [chart] = questionChart(questionEntries(entries, q), q, TODAY);
    expect(chart!.bars.map(b => [b.key, b.cents])).toEqual([['2026-09', 10_000], ['2026-10', 10_000], ['2026-11', 10_000]]);
    expect(chart).toMatchObject({total: 30_000, monthly: 10_000});
  });
  test('a period holding every month of the spread counts the whole cost, as totals does', () => {
    expect(countedBetween([insurance], '2026-09-01', '2027-08-31').get('EUR')).toBe(totals([insurance], '2026-09-01', '2027-08-31')[0]!.expenses);
    expect(countedByCategoryBetween([insurance], '2026-09-01', '2027-08-31')[0]).toMatchObject({category: 'Bills', total: 120_000, count: 12});
  });
});
