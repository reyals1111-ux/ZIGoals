import {addLocalDays, localWeekday} from '../local-date';
import {monthDueDates} from '../bills/month';
import type {BillsRecord} from '../bills/schema';
import {cents, monthOf} from '../money-log/engine';
import {fromMinor, minorUnits} from '../money-split/parts';
import {budgetedIn} from './engine';
import {budgetsInOrder} from './order';
import {budgetPeriodsSchema, type BudgetPeriods} from './periods';
import type {BudgetsRecord} from './schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's paycheck planning, LEDGER #426): two or more paychecks a month (the 1st
 * and the 15th, or each Friday), each budget and bill set against one of them, and per paycheck what it holds in the month
 * (its own amount on each of its days) and what is left once its lines are covered. From the person's own amounts only;
 * never a suggested amount and never advice. Each currency apart. Pure.
 */
export const MAX_PAYCHECKS = 6;
export type Paycheck = NonNullable<BudgetPeriods['paychecks']>['items'][number];
export type PaycheckInput = {name: string; every: Paycheck['every']; day: number; amount: string; currency: string};
const ANCHOR = '2024-01-01'; // a Monday: two-weekly paychecks count their weeks from here, as the two-week budgets do
const weeksFrom = (day: string) => Math.floor((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${ANCHOR}T12:00:00Z`)) / (7 * 86_400_000));

/** The days a paycheck comes in `month` ("2026-11"): its day of the month (the last day when the month is shorter), or each of its weekdays (every week, or every other week). */
export function paydaysIn(p: Pick<Paycheck, 'every' | 'day'>, month: string): string[] {
  const {start, end} = monthOf(`${month}-01`), last = Number(end.slice(8));
  if (p.every === 'month') return [`${month}-${String(Math.min(Math.max(1, p.day), last)).padStart(2, '0')}`];
  const out: string[] = [];
  for (let d = start; d <= end; d = addLocalDays(d, 1)) if (localWeekday(d) === p.day % 7 && (p.every === 'week' || ((weeksFrom(d) % 2) + 2) % 2 === 0)) out.push(d);
  return out;
}
export type PaycheckLine = {key: string; kind: 'budget' | 'bill'; name: string; currency: string; cents: number; due?: string[]};
export type PaycheckPlan = {paycheck: Paycheck; dates: string[]; holds: number; lines: PaycheckLine[]; covered: number; left: number};
export type PaycheckMonth = {month: string; plans: PaycheckPlan[]; unset: PaycheckLine[]};
/** Every budget (its amount that month) and bill (each due date that month) that could be set against a paycheck, budgets in the person's order. */
export function monthLines(budgets: BudgetsRecord, bills: BillsRecord | null | undefined, month: string, today: string): PaycheckLine[] {
  const {start, end} = monthOf(`${month}-01`);
  const own = budgetsInOrder(budgets.budgets).filter(b => b.since <= month).map((b): PaycheckLine => ({key: `b:${b.id}`, kind: 'budget', name: b.category, currency: b.currency, cents: budgetedIn(b, month)}));
  const due = (bills?.bills ?? []).flatMap((b): PaycheckLine[] => { const dates = monthDueDates(b.nextDue, b.cadence, start, end, today > end ? addLocalDays(end, 1) : today); return dates.length ? [{key: `bill:${b.id}`, kind: 'bill', name: b.title, currency: b.currency, cents: cents(b.amount) * dates.length, due: dates}] : []; });
  return [...own, ...due];
}
/** The month by paycheck: each one's days, what it holds, the lines set against it, what they cover and what is left; then the lines set against none. */
export function paycheckMonth(budgets: BudgetsRecord, bills: BillsRecord | null | undefined, plan: BudgetPeriods, month: string, today: string): PaycheckMonth {
  const items = plan.paychecks?.items ?? [], lines = plan.paychecks?.lines ?? {}, all = monthLines(budgets, bills, month, today);
  const plans = items.map((paycheck): PaycheckPlan => {
    const dates = paydaysIn(paycheck, month), holds = minorUnits(paycheck.amount) * dates.length;
    const mine = all.filter(l => lines[l.key] === paycheck.id && l.currency === paycheck.currency), covered = mine.reduce((s, l) => s + l.cents, 0);
    return {paycheck, dates, holds, lines: mine, covered, left: holds - covered};
  });
  const set = new Set(plans.flatMap(p => p.lines.map(l => l.key)));
  return {month, plans, unset: all.filter(l => !set.has(l.key))};
}
/** Why a paycheck cannot be kept, in plain words, or null. */
export function paycheckIssue(input: PaycheckInput): string | null {
  if (!input.name.trim()) return 'Give the paycheck a name, such as “1st of the month”.';
  if (input.name.trim().length > 40) return 'A name has at most 40 characters.';
  if (!/^[A-Z]{3}$/.test(input.currency)) return 'Choose a currency.';
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(input.amount.trim()) || Number(input.amount) <= 0) return 'Enter what this paycheck brings in, such as 1250 or 1250.50.';
  if (input.every === 'month' ? !(input.day >= 1 && input.day <= 31) : !(input.day >= 0 && input.day <= 6)) return input.every === 'month' ? 'Choose a day of the month, 1 to 31.' : 'Choose a day of the week.';
  return null;
}
/** Adds a paycheck, or changes the one with `id`. */
export function savePaycheck(plan: BudgetPeriods, input: PaycheckInput, id: string): BudgetPeriods {
  const issue = paycheckIssue(input); if (issue) throw new Error(issue);
  const items = plan.paychecks?.items ?? [], item: Paycheck = {id, name: input.name.trim(), every: input.every, day: Math.floor(input.day), amount: fromMinor(minorUnits(input.amount.trim())), currency: input.currency};
  const has = items.some(p => p.id === id);
  if (!has && items.length >= MAX_PAYCHECKS) throw new Error(`Up to ${MAX_PAYCHECKS} paychecks.`);
  return budgetPeriodsSchema.parse({...plan, paychecks: {...plan.paychecks, items: has ? items.map(p => p.id === id ? item : p) : [...items, item], lines: plan.paychecks?.lines ?? {}}});
}
/** Removes a paycheck; the lines set against it are set against none. */
export function removePaycheck(plan: BudgetPeriods, id: string): BudgetPeriods {
  const items = (plan.paychecks?.items ?? []).filter(p => p.id !== id), lines = Object.fromEntries(Object.entries(plan.paychecks?.lines ?? {}).filter(([, v]) => v !== id));
  const next: Record<string, unknown> = {...plan};
  if (items.length) next.paychecks = {...plan.paychecks, items, lines}; else delete next.paychecks;
  return budgetPeriodsSchema.parse(next);
}
/** Sets one budget (`b:<id>`) or bill (`bill:<id>`) against a paycheck, or against none (null). */
export function setLine(plan: BudgetPeriods, key: string, paycheckId: string | null): BudgetPeriods {
  if (!plan.paychecks) throw new Error('Add a paycheck first.');
  if (paycheckId && !plan.paychecks.items.some(p => p.id === paycheckId)) throw new Error('That paycheck is gone.');
  const lines = {...(plan.paychecks.lines ?? {})};
  if (paycheckId) lines[key] = paycheckId; else delete lines[key];
  return budgetPeriodsSchema.parse({...plan, paychecks: {...plan.paychecks, lines}});
}
