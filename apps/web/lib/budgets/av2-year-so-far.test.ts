// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {monthKey, monthView, shiftMonth} from './engine';
import type {BudgetsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';
import {differenceWord, yearSoFar} from './year-so-far';
import YearSoFarView from '../../components/wealth/budgets/year-so-far';

/**
 * Session AV lane 2, round 5 (money; Tiller's Year-to-Date Comparison, LEDGER #385): this year's budgets so far beside
 * what was spent, by the shared rule — each month the same figure Budgets counts for that month.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const A = '2026-01-01T09:00:00.000Z', TODAY = '2026-11-14';
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `ytd-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-03-05', createdAt: A, ...over});
const RECORD: BudgetsRecord = {version: 1, budgets: [
  {id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: true, since: '2025-06', months: {'2026-02': '250.00'}},
  {id: 'f', category: 'Fun', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-09'},
  {id: 'u', category: 'Groceries', currency: 'USD', monthly: '100.00', rollover: false, since: '2026-01'},
  {id: 'later', category: 'Gifts', currency: 'EUR', monthly: '20.00', rollover: false, since: '2026-12'},
], moves: [{id: 'm1', month: '2026-10', from: 'g', to: 'f', amount: '25.00', at: A}]};
const ENTRIES = [
  e({amount: '280.00', date: '2026-01-10'}), e({amount: '1200.00', date: '2026-07-01', spread: 12}), e({amount: '90.00', share: '30.00', date: '2026-11-03'}),
  e({amount: '60.00', excluded: true, date: '2026-05-01'}), e({amount: '100.00', category: 'Home', date: '2026-04-01', parts: [{amount: '70.00', category: 'Groceries'}, {amount: '30.00', category: 'Home'}]}),
  e({amount: '120.00', category: 'Fun', date: '2026-10-11'}), e({amount: '500.00', date: '2025-12-30'}), e({amount: '40.00', currency: 'USD', date: '2026-08-08'}),
];

describe('this year so far against the budgets', () => {
  const data = yearSoFar(RECORD, ENTRIES, TODAY);
  it('one row per budget that has started; each from January or its own first month to this month', () => {
    expect(data.year).toBe('2026');
    expect(data.rows.map(r => [r.id, r.from, r.to, r.months.length])).toEqual([['f', '2026-09', '2026-11', 3], ['g', '2026-01', '2026-11', 11], ['u', '2026-01', '2026-11', 11]]);
  });
  it('the budgets: each month’s own amount and the moves of that month; carried money not added again', () => {
    const g = data.rows.find(r => r.id === 'g')!, f = data.rows.find(r => r.id === 'f')!;
    expect(g.budgeted).toBe(30000 * 10 + 25000 - 2500);
    expect(f.budgeted).toBe(5000 * 3 + 2500);
  });
  it('spending by the shared rule: a spread cost by its share each month, the share of a shared cost, a split by its part, nothing left out', () => {
    const g = data.rows.find(r => r.id === 'g')!;
    // 280 + 100 × 5 (Jul–Nov shares of the 1,200 spread over 12 months) + 30 (the share) + 70 (the part); not the 60 left out, not 2025.
    expect(g.spent).toBe(28000 + 10000 * 5 + 3000 + 7000);
    expect(g.difference).toBe(g.budgeted - g.spent);
    expect(differenceWord(g.difference)).toBe('under');
    expect(differenceWord(data.rows.find(r => r.id === 'f')!.difference)).toBe('under');
  });
  it('each month equals what that month’s budget counts', () => {
    for (const r of data.rows) for (const m of r.months) {
      const row = monthView(ENTRIES, RECORD, m.month, TODAY).rows.find(x => x.id === r.id)!;
      expect(m.spent, `${r.id} ${m.month}`).toBe(row.spent);
    }
    expect(shiftMonth(monthKey(TODAY), 0)).toBe('2026-11');
  });
  it('per currency, never converted', () => {
    expect(data.totals.map(t => [t.currency, t.budgets])).toEqual([['EUR', 2], ['USD', 1]]);
    expect(data.totals.find(t => t.currency === 'USD')).toEqual({currency: 'USD', budgeted: 110000, spent: 4000, difference: 106000, budgets: 1});
  });
  it('no budgets, nothing to show', () => {
    expect(yearSoFar(null, ENTRIES, TODAY).rows).toEqual([]);
  });
});

describe('review b5k #9: the same category comparison as the month budget', () => {
  it('a budget “Cafe” does not count entries in “Café”, as its month budget does not; “cafe” in any case counts', () => {
    const record: BudgetsRecord = {version: 1, budgets: [{id: 'c', category: 'Cafe', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-11'}]};
    const entries = [e({category: 'Café', amount: '7.00', date: '2026-11-04'}), e({category: 'CAFE', amount: '3.00', date: '2026-11-05'})];
    const row = yearSoFar(record, entries, TODAY).rows[0]!;
    expect(row.spent).toBe(300);
    expect(row.months[0]!.spent).toBe(monthView(entries, record, '2026-11', TODAY).rows[0]!.spent);
  });
});

describe('the view', () => {
  it('a table per budget, the totals in words, one budget’s months on demand', async () => {
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => { root.render(createElement(YearSoFarView, {record: RECORD, entries: ENTRIES, today: TODAY})); });
    expect(host.querySelector('.money-ytd-total')?.textContent).toMatch(/^€.+ spent against €.+ budgeted in EUR — €.+ under so far \(2 budgets\)\.$/);
    expect(host.querySelectorAll('.money-ytd-table tbody tr')).toHaveLength(3);
    const open = [...host.querySelectorAll<HTMLButtonElement>('.money-ytd-open')].find(b => b.textContent === 'Fun')!;
    await act(async () => { open.click(); });
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelectorAll('.money-ytd-table')).toHaveLength(2);
    expect(host.textContent).toContain('Fun in 2026, month by month (EUR)');
    await act(async () => { root.unmount(); });
    host.remove();
  });
});
