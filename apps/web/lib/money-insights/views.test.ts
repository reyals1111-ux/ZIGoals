import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import CashFlowView from '../../components/wealth/spending/insights/cash-flow-view';
import CategoryTrendView from '../../components/wealth/spending/insights/category-trend-view';
import TopPayeesView from '../../components/wealth/spending/insights/top-payees-view';
import PaceView from '../../components/wealth/spending/insights/pace-view';
import AgeView from '../../components/wealth/spending/insights/age-view';
import SpendingInsights from '../../components/wealth/spending/insights/spending-insights';
import ReadyToAssign from '../../components/wealth/budgets/ready-to-assign';
import PriceChanges from '../../components/wealth/bills/price-changes';
import {detectBills} from '../bills/detect';
import {setBudget} from '../budgets/engine';
import {emptyBudgets} from '../budgets/schema';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AP (features 1 and 3–6): the new money views render from props alone, every figure as text or in a table,
 * gaps said as "No records", nothing converted between currencies and nothing said as a forecast.
 */
let n = 0;
const e = (date: string, amount: string, category = 'Groceries', kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR'): MoneyEntry =>
  ({id: `v${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
const TODAY = '2026-11-14';
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const text = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('Your money over time', () => {
  test('the container lists six views and opens none until asked (each view is its own chunk)', () => {
    const out = html(createElement(SpendingInsights, {entries: [], today: TODAY}));
    for (const label of ['Month by month', 'Categories over a year', 'Top payees', 'Your usual pace', 'Age of money', 'Tags']) expect(out).toContain(`>${label}</button>`);
    expect(out.match(/aria-pressed="false"/g)).toHaveLength(6);
  });
  test('month by month: a table beside the chart, a gap row, per currency', () => {
    const entries = [e('2026-08-01', '100.00', 'Salary', 'income'), e('2026-08-02', '40.00'), e('2026-11-02', '10.00'), e('2026-11-03', '3.00', 'Fun', 'expense', undefined, 'USD')];
    const out = text(html(createElement(CashFlowView, {entries, today: TODAY})));
    expect(out).toContain('Month by month · EUR');
    expect(out).toContain('Month by month · USD');
    expect(out).toMatch(/Sep 2026 – Oct 2026 No records/);
    expect(out).toMatch(/Aug 2026 €100\.00 €40\.00 \+€60\.00/);
    expect(out).toMatch(/Nov 2026 €0\.00 €10\.00 −€10\.00/);
    expect(html(createElement(CashFlowView, {entries, today: TODAY}))).toContain('role="img"');
    expect(text(html(createElement(CashFlowView, {entries: [], today: TODAY})))).toContain('Nothing logged yet');
  });
  test('categories over a year: a table of the first category with No records for months without any', () => {
    const out = text(html(createElement(CategoryTrendView, {entries: [e('2026-11-02', '10.00'), e('2026-09-02', '5.00', 'Fun')], today: TODAY})));
    expect(out).toContain('Groceries in EUR, Dec 2025 to Nov 2026');
    expect(out).toMatch(/Oct 2026 No records/);
    expect(out).toMatch(/Sep 2026 €0\.00/);
    expect(out).toMatch(/Nov 2026 €10\.00/);
  });
  test('top payees: this month beside last month', () => {
    const out = text(html(createElement(TopPayeesView, {entries: [e('2026-11-02', '10.00', 'Groceries', 'expense', 'Market'), e('2026-10-02', '7.00', 'Groceries', 'expense', 'Market')], today: TODAY})));
    expect(out).toMatch(/Payee Nov 2026 Oct 2026 Market €10\.00 €7\.00/);
  });
  test('your usual pace: says when there are not enough months, and is never a forecast', () => {
    const few = text(html(createElement(PaceView, {entries: [e('2026-10-02', '10.00')], today: TODAY})));
    expect(few).toContain('Not enough months yet: this needs at least 3 earlier months with spending logged in EUR, and there is 1.');
    const entries = ['2026-08-03', '2026-09-03', '2026-10-03'].map(d => e(d, '100.00')).concat(e('2026-11-02', '60.00'));
    const ok = text(html(createElement(PaceView, {entries, today: TODAY})));
    expect(ok).toContain('By the 14th you usually have spent €100.00 ; this month €60.00 , €40.00 less.');
    expect(ok).toContain('not a forecast');
    expect(ok).not.toMatch(/will|on track|by the end of the month/i);
  });
  test('age of money: the rule in one line; not enough records yet', () => {
    const out = text(html(createElement(AgeView, {entries: [e('2026-11-02', '10.00')], today: TODAY})));
    expect(out).toContain('first in, first out');
    expect(out).toContain('Not enough records yet: this needs at least 30 days of entries in EUR, and there are 13 days.');
  });
});

describe('Ready to assign and bill price changes', () => {
  test('Ready to assign says the figure, how it is made, and "nothing logged as income this month"', () => {
    const record = setBudget(setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false}, 'g', '2026-11'), {category: 'Fun', currency: 'USD', monthly: '20.00', rollover: false}, 'u', '2026-11');
    const out = text(html(createElement(ReadyToAssign, {entries: [e('2026-11-01', '2000.00', 'Salary', 'income')], record, month: '2026-11', current: true})));
    expect(out).toContain('Ready to assign: €1,700.00');
    expect(out).toContain('€2,000.00 logged as income this month, minus €300.00 your budgets hold');
    expect(out).toContain('Ready to assign in USD: nothing logged as income this month');
    // October: the budgets start in November and nothing was logged as income.
    expect(text(html(createElement(ReadyToAssign, {entries: [], record, month: '2026-10', current: false})))).toContain('nothing logged as income in Oct 2026, and no budgets yet');
    expect(text(html(createElement(ReadyToAssign, {entries: [e('2026-10-01', '100.00', 'Salary', 'income')], record, month: '2026-10', current: false})))).toContain('€100.00 logged as income in Oct 2026, minus €0.00 your budgets hold');
  });
  test('a price change reads "went up by X since <month>"', () => {
    const entries = ['2026-08-03', '2026-09-03', '2026-10-03'].map(d => e(d, '12.99', 'Subscriptions', 'expense', 'Netflix')).concat(e('2026-11-03', '13.49', 'Subscriptions', 'expense', 'Netflix'));
    const out = text(html(createElement(PriceChanges, {bills: [], candidates: detectBills(entries, TODAY), entries, today: TODAY})));
    expect(out).toContain('Netflix went up by €0.50 since Oct 2026 (€12.99 then, €13.49 now).');
    expect(html(createElement(PriceChanges, {bills: [], candidates: [], entries, today: TODAY}))).toBe('');
  });
});
