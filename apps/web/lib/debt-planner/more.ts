import {addMonths, centsText, firstPaymentMonth, monthlyInterest, monthsBetween, rateE4, runPlan, strategyOrder, type PlanDebt, type PlanOptions, type PlanResult, type Strategy} from './plan';
import type {MoreMethod} from './store';

/**
 * Session AV lane 2 (money; Undebt.it): the planner's further tools, pure and exact in cents. Every figure is a model
 * from the person's own balances, rates and payments — information, never advice; nothing moves money.
 * - Further orders: highest monthly interest first, highest payment first, the Cash Flow Index (balance ÷ minimum,
 *   lowest first: frees the most monthly cash soonest), and by the person's "paid off by" months (earliest first).
 * - What a debt needs a month to be paid off by its month, and whether the plan gets there.
 * - Reverse what-if: the extra a month that makes the plan debt-free by a month.
 * - Consolidation: one loan at a rate, a term and a fee against the plan as it stands.
 * - The schedule as CSV.
 */
const cmp = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;
const r = (d: PlanDebt) => rateE4(d.ratePercent) ?? 0n;
export const METHOD_WORDS: Record<MoreMethod, string> = {interest: 'Highest monthly interest first', payment: 'Highest payment first', cfi: 'Cash Flow Index (lowest first)', targets: 'By your paid-off-by months'};
export function methodOrder(debts: readonly PlanDebt[], method: MoreMethod, payoffBy: Readonly<Record<string, string | undefined>> = {}): string[] {
  const avalanche = strategyOrder(debts, 'avalanche').map(d => d.id), tie = (a: PlanDebt, b: PlanDebt) => avalanche.indexOf(a.id) - avalanche.indexOf(b.id);
  const list = [...debts];
  if (method === 'interest') list.sort((a, b) => cmp(monthlyInterest(b.balance, r(b)), monthlyInterest(a.balance, r(a))) || tie(a, b));
  else if (method === 'payment') list.sort((a, b) => cmp(b.minimum, a.minimum) || tie(a, b));
  // Cash Flow Index: balance ÷ minimum (compared exactly by cross-multiplying), lowest first.
  else if (method === 'cfi') list.sort((a, b) => cmp(a.balance * b.minimum, b.balance * a.minimum) || tie(a, b));
  else list.sort((a, b) => (payoffBy[a.id] ?? '9999-12').localeCompare(payoffBy[b.id] ?? '9999-12') || tie(a, b));
  return list.map(d => d.id);
}
/** The Cash Flow Index of a debt (balance ÷ minimum), to one decimal. */
export const cashFlowIndex = (d: PlanDebt) => Number(d.balance * 10n / d.minimum) / 10;

