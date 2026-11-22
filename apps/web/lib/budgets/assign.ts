import {csvSafeCell} from '../export/csv-safe';
import {isCounted} from '../money-log/counted';
import {cents, fromCents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';
import {budgetedIn, monthView, shiftMonth, type BudgetRow} from './engine';
import {MAX_MOVES, budgetsSchema, type Budget, type BudgetsRecord} from './schema';

/**
 * Session AV lane 2 (money; YNAB targets and assign mode, Monarch flex budgeting and non-monthly budgets, Copilot and
 * Rocket Money suggested budgets): pure, in cents per currency, never converted.
 * - What a budget needs this month: a weekly amount (times the weeks that start in the month), a monthly amount, a yearly
 *   amount by its month (what is still to set aside, over the months left), or the saving target's monthly share;
 *   Underfunded is what this month's amount falls short of it (a snoozed target counts nothing that month).
 * - Assign mode: a different amount for one month, "fund what is underfunded", "same as last month", "use the average"
 *   and moving money between two budgets in a month; every change is a plain record change Undo can put back.
 * - Flexible left: what is left in the flexible budgets together (Monarch's one flex number).
 * - A month's budget table as CSV.
 */
const DAY = 86_400_000;
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) * 12 + Number(b.slice(5, 7))) - (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)));
/** The weeks that start (on a Monday) in a month: 4 or 5. */
export function weeksIn(month: string): number {
  const first = Date.parse(`${month}-01T12:00:00Z`), next = Date.parse(`${shiftMonth(month, 1)}-01T12:00:00Z`);
  let n = 0; for (let t = first; t < next; t += DAY) if (new Date(t).getUTCDay() === 1) n++;
  return n;
}
export type Need = {cents: number; words: string};
/** What this budget needs in `month` by its own target, or null without one (or snoozed). */
export function neededIn(b: Budget, row: Pick<BudgetRow, 'carried' | 'target'>, month: string): Need | null {
  if (b.snoozed === month) return null;
  const n = b.need;
  if (n?.kind === 'weekly') { const w = weeksIn(month); return {cents: cents(n.amount) * w, words: `${fromCents(cents(n.amount))} a week × ${w} weeks`}; }
  if (n?.kind === 'monthly') return {cents: cents(n.amount), words: `${fromCents(cents(n.amount))} a month`};
  if (n?.kind === 'yearly') {
    // The next due month on or after this one (the same month each year).
    const dueMonth = n.month ? n.month.slice(5, 7) : '12';
    let due = `${month.slice(0, 4)}-${dueMonth}`; if (due < month) due = `${Number(month.slice(0, 4)) + 1}-${dueMonth}`;
    const left = monthsBetween(month, due) + 1, toGo = Math.max(0, cents(n.amount) - Math.max(0, row.carried));
    return {cents: Math.ceil(toGo / left), words: `${fromCents(cents(n.amount))} by ${due}, ${left} ${left === 1 ? 'month' : 'months'} left`};
  }
  if (row.target && (row.target.state === 'short' || row.target.state === 'on-track')) return {cents: row.target.perMonth, words: `towards ${fromCents(row.target.amount)} by ${row.target.by}`};
  return null;
}
export type AssignRow = BudgetRow & {need: Need | null; underfunded: number; group: string | null; bucket: 'fixed' | 'flexible' | 'non-monthly'; own: boolean; snoozed: boolean; period?: {every: number; amount: number}};
export type AssignView = {month: string; rows: AssignRow[]; underfunded: {currency: string; cents: number}[]; flexibleLeft: {currency: string; cents: number; count: number}[]};
export function assignView(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string, today: string): AssignView {
  const view = monthView(entries, record, month, today), byId = new Map(record.budgets.map(b => [b.id, b]));
  const rows: AssignRow[] = view.rows.map(r => {
    const b = byId.get(r.id)!, need = neededIn(b, r, month), underfunded = need ? Math.max(0, need.cents - r.budgeted) : 0;
    return {...r, need, underfunded, group: b.group ?? null, bucket: b.bucket ?? (b.period ? 'non-monthly' : 'fixed'), own: !!b.months?.[month], snoozed: b.snoozed === month, ...(b.period ? {period: {every: b.period.every, amount: cents(b.period.amount)}} : {})};
  });
  const sum = (pick: (r: AssignRow) => number, keep: (r: AssignRow) => boolean) => { const m = new Map<string, {currency: string; cents: number; count: number}>(); for (const r of rows) if (keep(r)) { const t = m.get(r.currency) ?? {currency: r.currency, cents: 0, count: 0}; t.cents += pick(r); t.count++; m.set(r.currency, t); } return [...m.values()].sort((a, b) => a.currency.localeCompare(b.currency)); };
  return {month, rows, underfunded: sum(r => r.underfunded, r => r.underfunded > 0).map(({currency, cents: c}) => ({currency, cents: c})), flexibleLeft: sum(r => r.left, r => r.bucket === 'flexible')};
}

/** The average spent in a budget's category over the last `n` whole months before `month` (counted entries), whole units up. */
export function averageSpent(entries: readonly MoneyEntry[], category: string, currency: string, month: string, n = 3): {cents: number; months: number} | null {
  const from = shiftMonth(month, -n), name = category.toLowerCase(), seen = new Set<string>();
  let total = 0;
  for (const e of entries) {
    const m = e.date.slice(0, 7);
    if (e.kind !== 'expense' || e.currency !== currency || !isCounted(e) || m < from || m >= month) continue;
    seen.add(m);
    for (const p of entryParts(e)) if (p.category.toLowerCase() === name) total += p.cents;
  }
  const logged = [...seen].length;
  if (!logged) return null;
  return {cents: Math.ceil(total / logged / 100) * 100, months: logged};
}

