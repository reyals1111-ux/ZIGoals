import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays, localWeekday} from '../local-date';
import {minorUnits} from '../money-split/parts';
import {budgetDayParts} from '../money-log/counted';
import {fromCents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import type {Account} from '../accounts/schema';
import {budgetsSchema, type Budget, type BudgetsRecord} from './schema';

/**
 * Session AV lane 2 (Money group N11, LEDGER #212, #213, #216; Goodbudget; TIER 3 (stored format), a new additive key
 * `zigoals:budget-periods:v1`, so the budgets record itself is untouched and older builds read their monthly budgets as
 * before): how this person's budgets run between paydays —
 * - `payday` (1–28): the budget month starts on that day ("25 Nov – 24 Dec") instead of the 1st (#212);
 * - `every[budgetId]`: a budget that runs per week or per two weeks, its amount the month's × 12 / 52 (or / 26) (#212);
 * - `fill`: how one paycheck splits over the budgets; offered with one tap when income is logged, and `filled` keeps the
 *   income entries already used, so a fill is offered once per paycheck (#213);
 * - `debts[accountId]`: a debt linked to a budget, so the payments recorded on it count against that budget (#216).
 * Loose, versioned, bounded; device only (exported, restored, erased with the account; never synced). Pure.
 */
export const BUDGET_PERIODS_KEY = 'zigoals:budget-periods:v1';
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), amountText = z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/);
const record = <T extends z.ZodType>(value: T, max: number) => z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, x]) => id.safeParse(k).success && value.safeParse(x).success).slice(0, max)) : undefined, z.record(z.string(), value).optional());
export const budgetPeriodsSchema = z.looseObject({
  version: z.literal(1),
  payday: z.number().int().min(1).max(28).optional().catch(undefined),
  every: record(z.enum(['week', 'fortnight']), 100),
  fill: z.looseObject({items: z.array(z.looseObject({budgetId: id, amount: amountText})).max(100)}).optional().catch(undefined),
  filled: z.preprocess(v => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.length <= 80).slice(-50) : undefined, z.array(z.string()).optional()),
  debts: record(id, 50),
});
export type BudgetPeriods = z.infer<typeof budgetPeriodsSchema>;
export const emptyBudgetPeriods = (): BudgetPeriods => ({version: 1});
export const BUDGET_PERIODS: DeviceRecordSpec<BudgetPeriods> = {key: BUDGET_PERIODS_KEY, schema: budgetPeriodsSchema, empty: emptyBudgetPeriods};
export type Every = 'month' | 'week' | 'fortnight';

