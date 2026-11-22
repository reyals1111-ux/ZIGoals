import {cents, monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';
import {monthView, shiftMonth} from './engine';
import type {BudgetsRecord} from './schema';
import {isCounted} from '../money-log/counted';

/**
 * Session AV (owner follow-up 1, F-MONTH-RECAP; Copilot's monthly review): a month in short, per currency (never
 * converted) — what was spent and came in, the change from the month before, the three largest categories, the largest
 * single expense, and how many budgets kept within their amount. From the person's own money log; no judgement. Pure.
 */
export type MonthRecap = {currency: string; spent: number; income: number; previousSpent: number; top: {category: string; cents: number}[]; largest: {note: string; cents: number; date: string} | null; budgets: {kept: number; of: number}};
export function monthRecap(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string, today: string): MonthRecap[] {
  const {start, end} = monthOf(`${month}-01`), prev = monthOf(`${shiftMonth(month, -1)}-01`);
  const view = monthView(entries, record, month, today), out = new Map<string, MonthRecap>();
  const get = (currency: string) => { const r = out.get(currency) ?? {currency, spent: 0, income: 0, previousSpent: 0, top: [], largest: null, budgets: {kept: 0, of: 0}}; out.set(currency, r); return r; };
  const byCat = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!isCounted(e)) continue; // Session AV lane 2 (money)
    const inMonth = e.date >= start && e.date <= end, inPrev = e.date >= prev.start && e.date <= prev.end;
    if (!inMonth && !inPrev) continue;
    const c = cents(e.amount);
    if (inPrev) { if (e.kind === 'expense') get(e.currency).previousSpent += c; continue; }
    const r = get(e.currency);
    if (e.kind === 'income') { r.income += c; continue; }
    if (e.kind !== 'expense') continue;
    r.spent += c;
    if (!r.largest || c > r.largest.cents) r.largest = {note: (e.note?.split(' · ')[0]?.trim() || e.category).slice(0, 80), cents: c, date: e.date};
    const cats = byCat.get(e.currency) ?? new Map<string, number>();
    for (const p of entryParts(e)) cats.set(p.category, (cats.get(p.category) ?? 0) + p.cents);
    byCat.set(e.currency, cats);
  }
  for (const row of view.rows) { const r = get(row.currency); r.budgets.of++; if (!row.over) r.budgets.kept++; }
  for (const [currency, cats] of byCat) get(currency).top = [...cats].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([category, c]) => ({category, cents: c}));
  return [...out.values()].filter(r => r.spent || r.income || r.budgets.of).sort((a, b) => a.currency.localeCompare(b.currency));
}