const withMonth = (b: Budget, month: string, amountCents: number | null): Budget => {
  const months = {...b.months};
  if (amountCents === null) delete months[month]; else months[month] = fromCents(amountCents);
  const {months: _m, ...rest} = b; void _m;
  return Object.keys(months).length ? {...rest, months: Object.fromEntries(Object.entries(months).sort().slice(-36))} : rest;
};
/** A different amount for one month (null: back to the monthly amount). */
export function setMonthAmount(record: BudgetsRecord, id: string, month: string, amountCents: number | null): BudgetsRecord {
  if (amountCents !== null && (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000_000)) throw new Error('Enter an amount above zero, with at most two decimals.');
  return budgetsSchema.parse({...record, budgets: record.budgets.map(b => b.id === id ? withMonth(b, month, amountCents) : b)});
}
export type QuickAssign = 'underfunded' | 'last-month' | 'average';
/** YNAB's quick-assign for every budget of the month (or the given ones): returns the record and how many changed. */
export function quickAssign(record: BudgetsRecord, entries: readonly MoneyEntry[], month: string, today: string, how: QuickAssign, ids?: ReadonlySet<string>): {record: BudgetsRecord; changed: number} {
  const view = assignView(entries, record, month, today), byRow = new Map(view.rows.map(r => [r.id, r]));
  let changed = 0;
  const budgets = record.budgets.map(b => {
    const row = byRow.get(b.id);
    if (!row || (ids && !ids.has(b.id))) return b;
    const now = budgetedIn(b, month);
    const want = how === 'underfunded' ? (row.underfunded > 0 ? now + row.underfunded : null) : how === 'last-month' ? budgetedIn(b, shiftMonth(month, -1)) : averageSpent(entries, b.category, b.currency, month)?.cents ?? null;
    if (want === null || want <= 0 || want === now) return b;
    changed++;
    return withMonth(b, month, want === cents(b.monthly) ? null : want);
  });
  return {record: budgetsSchema.parse({...record, budgets}), changed};
}
/** Moves money from one budget to another in a month (YNAB's move money); the amount must be left in the first. */
export function moveMoney(record: BudgetsRecord, entries: readonly MoneyEntry[], month: string, today: string, from: string, to: string, amountCents: number, id: string, at: string): BudgetsRecord {
  if (from === to) throw new Error('Choose two different budgets.');
  const view = monthView(entries, record, month, today), a = view.rows.find(r => r.id === from), b = view.rows.find(r => r.id === to);
  if (!a || !b) throw new Error('Both budgets must count in this month.');
  if (a.currency !== b.currency) throw new Error(`${a.category} is in ${a.currency} and ${b.category} in ${b.currency}: money is never converted.`);
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Enter an amount above zero.');
  if (amountCents > a.left) throw new Error(`${a.category} has ${fromCents(Math.max(0, a.left))} left this month; move at most that.`);
  if ((record.moves?.length ?? 0) >= MAX_MOVES) throw new Error(`Up to ${MAX_MOVES} moves are kept; remove an old one first.`);
  return budgetsSchema.parse({...record, moves: [...(record.moves ?? []), {id, month, from, to, amount: fromCents(amountCents), at}]});
}
export function removeMove(record: BudgetsRecord, id: string): BudgetsRecord {
  const moves = (record.moves ?? []).filter(m => m.id !== id), {moves: _m, ...rest} = record; void _m;
  return budgetsSchema.parse(moves.length ? {...rest, moves} : rest);
}
/** Sets the budget's own options (Monarch's bucket and groups, YNAB's target kinds and snooze, a starting balance, a non-monthly period). */
export type BudgetOptions = {need?: Budget['need'] | null; snooze?: string | null; bucket?: Budget['bucket'] | null; group?: string | null; start?: string | null; period?: Budget['period'] | null};
export function setOptions(record: BudgetsRecord, id: string, o: BudgetOptions): BudgetsRecord {
  return budgetsSchema.parse({...record, budgets: record.budgets.map(b => {
    if (b.id !== id) return b;
    const next: Record<string, unknown> = {...b};
    const put = (key: string, value: unknown) => { if (value === null || value === '' ) delete next[key]; else if (value !== undefined) next[key] = value; };
    put('need', o.need); put('snoozed', o.snooze); put('bucket', o.bucket); put('group', typeof o.group === 'string' ? o.group.trim().slice(0, 40) || null : o.group); put('start', o.start);
    if (o.period !== undefined) { put('period', o.period); if (o.period) { next.monthly = fromCents(Math.ceil(cents(o.period.amount) / o.period.every)); next.rollover = true; next.bucket = 'non-monthly'; } }
    return next as Budget;
  })});
}

/** The month's budget table as CSV (Monarch), one row per budget, amounts as plain decimals in each row's currency. */
export function budgetCsv(view: AssignView): string {
  const head = ['Month', 'Group', 'Category', 'Bucket', 'Currency', 'Budgeted', 'Carried in', 'Available', 'Spent', 'Left', 'Needed', 'Underfunded'];
  // Text cells are formula-safe and quoted; the amounts are plain decimals a spreadsheet reads as numbers (never text).
  const rows = view.rows.map(r => [...[view.month, r.group ?? '', r.category, r.bucket, r.currency].map(c => csvSafeCell(c)), ...[r.budgeted, r.carried, r.available, r.spent, r.left].map(fromCents), r.need ? fromCents(r.need.cents) : '', fromCents(r.underfunded)]);
  return [head.map(c => csvSafeCell(c)), ...rows].map(line => line.join(',')).join('\r\n') + '\r\n';
}
