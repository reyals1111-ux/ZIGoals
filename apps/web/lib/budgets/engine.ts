import {addMonths} from '../bills/cadence';
import {cents, monthOf} from '../money-log/engine';
import {amountText, currencyCode, type MoneyEntry} from '../money-log/schema';
import {budgetMonthParts, isSpending, reachesMonth} from '../money-log/counted';
import {MAX_BUDGETS, MAX_ROLLOVER_MONTHS, budgetsSchema, type Budget, type BudgetsRecord} from './schema';
import {hasOwnOrder, rankOf} from './order';

/**
 * Session AK (7.7): a month of category budgets against the money log, pure, in cents per currency (never converted).
 * With rollover on, what earlier months left unspent carries forward (from the budget's first month, at most twelve
 * months back); an overspend is not carried (a calm rule: no debt follows the person into a new month). Spending in
 * a category with no budget is listed apart. Facts from the log only; no projection, no advice.
 */
export const monthKey = (day: string) => day.slice(0, 7);
export const shiftMonth = (month: string, n: number) => addMonths(`${month}-01`, n).slice(0, 7);
const spentIn = (entries: readonly MoneyEntry[], month: string, category: string, currency: string) => {
  const name = category.toLowerCase();
  let total = 0;
  // Session AK (lane M, item 22): a split entry counts by its parts (the whole entry otherwise), in exact cents.
  // Session AV lane 2 (money): an entry left out or a transfer counts nothing; one spread over months counts its share.
  for (const e of entries) if (isSpending(e) && e.currency === currency && reachesMonth(e, month)) for (const p of budgetMonthParts(e, month)) if (p.category.toLowerCase() === name) total += p.cents;
  return total;
};
/**
 * Session AV lane 2 (money; YNAB's assign mode): a budget's own amount in a month — the amount set for that month, else
 * its monthly amount — and what was moved into (+) or out of (−) it that month (`moves`). Older records have neither.
 */
export const budgetedIn = (budget: Budget, month: string) => cents(budget.months?.[month] ?? budget.monthly);
export function movedIn(record: Pick<BudgetsRecord, 'moves'> | undefined, budgetId: string, month: string): number {
  let n = 0;
  for (const m of record?.moves ?? []) if (m.month === month) { if (m.to === budgetId) n += cents(m.amount); if (m.from === budgetId) n -= cents(m.amount); }
  return n;
}
/** Session AV lane 2 (money; Monarch's starting balance): carried into the budget's first month (with rollover). */
const startOf = (budget: Budget) => budget.rollover && budget.start ? cents(budget.start) : 0;
/** What earlier months left unspent and carried into `month` (0 without rollover). */
export function carriedInto(budget: Budget, entries: readonly MoneyEntry[], month: string, record?: Pick<BudgetsRecord, 'moves'>): number {
  if (budget.rollover && month === budget.since && !budget.freshFrom) return startOf(budget);
  if (!budget.rollover || month <= budget.since) return 0;
  // Session AV (F-FRESH-MONTH): a fresh start counts as a new beginning: no carry into that month, and none from before it.
  const start = budget.freshFrom && budget.freshFrom > budget.since ? budget.freshFrom : budget.since;
  if (month <= start) return 0;
  let from = shiftMonth(month, -MAX_ROLLOVER_MONTHS);
  if (from < start) from = start;
  let carry = from === budget.since && start === budget.since ? startOf(budget) : 0;
  for (let m = from; m < month; m = shiftMonth(m, 1)) carry = Math.max(0, budgetedIn(budget, m) + movedIn(record, budget.id, m) + carry - spentIn(entries, m, budget.category, budget.currency));
  return carry;
}
/**
 * Session AV (F-BUDGET-TARGETS): a budget's target in the month shown — the amount and month, what this month leaves set
 * aside (its Left), what is still to go, and what each later month needs to reach it ("from next month"); `state` says
 * reached, on track (the monthly amount covers it), short (by `short` a month) or past (the month has gone by).
 */
