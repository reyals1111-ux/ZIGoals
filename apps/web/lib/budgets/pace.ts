import type {BudgetRow} from './engine';

/**
 * Session AV (owner follow-up 1, F-BUDGET-PACE; Copilot's category pace, Rocket Money's near-limit notice): how a budget
 * of the current month is going against the month itself. "near" from 80 % spent; "fast" when the share spent runs more
 * than 10 points ahead of the share of the month gone (from the 5th, so one early shop is not called fast); "over" when
 * more than what is available is spent. Facts from the person's own log and the calendar; no projection is stated as a
 * promise and nothing is advised. Pure.
 */
export const NEAR_SHARE = 0.8;
export const FAST_MARGIN = 0.1;
export const FAST_FROM_DAY = 5;
export type PaceState = 'over' | 'near' | 'fast' | 'steady';
export type BudgetPace = {state: PaceState; spentShare: number; monthShare: number; day: number; days: number; daysLeft: number};
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
/** Pace for a budget row of the month `today` falls in; null for another month or a budget with nothing available. */
export function budgetPace(row: Pick<BudgetRow, 'available' | 'spent' | 'over'>, month: string, today: string): BudgetPace | null {
  if (today.slice(0, 7) !== month || row.available <= 0) return null;
  const days = daysIn(month), day = Number(today.slice(8, 10)), spentShare = row.spent / row.available, monthShare = day / days, daysLeft = days - day + 1;
  const state: PaceState = row.over ? 'over' : spentShare >= NEAR_SHARE ? 'near' : day >= FAST_FROM_DAY && spentShare > monthShare + FAST_MARGIN ? 'fast' : 'steady';
  return {state, spentShare, monthShare, day, days, daysLeft};
}
const pct = (share: number) => `${Math.round(share * 100)}%`;
/** "62% spent with 45% of the month gone: faster than the month", in plain words; null when steady. */
export function paceWords(p: BudgetPace, leftText: string): string | null {
  const days = p.daysLeft === 1 ? 'the last day' : `${p.daysLeft} days`;
  if (p.state === 'over') return null; // the row already says "over"
  if (p.state === 'near') return `Near the limit: ${pct(p.spentShare)} spent, ${leftText} for ${days}.`;
  if (p.state === 'fast') return `${pct(p.spentShare)} spent with ${pct(p.monthShare)} of the month gone: faster than the month.`;
  return null;
}
