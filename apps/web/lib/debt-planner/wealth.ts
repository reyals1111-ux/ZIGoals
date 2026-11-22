import {isDebtKind, type Account, type Accounts} from '../accounts/schema';
import {balanceOn, owedAfterPayments} from '../accounts/net-worth';
import {addLocalDays} from '../local-date';
import {debtView} from '../ai/tools/f9-debt';
import type {DebtPlannerRecord} from './store';
import {parseCents, payoffMonth, planProgress, toCents, type PlanProgress} from './plan';

/**
 * Session AV lane 2 (money; Undebt.it's top bar, payment tracking, snapshots and progress): what Wealth's "What you owe"
 * says about the debts, from the person's own balances and payments, per currency, never converted. Pure.
 * - Owed now: the latest balance less the payments recorded after it, until the next statement balance is entered.
 * - The debt-free month of the kept plan (the planner's own working, as NOVA and ZIGi read it) and what was paid down
 *   in the last 12 months and this year.
 * - A small trend per debt from its balance snapshots; the debts paid off, with the day.
 */
const cents = (m: {value: bigint; decimals: number}) => toCents(m.value, m.decimals);
/** The balance a debt had on a day: the latest snapshot on or before it, or null before the first. */
const owedOn = (a: Account, day: string) => { const b = balanceOn(a, day); return b ? cents(b) : null; };
export type OwedNow = {cents: bigint; statement: bigint; since: string; payments: number};
export function owedNow(a: Account, today: string): OwedNow | null {
  const o = owedAfterPayments(a, today), b = balanceOn(a, today);
  return o && b ? {cents: cents(o), statement: cents(b), since: o.date, payments: o.payments} : null;
}
export type DebtTrend = {id: string; name: string; points: {date: string; cents: bigint}[]; change: bigint | null};
/** Up to the last 12 snapshots of a debt, oldest first, and the change from the first of them to what is owed now. */
export function debtTrend(a: Account, today: string): DebtTrend {
  const points = [...a.snapshots].filter(s => s.date <= today).sort((x, y) => x.date.localeCompare(y.date)).slice(-12).map(s => ({date: s.date, cents: toCents(BigInt(s.value), s.decimals)}));
  const now = owedNow(a, today)?.cents ?? null;
  return {id: a.id, name: a.name, points, change: points.length && now !== null ? now - points[0]!.cents : null};
}
export type PaidOff = {id: string; name: string; currency: string; on: string; from: bigint | null};
/** Debts whose latest balance (or balance less payments) is zero: the day it reached zero and the most it owed before. */
export function paidOffDebts(accounts: Accounts | null | undefined, today: string): PaidOff[] {
  return (accounts?.items ?? []).flatMap(a => {
    if (!isDebtKind(a.kind)) return [];
    const now = owedNow(a, today); if (!now || now.cents > 0n) return [];
    const zeroSnap = [...a.snapshots].filter(s => s.date <= today && BigInt(s.value) === 0n).sort((x, y) => x.date.localeCompare(y.date))[0];
    const lastPay = [...a.payments].filter(p => p.date <= today).sort((x, y) => y.date.localeCompare(x.date))[0];
    const on = now.statement === 0n ? zeroSnap?.date ?? now.since : lastPay?.date ?? now.since;
    const before = a.snapshots.filter(s => s.date < on).map(s => toCents(BigInt(s.value), s.decimals));
    return [{id: a.id, name: a.name, currency: a.currency, on, from: before.length ? before.reduce((m, c) => c > m ? c : m, 0n) : null}];
  }).sort((x, y) => y.on.localeCompare(x.on));
}
export type DebtSummary = {currency: string; owed: bigint; debtFree: string | null; planned: boolean; last12: bigint | null; thisYear: bigint | null};
/** Per currency: what is owed now, the kept plan's debt-free month, and what was paid down over 12 months and this year. */
export function debtSummary(accounts: Accounts | null | undefined, planner: DebtPlannerRecord | null | undefined, today: string): DebtSummary[] {
  const by = new Map<string, DebtSummary>(), yearAgo = addLocalDays(today, -365), jan1 = `${today.slice(0, 4)}-01-01`;
  const views = new Map(debtView(accounts, planner, today).map(v => [v.currency, v]));
  for (const a of accounts?.items ?? []) {
    if (a.archivedAt || !isDebtKind(a.kind)) continue;
    const now = owedNow(a, today); if (!now) continue;
    const row = by.get(a.currency) ?? {currency: a.currency, owed: 0n, debtFree: null, planned: false, last12: 0n, thisYear: 0n};
    row.owed += now.cents;
    // This year starts from the balance before 1 January, or else the year's first snapshot (a debt added this year).
    const firstThisYear = [...a.snapshots].filter(s => s.date >= jan1 && s.date <= today).sort((x, y) => x.date.localeCompare(y.date))[0];
    const then = owedOn(a, yearAgo), start = owedOn(a, addLocalDays(jan1, -1)) ?? (firstThisYear ? toCents(BigInt(firstThisYear.value), firstThisYear.decimals) : null);
    row.last12 = row.last12 === null || then === null ? null : row.last12 + (then - now.cents);
    row.thisYear = row.thisYear === null || start === null ? null : row.thisYear + (start - now.cents);
    by.set(a.currency, row);
  }
  for (const row of by.values()) {
    const v = views.get(row.currency), plan = v?.comparison ? (planner?.shown === 'snowball' ? v.comparison.snowball : planner?.shown === 'custom' && v.comparison.custom ? v.comparison.custom : v.comparison.avalanche) : null;
    if (plan) { row.debtFree = payoffMonth(today, plan.months); row.planned = !!planner?.tracked || !!planner?.debts; }
  }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Session AV lane 2 (money; Undebt.it's Compare and follow the kept plan): the kept plan ("Track this plan") against what
 * the accounts show now (the balances less payments recorded since), as the planner works it out; null without one.
 */
export function trackedProgress(accounts: Accounts | null | undefined, planner: DebtPlannerRecord | null | undefined, today: string): (PlanProgress & {currency: string}) | null {
  const t = planner?.tracked; if (!t || !accounts) return null;
  try {
    const owed = new Map<string, bigint>();
    for (const a of accounts.items) if (!a.archivedAt && isDebtKind(a.kind) && a.currency === t.currency) { const o = owedNow(a, today); if (o) owed.set(a.id, o.cents); }
    const debts = t.debts.map(x => ({id: x.id, name: x.name, balance: parseCents(x.balance)!, ratePercent: x.ratePercent, minimum: parseCents(x.minimum)!}));
    const step = t.stepUp && parseCents(t.stepUp.amount) ? {cents: parseCents(t.stepUp.amount)!, every: t.stepUp.every} : undefined;
    return {currency: t.currency, ...planProgress({on: t.on, debts, extra: t.extra ? parseCents(t.extra) ?? 0n : 0n, strategy: t.strategy, order: t.order ?? [], lumps: (t.lumps ?? []).map(l => ({month: l.month, cents: parseCents(l.amount) ?? 0n})), ...(step ? {stepUp: step} : {})}, owed, today)};
  } catch { return null; }
}
