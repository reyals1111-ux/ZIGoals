import {addMonths} from '../bills/cadence';
import {cents, monthOf} from '../money-log/engine';
import {amountText, currencyCode, type MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';
import {MAX_BUDGETS, MAX_ROLLOVER_MONTHS, budgetsSchema, type Budget, type BudgetsRecord} from './schema';

/**
 * Session AK (7.7): a month of category budgets against the money log, pure, in cents per currency (never converted).
 * With rollover on, what earlier months left unspent carries forward (from the budget's first month, at most twelve
 * months back); an overspend is not carried (a calm rule: no debt follows the person into a new month). Spending in
 * a category with no budget is listed apart. Facts from the log only; no projection, no advice.
 */
export const monthKey = (day: string) => day.slice(0, 7);
export const shiftMonth = (month: string, n: number) => addMonths(`${month}-01`, n).slice(0, 7);
const spentIn = (entries: readonly MoneyEntry[], month: string, category: string, currency: string) => {
  const {start, end} = monthOf(`${month}-01`), name = category.toLowerCase();
  let total = 0;
  // Session AK (lane M, item 22): a split entry counts by its parts (the whole entry otherwise), in exact cents.
  for (const e of entries) if (e.kind === 'expense' && e.currency === currency && e.date >= start && e.date <= end) for (const p of entryParts(e)) if (p.category.toLowerCase() === name) total += p.cents;
  return total;
};
/** What earlier months left unspent and carried into `month` (0 without rollover). */
export function carriedInto(budget: Budget, entries: readonly MoneyEntry[], month: string): number {
  if (!budget.rollover || month <= budget.since) return 0;
  let from = shiftMonth(month, -MAX_ROLLOVER_MONTHS);
  if (from < budget.since) from = budget.since;
  let carry = 0;
  for (let m = from; m < month; m = shiftMonth(m, 1)) carry = Math.max(0, cents(budget.monthly) + carry - spentIn(entries, m, budget.category, budget.currency));
  return carry;
}
export type BudgetRow = {id: string; category: string; currency: string; budgeted: number; carried: number; available: number; spent: number; left: number; over: boolean; rollover: boolean; share: number};
export type MonthView = {month: string; rows: BudgetRow[]; unbudgeted: {category: string; currency: string; spent: number}[]; totals: {currency: string; available: number; spent: number; left: number}[]; daysLeft: number | null};
export function monthView(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string, today: string): MonthView {
  const active = record.budgets.filter(b => b.since <= month);
  const rows = active.map(b => {
    const budgeted = cents(b.monthly), carried = carriedInto(b, entries, month), available = budgeted + carried, spent = spentIn(entries, month, b.category, b.currency);
    return {id: b.id, category: b.category, currency: b.currency, budgeted, carried, available, spent, left: available - spent, over: spent > available, rollover: b.rollover, share: available > 0 ? Math.min(1, spent / available) : spent > 0 ? 1 : 0};
  }).sort((a, b) => a.currency.localeCompare(b.currency) || b.spent - a.spent || a.category.localeCompare(b.category));
  const budgeted = new Set(active.map(b => `${b.currency}|${b.category.toLowerCase()}`)), {start, end} = monthOf(`${month}-01`);
  const loose = new Map<string, {category: string; currency: string; spent: number}>();
  for (const e of entries) {
    if (e.kind !== 'expense' || e.date < start || e.date > end) continue;
    for (const p of entryParts(e)) {
      if (budgeted.has(`${e.currency}|${p.category.toLowerCase()}`)) continue;
      const k = `${e.currency}|${p.category}`, row = loose.get(k) ?? {category: p.category, currency: e.currency, spent: 0};
      row.spent += p.cents; loose.set(k, row);
    }
  }
  const totals = new Map<string, {currency: string; available: number; spent: number; left: number}>();
  for (const r of rows) { const t = totals.get(r.currency) ?? {currency: r.currency, available: 0, spent: 0, left: 0}; t.available += r.available; t.spent += r.spent; t.left += r.left; totals.set(r.currency, t); }
  const daysLeft = today >= start && today <= end ? Number(end.slice(8)) - Number(today.slice(8)) + 1 : null;
  return {month, rows, unbudgeted: [...loose.values()].sort((a, b) => b.spent - a.spent), totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)), daysLeft};
}
export type BudgetInput = {category: string; currency: string; monthly: string; rollover: boolean};
export function budgetIssue(input: BudgetInput): string | null {
  if (!input.category.trim()) return 'Choose a category.';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!amountText.safeParse(input.monthly).success) return 'Enter the monthly amount above zero, with at most two decimals.';
  return null;
}
/** Adds a budget, or changes the one for that category and currency (keeping its first month). */
export function setBudget(record: BudgetsRecord, input: BudgetInput, id: string, month: string): BudgetsRecord {
  const issue = budgetIssue(input); if (issue) throw Error(issue);
  const same = record.budgets.find(b => b.currency === input.currency && b.category.toLowerCase() === input.category.trim().toLowerCase());
  if (!same && record.budgets.length >= MAX_BUDGETS) throw Error(`Up to ${MAX_BUDGETS} budgets.`);
  const next: Budget = same ? {...same, monthly: input.monthly, rollover: input.rollover} : {id, category: input.category.trim(), currency: input.currency, monthly: input.monthly, rollover: input.rollover, since: month};
  return budgetsSchema.parse({...record, budgets: same ? record.budgets.map(b => b.id === same.id ? next : b) : [...record.budgets, next]});
}
export const removeBudget = (record: BudgetsRecord, id: string): BudgetsRecord => budgetsSchema.parse({...record, budgets: record.budgets.filter(b => b.id !== id)});
