/**
 * Session AL third pass (L4; competitor row GAP-119 / P-DVG-06, C-DV-07): pay-down goals. A debt the person tracks in
 * Wealth (zigoals:accounts:v1) with a rate and a minimum (their own figures, kept by the payoff planner,
 * zigoals:debt-planner:v1) shows on Goals as a goal to reach zero: how much is paid down since its first balance, the
 * month it is paid off, and the interest the planned extra saves against minimums only. Read-only: no new key, no new
 * goal kind (a Goal record is a stored format); the figures stay the planner's model (lib/debt-planner/plan.ts):
 * labelled a projection, never advice. Debts with no rate or minimum say what is missing (unknown is not zero).
 */
import {isDebtKind, type Account} from '../accounts/schema';
import {balanceOn} from '../accounts/net-worth';
import type {DebtPlannerRecord} from '../debt-planner/store';
import {comparePlans, parseCents, payoffMonth, rateE4, toCents, type PlanDebt} from '../debt-planner/plan';

export type PaydownRow = {id: string; name: string; currency: string; owed: bigint; start: bigint; paidShare: number | null; payoff: string | null; missing: string | null};
export type PaydownGroup = {currency: string; rows: PaydownRow[]; payoff: string | null; saved: bigint | null; extra: bigint};

/** One group per currency (never converted). */
export function paydownGoals(accounts: readonly Account[], planner: DebtPlannerRecord, today: string): PaydownGroup[] {
 const groups = new Map<string, {debts: PlanDebt[]; rows: PaydownRow[]}>();
 for (const a of accounts) {
  if (a.archivedAt || !isDebtKind(a.kind)) continue;
  const now = balanceOn(a, today);
  if (!now || now.value <= 0n) continue;
  const first = [...a.snapshots].sort((x, y) => x.date.localeCompare(y.date))[0]!;
  const owed = toCents(now.value, now.decimals), start = toCents(BigInt(first.value), first.decimals);
  const rate = a.ratePercent ?? planner.debts?.[a.id]?.ratePercent, min = planner.debts?.[a.id]?.minimum;
  const minimum = min ? parseCents(min) : null;
  const missing = !rate || rateE4(rate) === null ? 'Add its yearly rate in the payoff planner to see a payoff month.' : minimum === null || minimum <= 0n ? 'Add its minimum monthly payment in the payoff planner to see a payoff month.' : null;
  const g = groups.get(a.currency) ?? {debts: [], rows: []};
  g.rows.push({id: a.id, name: a.name, currency: a.currency, owed, start, paidShare: start > owed && start > 0n ? Number((start - owed) * 1000n / start) / 1000 : start > 0n ? 0 : null, payoff: null, missing});
  if (!missing) g.debts.push({id: a.id, name: a.name, balance: owed, ratePercent: rate!, minimum: minimum!});
  groups.set(a.currency, g);
 }
 const extraText = planner.extra?.trim(), extra = extraText ? parseCents(extraText) ?? 0n : 0n;
 return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([currency, g]) => {
  // The planned extra only applies in the planner's chosen currency (it is one figure, in one currency).
  const own = planner.currency === undefined || planner.currency === currency ? extra : 0n;
  let payoff: string | null = null, saved: bigint | null = null;
  if (g.debts.length && g.debts.length === g.rows.length) {
   try {
    const c = comparePlans(g.debts, own), plan = own > 0n ? c.avalanche : c.minimums;
    payoff = payoffMonth(today, plan.months);
    for (const p of plan.payoffs) { const row = g.rows.find(r => r.id === p.id); if (row) row.payoff = payoffMonth(today, p.month); }
    saved = own > 0n ? c.savedAvalanche : null;
   } catch { /* a plan the planner refuses shows no month */ }
  } else if (g.debts.length) {
   // Some debts lack a figure: each complete one gets its own minimums-only month; the group has no single date.
   for (const d of g.debts) { try { const r = comparePlans([d], 0n).minimums; const row = g.rows.find(x => x.id === d.id); if (row) row.payoff = payoffMonth(today, r.months); } catch { /* none */ } }
  }
  return {currency, rows: g.rows, payoff, saved, extra: own};
 });
}