export type BudgetTargetLine = {amount: number; by: string; setAside: number; toGo: number; perMonth: number; monthsLeft: number; state: 'reached' | 'on-track' | 'short' | 'past'; short: number};
export type BudgetRow = {id: string; category: string; currency: string; budgeted: number; carried: number; available: number; spent: number; left: number; over: boolean; rollover: boolean; share: number; target?: BudgetTargetLine};
const monthsFrom = (a: string, b: string) => (Number(b.slice(0, 4)) * 12 + Number(b.slice(5, 7))) - (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)));
export function targetLine(target: {amount: string; by: string}, month: string, budgeted: number, left: number): BudgetTargetLine {
  const amount = cents(target.amount), setAside = Math.max(0, left), toGo = Math.max(0, amount - setAside), monthsLeft = monthsFrom(month, target.by);
  if (toGo === 0) return {amount, by: target.by, setAside, toGo, perMonth: 0, monthsLeft, state: 'reached', short: 0};
  if (monthsLeft < 0) return {amount, by: target.by, setAside, toGo, perMonth: 0, monthsLeft: 0, state: 'past', short: 0};
  // The target's own month: no later month is left, so what is still to go is short now.
  if (monthsLeft === 0) return {amount, by: target.by, setAside, toGo, perMonth: toGo, monthsLeft: 0, state: 'short', short: toGo};
  const perMonth = Math.ceil(toGo / monthsLeft);
  return {amount, by: target.by, setAside, toGo, perMonth, monthsLeft, state: budgeted >= perMonth ? 'on-track' : 'short', short: Math.max(0, perMonth - budgeted)};
}
export type MonthView = {month: string; rows: BudgetRow[]; unbudgeted: {category: string; currency: string; spent: number}[]; totals: {currency: string; available: number; spent: number; left: number}[]; daysLeft: number | null};
export function monthView(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string, today: string): MonthView {
  const active = record.budgets.filter(b => b.since <= month), own = hasOwnOrder(active), rank = rankOf(record.budgets);
  const rows = active.map(b => {
    const budgeted = budgetedIn(b, month) + movedIn(record, b.id, month), carried = carriedInto(b, entries, month, record), available = budgeted + carried, spent = spentIn(entries, month, b.category, b.currency);
    return {id: b.id, category: b.category, currency: b.currency, budgeted, carried, available, spent, left: available - spent, over: spent > available, rollover: b.rollover, share: available > 0 ? Math.min(1, spent / available) : spent > 0 ? 1 : 0, ...(b.target ? {target: targetLine(b.target, month, budgeted, available - spent)} : {})};
  // Round 6 (#429): in the person's own order when they set one (each currency apart), else the most spent first.
  }).sort((a, b) => a.currency.localeCompare(b.currency) || (own ? rank.get(a.id)! - rank.get(b.id)! : 0) || b.spent - a.spent || a.category.localeCompare(b.category));
  const budgeted = new Set(active.map(b => `${b.currency}|${b.category.toLowerCase()}`)), {start, end} = monthOf(`${month}-01`);
  const loose = new Map<string, {category: string; currency: string; spent: number}>();
  for (const e of entries) {
    if (!isSpending(e) || !reachesMonth(e, month)) continue; // Round 6 (#425): a refund lowers its category
    for (const p of budgetMonthParts(e, month)) {
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
/** Session AV (F-BUDGET-TARGETS): `target` set, kept (undefined) or removed (null). */
export type BudgetInput = {category: string; currency: string; monthly: string; rollover: boolean; target?: {amount: string; by: string} | null};
export function budgetIssue(input: BudgetInput): string | null {
  if (!input.category.trim()) return 'Choose a category.';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!amountText.safeParse(input.monthly).success) return 'Enter the monthly amount above zero, with at most two decimals.';
  if (input.target) {
    if (!amountText.safeParse(input.target.amount).success) return 'Enter the amount to save above zero, with at most two decimals.';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.target.by)) return 'Choose the month to reach it by.';
    if (!input.rollover) return 'Saving towards an amount needs rollover on, so what is left each month adds up.';
  }
  return null;
}
/** Adds a budget, or changes the one for that category and currency (keeping its first month). */
export function setBudget(record: BudgetsRecord, input: BudgetInput, id: string, month: string): BudgetsRecord {
  const issue = budgetIssue(input); if (issue) throw Error(issue);
  const same = record.budgets.find(b => b.currency === input.currency && b.category.toLowerCase() === input.category.trim().toLowerCase());
  if (!same && record.budgets.length >= MAX_BUDGETS) throw Error(`Up to ${MAX_BUDGETS} budgets.`);
  if (input.target && input.target.by < month) throw Error('Choose this month or a later one to reach it by.');
  const base: Budget = same ? {...same, monthly: input.monthly, rollover: input.rollover} : {id, category: input.category.trim(), currency: input.currency, monthly: input.monthly, rollover: input.rollover, since: month};
  const {target: _old, ...rest} = base; void _old;
  const next: Budget = input.target === null ? rest : input.target ? {...rest, target: {amount: input.target.amount, by: input.target.by}} : base;
  return budgetsSchema.parse({...record, budgets: same ? record.budgets.map(b => b.id === same.id ? next : b) : [...record.budgets, next]});
}
export const removeBudget = (record: BudgetsRecord, id: string): BudgetsRecord => budgetsSchema.parse({...record, budgets: record.budgets.filter(b => b.id !== id)});

/**
 * Session AV (owner follow-up 1, F-FRESH-MONTH; YNAB's fresh start): every rollover budget starts `month` fresh, so what
 * earlier months left no longer carries into it (the carry is worked out from the money log, so Undo — the record as it
 * was — brings it back exactly). Budgets without rollover are untouched.
 */
export function startFresh(record: BudgetsRecord, month: string): BudgetsRecord {
  return budgetsSchema.parse({...record, budgets: record.budgets.map(b => b.rollover && b.since < month ? {...b, freshFrom: month} : b)});
}
/** Whether anything carries into `month` that a fresh start would clear. */
export const carriesInto = (record: BudgetsRecord, entries: readonly MoneyEntry[], month: string) => record.budgets.some(b => b.since <= month && carriedInto(b, entries, month, record) > 0);