/** The fixed monthly payment that clears `balance` in `months` at the yearly rate (exact cents, rounded up). */
export function paymentFor(balance: bigint, ratePercent: string, months: number): bigint {
  if (months <= 0) return balance;
  const rate = rateE4(ratePercent) ?? 0n;
  if (rate === 0n) return (balance + BigInt(months) - 1n) / BigInt(months);
  // The smallest payment whose amortisation clears the balance in time (searched, so it uses the plan's own interest rule).
  let lo = 1n, hi = balance + monthlyInterest(balance, rate) * BigInt(months) + 1n;
  const clears = (p: bigint) => { let left = balance; for (let m = 0; m < months; m++) { left += monthlyInterest(left, rate); left -= p < left ? p : left; if (left <= 0n) return true; } return left <= 0n; };
  while (lo < hi) { const mid = (lo + hi) / 2n; if (clears(mid)) hi = mid; else lo = mid + 1n; }
  return lo;
}
export type TargetCheck = {id: string; name: string; by: string; plannedMonth: string | null; onTrack: boolean; needs: bigint};
/** Each debt with a "paid off by" month: when the plan clears it, and what it alone would need a month to make it. */
export function targetChecks(debts: readonly PlanDebt[], plan: PlanResult, today: string, payoffBy: Readonly<Record<string, string | undefined>>): TargetCheck[] {
  return debts.flatMap(d => {
    const by = payoffBy[d.id]; if (!by) return [];
    const paid = plan.payoffs.find(p => p.id === d.id), plannedMonth = paid ? addMonths(firstPaymentMonth(today), paid.month - 1) : null;
    const months = monthsBetween(firstPaymentMonth(today), by) + 1;
    return [{id: d.id, name: d.name, by, plannedMonth, onTrack: !!plannedMonth && plannedMonth <= by, needs: months > 0 ? paymentFor(d.balance, d.ratePercent, months) : d.balance}];
  });
}
/** Reverse what-if: the smallest extra a month (to the cent) that makes the plan debt-free by `by`; null when the month is past. */
export function extraFor(debts: readonly PlanDebt[], strategy: Strategy, by: string, today: string, options: PlanOptions = {}): bigint | null {
  const months = monthsBetween(firstPaymentMonth(today), by) + 1;
  if (months < 1) return null;
  const done = (extra: bigint) => { const p = runPlan(debts, extra, strategy, options); return p.months !== null && p.months <= months; };
  if (done(0n)) return 0n;
  let lo = 0n, hi = debts.reduce((t, d) => t + d.balance, 0n) + 1n;
  if (!done(hi)) return null;
  while (lo + 1n < hi) { const mid = (lo + hi) / 2n; if (done(mid)) hi = mid; else lo = mid; }
  return hi;
}
export type Consolidation = {payment: bigint; totalPaid: bigint; interest: bigint; fee: bigint; months: number; plan: {months: number | null; totalPaid: bigint; interest: bigint}; difference: bigint};
/** One loan for everything owed at `ratePercent` over `months`, with a fee added to it, against the plan as it stands. */
export function consolidation(debts: readonly PlanDebt[], plan: PlanResult, ratePercent: string, months: number, fee: bigint): Consolidation {
  if (rateE4(ratePercent) === null) throw new Error('Enter the new yearly rate, from 0 to 100 %.');
  if (!Number.isInteger(months) || months < 1 || months > 480) throw new Error('Enter the term in months, from 1 to 480.');
  if (fee < 0n) throw new Error('A fee is zero or more.');
  const owed = debts.reduce((t, d) => t + d.balance, 0n) + fee, payment = paymentFor(owed, ratePercent, months), rate = rateE4(ratePercent)!;
  let left = owed, paid = 0n, interest = 0n;
  for (let m = 0; m < months && left > 0n; m++) { const i = monthlyInterest(left, rate); left += i; interest += i; const p = payment < left ? payment : left; left -= p; paid += p; }
  return {payment, totalPaid: paid, interest, fee, months, plan: {months: plan.months, totalPaid: plan.totalPaid, interest: plan.totalInterest}, difference: paid - plan.totalPaid};
}
/** The month-by-month schedule as CSV: month, then paid, interest and left per debt, then the one-off payment. */
export function scheduleCsv(debts: readonly PlanDebt[], plan: PlanResult, today: string): string {
  const order = plan.order.map(id => debts.find(d => d.id === id)!).filter(Boolean), q = (s: string) => `"${s.replaceAll('"', '""').replace(/^([=+\-@])/, "'$1")}"`;
  const head = ['Month', ...order.flatMap(d => [`${d.name}: paid`, `${d.name}: interest`, `${d.name}: left`]), 'One-off extra'].map(q);
  const rows = (plan.schedule ?? []).map(s => [q(addMonths(firstPaymentMonth(today), s.month - 1)), ...order.flatMap((_, k) => [centsText(s.paid[k]!), centsText(s.interest[k]!), centsText(s.left[k]!)]), centsText(s.lump)]);
  return [head, ...rows].map(line => line.join(',')).join('\r\n') + '\r\n';
}
