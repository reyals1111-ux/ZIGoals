// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {categoryTrend, monthlyAverage, totalTrend} from './cash-flow';
import {crossover, incomeCategoriesUsed, withInvestMark} from './crossover';
import {byCategory, totals} from '../money-log/engine';
import {emptyMoneyLog, MONEY_LOG_KEY, moneyLogSchema, type MoneyEntry} from '../money-log/schema';
import CategoryTrendView from '../../components/wealth/spending/insights/category-trend-view';
import CrossoverView from '../../components/wealth/spending/insights/crossover-view';

/**
 * Session AV lane 2, round 4 (money; Actual Budget): the monthly average (LEDGER #343) and investment income beside
 * spending (#345), every figure Wealth → Spending's own `totals` / `byCategory`; facts, never a target.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
let n = 0;
const e = (date: string, amount: string, category = 'Groceries', over: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `a${n++}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...over});
const TODAY = '2026-11-14';
const text = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&rsquo;/g, '’').replace(/\s+/g, ' ');
// Groceries 100, 200, (no records in August), 150 → a 6-month average over 3 months of 150; this month so far 120 (one shared).
const log = [e('2026-06-05', '100.00'), e('2026-07-05', '200.00'), e('2026-09-05', '150.00'), e('2026-09-06', '60.00', 'Fun'), e('2026-11-02', '100.00'), e('2026-11-03', '40.00', 'Groceries', {share: '20.00'}), e('2026-11-04', '500.00', 'Groceries', {excluded: true})];

describe('the monthly average (#343)', () => {
  test('over the months before this one with records, beside this month so far, by byCategory and totals', () => {
    const avg = monthlyAverage(log, 'EUR', TODAY, 6);
    expect(avg.recorded).toBe(3);
    expect(avg.categories.get('Groceries')).toEqual({average: 15_000, thisMonth: 12_000, diff: -3_000});
    expect(avg.categories.get('Fun')).toEqual({average: 2_000, thisMonth: 0, diff: -2_000});
    expect(avg.total).toEqual({average: 17_000, thisMonth: 12_000, diff: -5_000});
    expect(avg.total.thisMonth).toBe(totals(log, '2026-11-01', TODAY)[0]!.expenses);
    expect(monthlyAverage(log, 'EUR', TODAY, 3).recorded).toBe(1);
    expect(monthlyAverage([e('2026-11-02', '5.00')], 'EUR', TODAY, 3).total.average).toBeNull();
  });
  test('the trend counts a shared cost by the person’s share, as This month by category does', () => {
    const view = categoryTrend(log, 'EUR', TODAY);
    expect(view.categories.find(c => c.category === 'Groceries')!.values.at(-1)).toBe(byCategory(log, '2026-11-01', TODAY)[0]!.total);
    expect(totalTrend(log, view, TODAY).slice(-6)).toEqual([10_000, 20_000, null, 21_000, null, 12_000]);
  });
  test('the view: a dashed average on each line, the words as a fact, 3 / 6 / 12', () => {
    const html = renderToStaticMarkup(createElement(CategoryTrendView, {entries: log, today: TODAY}));
    const out = text(html);
    expect(out).toContain('All spending · Nov 2026 so far €120.00, €50.00 below your 6-month average of €170.00 (over the 3 months with records).');
    expect(out).toContain('Groceries: Nov 2026 so far €120.00, €30.00 below your 6-month average of €150.00 (over the 3 months with records).');
    expect(out).toContain('6-month average €150.00');
    expect(html).toContain('class="avg"');
    expect(html).toContain('aria-pressed="true">6-month average</button>');
    expect(out).not.toMatch(/overspen|too much|on target|should|aim for/i);
    expect(out).toContain("Figures, not a target.");
  });
});

describe('investment income beside spending (#345)', () => {
  const income = (date: string, amount: string, category: string) => e(date, amount, category, {kind: 'income'});
  const entries = [...log, income('2026-10-01', '6.00', 'Interest'), income('2026-11-01', '9.00', 'Dividends'), income('2026-11-01', '2000.00', 'Salary'), e('2026-10-10', '100.00')];
  test('the marked income each month beside that month’s spending, as a share; a gap is unknown', () => {
    const r = crossover(entries, ['Interest', 'dividends'], 'EUR', TODAY);
    expect(r.months).toHaveLength(24);
    const oct = r.months.find(m => m.month === '2026-10')!, nov = r.months.find(m => m.month === '2026-11')!, aug = r.months.find(m => m.month === '2026-08')!;
    expect(oct).toMatchObject({invest: 600, spending: 10_000, share: 0.06});
    expect(nov).toMatchObject({invest: 900, spending: 12_000});
    expect(nov.spending).toBe(totals(entries, '2026-11-01', TODAY)[0]!.expenses);
    expect(aug).toMatchObject({recorded: false, share: null});
    expect(r).toMatchObject({invest: 1_500, latest: {month: '2026-10'}});
    expect(incomeCategoriesUsed(entries)).toEqual(['Dividends', 'Interest', 'Salary']);
  });
  test('the marks: the person’s own, kept on the log, at most 30; the record reads', () => {
    let l = withInvestMark(emptyMoneyLog(), 'Interest', true);
    l = withInvestMark(l, 'Dividends', true);
    expect(moneyLogSchema.parse(l).investIncome).toEqual(['Interest', 'Dividends']);
    expect(withInvestMark(withInvestMark(l, 'interest', false), 'Dividends', false)).toEqual(emptyMoneyLog());
  });
  test('the view: marks, the share in words and a table; never a projection', async () => {
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries, investIncome: ['Interest', 'Dividends']}));
    const box = document.createElement('div'); document.body.append(box);
    const root = createRoot(box);
    await act(async () => { root.render(createElement(CrossoverView, {entries, today: TODAY})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.querySelector('.money-saved-total')!.textContent).toBe('EUR, the last 24 months (5 with records): €15.00 investment income beside €730.00 spending — it covers 2.1% of spending. In Oct 2026: 6%.');
    expect([...box.querySelectorAll('input[type="checkbox"]')].map(i => (i as HTMLInputElement).checked)).toEqual([true, true, false]);
    expect(box.textContent).not.toMatch(/years to|freedom in|will cover/i);
    await act(async () => { root.unmount(); });
  });
});
