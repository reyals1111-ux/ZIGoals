/**
 * Session AK (lane M, item 18, COMPETITORS M6): what a yearly fee (an expense ratio) costs over time. One amount grows
 * at the same yearly return under two fees, A and B: each year it grows by the return and then the fee is taken from
 * the balance, (1 + return) × (1 − fee). The end difference is the fee drag. An illustration from the person's own
 * numbers; returns are not guaranteed and nothing here is advice. Pure; nothing is stored.
 */
export type FeeDragInput = {amount: number; years: number; returnPct: number; feeAPct: number; feeBPct: number};
export type FeeDragResult = {a: number[]; b: number[]; endA: number; endB: number; difference: number; share: number};
export const FEE_LIMITS = {amount: 1e12, years: [1, 60], returnPct: [-50, 50], feePct: [0, 10]} as const;
export function feeDragIssue(i: FeeDragInput): string | null {
  const within = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!Number.isFinite(i.amount) || i.amount <= 0 || i.amount > FEE_LIMITS.amount) return 'Enter an amount above zero.';
  if (!within(i.years, FEE_LIMITS.years) || !Number.isInteger(i.years)) return 'Whole years from 1 to 60.';
  if (!within(i.returnPct, FEE_LIMITS.returnPct)) return 'A yearly return from −50 to 50 %.';
  if (!within(i.feeAPct, FEE_LIMITS.feePct) || !within(i.feeBPct, FEE_LIMITS.feePct)) return 'Each fee from 0 to 10 % a year.';
  return null;
}
const round2 = (v: number) => Math.round(v * 100) / 100;
/** The two balances year by year (year 0 is the amount), the end values and their difference (A − B), rounded to cents. */
export function feeDrag(i: FeeDragInput): FeeDragResult {
  const issue = feeDragIssue(i); if (issue) throw Error(issue);
  const grow = (fee: number) => { const out = [i.amount]; let v = i.amount; for (let y = 1; y <= i.years; y++) { v = v * (1 + i.returnPct / 100) * (1 - fee / 100); out.push(v); } return out; };
  const a = grow(i.feeAPct), b = grow(i.feeBPct), endA = round2(a.at(-1)!), endB = round2(b.at(-1)!);
  const high = Math.max(endA, endB);
  return {a: a.map(round2), b: b.map(round2), endA, endB, difference: round2(endA - endB), share: high > 0 ? Math.abs(endA - endB) / high : 0};
}
