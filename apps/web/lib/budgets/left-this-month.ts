import {billsThisMonth} from '../bills/month';
import type {BillsRecord} from '../bills/schema';
import {contributionCents, contributionDates, type ForecastPlanned, type PlannedContribution} from '../cash-forecast/model';
import {byCategory, monthOf, totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import {isMoneyCurrency} from '../visual-format';
import {budgetedIn, monthKey, movedIn} from './engine';
import type {BudgetsRecord} from './schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Leftover / "In My Pocket", LEDGER #291): "Left this month", one
 * currency at a time (never converted), each part listed:
 *   the month's income in the money log
 *   − what the money log shows spent this month
 *   − what the month's budgets still hold (each budget's own amount for the month, less what its category has spent;
 *     never below zero, so a budget spent past its amount counts through "spent")
 *   − the bills still due this month that the log does not show yet and that no budget covers (a bill whose category has
 *     a budget in its currency is in that budget already)
 *   − the Goal plans still to come this month (each active plan's dates from today to the month's end)
 *   − the planned one-off costs still open up to the month's end (lib/cash-forecast/planned.ts; an overdue one too).
 * The spending and income figures are Wealth → Spending's own (`totals`, `byCategory` in lib/money-log/engine.ts: left-out
 * entries, transfers and Settle-up refunds are not counted, a shared cost counts the person's share), so this agrees with
 * Spending, Budgets and NOVA. A fact from the person's records, never advice and never a projection. Pure.
 */
export type LeftItem = {name: string; cents: number; date?: string};
export type LeftThisMonth = {
  currency: string; month: string;
  income: number; incomeEntries: number; spent: number;
  budgets: {cents: number; items: LeftItem[]};
  bills: {cents: number; items: LeftItem[]};
  goals: {cents: number; items: LeftItem[]};
  planned: {cents: number; items: LeftItem[]};
  left: number;
};
export type LeftInput = {entries: readonly MoneyEntry[]; budgets?: BudgetsRecord | null; bills?: BillsRecord | null; contributions?: readonly PlannedContribution[]; planned?: readonly ForecastPlanned[]; today: string};
const fold = (s: string) => s.trim().toLowerCase();

export function leftThisMonth(input: LeftInput): LeftThisMonth[] {
  const {entries, today} = input, month = monthKey(today), {start, end} = monthOf(today);
  const rows = new Map<string, LeftThisMonth>();
  const row = (currency: string) => { let r = rows.get(currency); if (!r) { r = {currency, month, income: 0, incomeEntries: 0, spent: 0, budgets: {cents: 0, items: []}, bills: {cents: 0, items: []}, goals: {cents: 0, items: []}, planned: {cents: 0, items: []}, left: 0}; rows.set(currency, r); } return r; };
  // Income and spending: Wealth → Spending's own totals for the month.
  for (const t of totals(entries, start, end)) { const r = row(t.currency); r.income = t.income; r.spent = t.expenses; r.incomeEntries = entries.filter(e => e.kind === 'income' && e.currency === t.currency && e.date >= start && e.date <= end).length; }
  // What each budget still holds: its own amount this month, less what its category has spent (Wealth → Spending's byCategory).
  const spentIn = new Map(byCategory(entries, start, end).map(c => [`${c.currency}|${fold(c.category)}`, c.total]));
  const active = (input.budgets?.budgets ?? []).filter(b => b.since <= month), covered = new Set(active.map(b => `${b.currency}|${fold(b.category)}`));
  for (const b of active) {
    const held = budgetedIn(b, month) + movedIn(input.budgets ?? undefined, b.id, month), still = Math.max(0, held - (spentIn.get(`${b.currency}|${fold(b.category)}`) ?? 0));
    const r = row(b.currency); if (still > 0) { r.budgets.cents += still; r.budgets.items.push({name: b.category, cents: still}); }
  }
  // Bills still due this month, not in the log yet, that no budget covers.
  if (input.bills) {
    const byId = new Map(input.bills.bills.map(b => [b.id, b]));
    for (const l of billsThisMonth(input.bills, entries, today).lines) {
      if (l.state === 'seen' || l.due < today) continue;
      const bill = byId.get(l.billId), category = bill?.category || 'Bills';
      if (covered.has(`${l.currency}|${fold(category)}`)) continue;
      const r = row(l.currency); r.bills.cents += l.cents; r.bills.items.push({name: l.title, cents: l.cents, date: l.due});
    }
  }
  // Goal plans still to come this month.
  for (const p of input.contributions ?? []) {
    if (!isMoneyCurrency(p.asset)) continue;
    const cents = Number(contributionCents(p));
    if (cents <= 0) continue;
    for (const day of contributionDates(p, today, end)) { const r = row(p.asset); r.goals.cents += cents; r.goals.items.push({name: p.goalName, cents, date: day}); }
  }
  // Planned one-off costs still open up to the month's end.
  for (const p of input.planned ?? []) {
    if (p.date > end || !/^\d{1,10}(\.\d{1,2})?$/.test(p.amount)) continue;
    const cents = minorUnits(p.amount), r = row(p.currency); r.planned.cents += cents; r.planned.items.push({name: p.name, cents, date: p.date});
  }
  const out = [...rows.values()];
  for (const r of out) {
    for (const part of [r.bills, r.goals, r.planned]) part.items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.name.localeCompare(b.name));
    r.budgets.items.sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name));
    r.left = r.income - r.spent - r.budgets.cents - r.bills.cents - r.goals.cents - r.planned.cents;
  }
  return out.filter(r => r.income || r.spent || r.budgets.cents || r.bills.cents || r.goals.cents || r.planned.cents)
    .sort((a, b) => b.income - a.income || a.currency.localeCompare(b.currency));
}