/** The budget month that holds `today` when it starts on day `payday` (1: the calendar month). */
export function payMonth(today: string, payday = 1): {start: string; end: string} {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const startOf = (yy: number, mm: number) => new Date(Date.UTC(yy, mm - 1, payday)).toISOString().slice(0, 10);
  const start = d >= payday ? startOf(y, m) : startOf(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
  const [sy, sm] = start.split('-').map(Number) as [number, number];
  return {start, end: addLocalDays(startOf(sm === 12 ? sy + 1 : sy, sm === 12 ? 1 : sm + 1), -1)};
}
/** The week (from Monday, or Sunday) or the two weeks (counted from the first week of 2024) that hold `today`. */
export function weekRange(today: string, every: 'week' | 'fortnight', startsOn: 'monday' | 'sunday' = 'monday'): {start: string; end: string} {
  const back = startsOn === 'monday' ? (localWeekday(today) + 6) % 7 : localWeekday(today);
  let start = addLocalDays(today, -back);
  if (every === 'fortnight') { const anchor = startsOn === 'monday' ? '2024-01-01' : '2023-12-31', weeks = Math.round((Date.parse(`${start}T12:00:00Z`) - Date.parse(`${anchor}T12:00:00Z`)) / (7 * 86_400_000)); if (((weeks % 2) + 2) % 2 === 1) start = addLocalDays(start, -7); }
  return {start, end: addLocalDays(start, every === 'week' ? 6 : 13)};
}
/** A budget's amount for one of its periods, in cents: the month's, or the month's × 12 / 52 (a week) or / 26 (two weeks). */
export const periodAmount = (monthlyCents: number, every: Every) => every === 'month' ? monthlyCents : Math.round(monthlyCents * 12 / (every === 'week' ? 52 : 26));
/** A debt payment's amount in cents (its base units brought to two decimals). */
const paymentCents = (p: Account['payments'][number]) => { const v = BigInt(p.value), d = p.decimals; return Number(d >= 2 ? v / 10n ** BigInt(d - 2) : v * 10n ** BigInt(2 - d)); };
export type PeriodRow = {budget: Budget; every: Every; start: string; end: string; amount: number; spent: number; debtPaid: number; left: number; over: boolean};
/**
 * Each budget in its own period holding `today`: its amount, what was spent in its category (split entries by their parts,
 * counted as the month budgets count them) and paid on its linked debts (same currency) in that period, and what is left. Never converted between currencies.
 */
export function periodRows(entries: readonly MoneyEntry[], budgets: BudgetsRecord, plan: BudgetPeriods, today: string, {accounts = [], startsOn = 'monday'}: {accounts?: readonly Account[]; startsOn?: 'monday' | 'sunday'} = {}): PeriodRow[] {
  return budgets.budgets.filter(b => b.since <= today.slice(0, 7)).map(budget => {
    const every: Every = plan.every?.[budget.id] ?? 'month', {start, end} = every === 'month' ? payMonth(today, plan.payday ?? 1) : weekRange(today, every, startsOn), name = budget.category.toLowerCase();
    let spent = 0, debtPaid = 0;
    // Review b2a #2: as the month budgets count (lib/money-log/counted.ts): no entry left out or transfer, the person's
    // own share of a shared cost, and an entry spread over months by each month's share, on its day in that month.
    for (const e of entries) if (e.kind === 'expense' && e.currency === budget.currency && e.date <= end) for (const piece of budgetDayParts(e)) if (piece.date >= start && piece.date <= end) for (const p of piece.parts) if (p.category.toLowerCase() === name) spent += p.cents;
    for (const a of accounts) if (plan.debts?.[a.id] === budget.id && a.currency === budget.currency) for (const p of a.payments) if (p.date >= start && p.date <= end) debtPaid += paymentCents(p);
    const amount = periodAmount(minorUnits(budget.monthly), every), left = amount - spent - debtPaid;
    return {budget, every, start, end, amount, spent, debtPaid, left, over: left < 0};
  });
}
/** Sets (or clears) the payday, a budget's period, or a debt's budget. */
export function setPeriods(plan: BudgetPeriods, patch: {payday?: number | null; every?: {budgetId: string; every: Every}; debt?: {accountId: string; budgetId: string | null}}): BudgetPeriods {
  const next: Record<string, unknown> = {...plan};
  if (patch.payday === null || patch.payday === 1) delete next.payday; else if (patch.payday !== undefined) next.payday = patch.payday;
  if (patch.every) { const every = {...(plan.every ?? {})}; if (patch.every.every === 'month') delete every[patch.every.budgetId]; else every[patch.every.budgetId] = patch.every.every; if (Object.keys(every).length) next.every = every; else delete next.every; }
  if (patch.debt) { const debts = {...(plan.debts ?? {})}; if (patch.debt.budgetId) debts[patch.debt.accountId] = patch.debt.budgetId; else delete debts[patch.debt.accountId]; if (Object.keys(debts).length) next.debts = debts; else delete next.debts; }
  return budgetPeriodsSchema.parse(next);
}

/* ---- A paycheck fill (Goodbudget's Scheduled Fill) ---------------------------------------------------------------- */

/** Saves how one paycheck splits (amounts per budget; an empty amount leaves that budget out). */
export function saveFill(plan: BudgetPeriods, items: readonly {budgetId: string; amount: string}[]): BudgetPeriods {
  const typed = items.filter(i => i.amount.trim()).map(i => ({budgetId: i.budgetId, amount: i.amount.trim()}));
  for (const i of typed) if (!amountText.safeParse(i.amount).success) throw new Error('Enter amounts such as 250 or 250.50.');
  const kept = typed.filter(i => Number(i.amount) > 0);
  const next: Record<string, unknown> = {...plan};
  if (kept.length) next.fill = {items: kept}; else delete next.fill;
  return budgetPeriodsSchema.parse(next);
}
/** The latest income entry of the last 14 days the fill was not used for yet (in a currency the fill holds), or null. */
export function incomeToFill(entries: readonly MoneyEntry[], budgets: BudgetsRecord, plan: BudgetPeriods, today: string): MoneyEntry | null {
  if (!plan.fill?.items.length) return null;
  const currencies = new Set(plan.fill.items.map(i => budgets.budgets.find(b => b.id === i.budgetId)?.currency).filter(Boolean)), used = new Set(plan.filled ?? []), from = addLocalDays(today, -14);
  return [...entries].filter(e => e.kind === 'income' && e.date >= from && e.date <= today && currencies.has(e.currency) && !used.has(e.id)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
/** The fill's total per currency (what it hands out of one paycheck). */
export function fillTotals(budgets: BudgetsRecord, plan: BudgetPeriods): {currency: string; cents: number}[] {
  const out = new Map<string, number>();
  for (const i of plan.fill?.items ?? []) { const b = budgets.budgets.find(x => x.id === i.budgetId); if (b) out.set(b.currency, (out.get(b.currency) ?? 0) + minorUnits(i.amount)); }
  return [...out].map(([currency, cents]) => ({currency, cents}));
}
/**
 * Uses the fill for one paycheck: each listed budget's amount becomes the fill's (a budget's amount is what it gets each
 * month, so a monthly paycheck's fill is the month's budget), and the income entry is marked used. Budgets that are gone
 * are skipped. Returns both records; Undo puts both back.
 */
export function applyFill(budgets: BudgetsRecord, plan: BudgetPeriods, incomeId: string): {budgets: BudgetsRecord; plan: BudgetPeriods; changed: number} {
  const fill = new Map((plan.fill?.items ?? []).map(i => [i.budgetId, i.amount])); let changed = 0;
  const next = budgetsSchema.parse({...budgets, budgets: budgets.budgets.map(b => { const amount = fill.get(b.id); if (amount === undefined || fromCents(minorUnits(amount)) === fromCents(minorUnits(b.monthly))) return b; changed++; return {...b, monthly: fromCents(minorUnits(amount))}; })});
  return {budgets: next, plan: budgetPeriodsSchema.parse({...plan, filled: [...(plan.filled ?? []), incomeId].slice(-50)}), changed};
}
