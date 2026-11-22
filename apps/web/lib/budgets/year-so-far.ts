import {monthOf} from '../money-log/engine';
import {countedBetween} from '../money-log/counted';
import type {MoneyEntry} from '../money-log/schema';
import {budgetedIn, monthKey, movedIn, shiftMonth} from './engine';
import type {BudgetsRecord} from './schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Year-to-Date Comparison, LEDGER #385): "<year> so far against your
 * budgets" — per budgeted category, the budgets of this year's months so far (each month's own amount, with what was
 * moved into or out of it that month; carried money is not new money, so it is not added again) beside what was spent in
 * those months, and the difference as a fact ("€120.00 under so far"). A budget that started this year counts from its
 * first month, said so. This month counts whole, as the month's budget does.
 *
 * Spending is the shared rule's `countedBetween` (lib/money-log/counted.ts) per month, limited to the budget's category
 * and currency: the person's share of a shared cost, a split entry by its part in the category, nothing for an entry left
 * out of the figures, a transfer or a refund passed on, and a cost spread over months by its share in each month — the
 * same figure each month's budget counts. Per currency, never converted. No judgement and no advice. Pure.
 */
export type YearMonth = {month: string; budgeted: number; spent: number};
export type YearRow = {id: string; category: string; currency: string; from: string; to: string; budgeted: number; spent: number; difference: number; months: YearMonth[]};
export type YearTotals = {currency: string; budgeted: number; spent: number; difference: number; budgets: number};
export type YearSoFar = {year: string; to: string; rows: YearRow[]; totals: YearTotals[]};
export function yearSoFar(record: BudgetsRecord | null | undefined, entries: readonly MoneyEntry[], today: string): YearSoFar {
  const year = today.slice(0, 4), to = monthKey(today), rows: YearRow[] = [];
  for (const b of record?.budgets ?? []) {
    if (b.since > to) continue;
    const from = b.since > `${year}-01` ? b.since : `${year}-01`, months: YearMonth[] = [];
    for (let m = from; m <= to; m = shiftMonth(m, 1)) {
      const {start, end} = monthOf(`${m}-01`);
      months.push({month: m, budgeted: budgetedIn(b, m) + movedIn(record ?? undefined, b.id, m), spent: countedBetween(entries, start, end, {kind: 'expense', currency: b.currency, category: b.category}).get(b.currency) ?? 0});
    }
    const budgeted = months.reduce((s, x) => s + x.budgeted, 0), spent = months.reduce((s, x) => s + x.spent, 0);
    rows.push({id: b.id, category: b.category, currency: b.currency, from, to, budgeted, spent, difference: budgeted - spent, months});
  }
  rows.sort((a, b) => a.currency.localeCompare(b.currency) || a.difference - b.difference || a.category.localeCompare(b.category));
  const totals = new Map<string, YearTotals>();
  for (const r of rows) { const t = totals.get(r.currency) ?? {currency: r.currency, budgeted: 0, spent: 0, difference: 0, budgets: 0}; t.budgeted += r.budgeted; t.spent += r.spent; t.difference += r.difference; t.budgets++; totals.set(r.currency, t); }
  return {year, to, rows, totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))};
}
/** "under so far" / "over so far" / "exactly on" — a fact, never "overspending". */
export const differenceWord = (difference: number): 'under' | 'over' | 'even' => difference > 0 ? 'under' : difference < 0 ? 'over' : 'even';
