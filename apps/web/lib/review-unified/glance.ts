import type {LifeReview} from '../life-review/engine';
import {formatNumber} from '../visual-format';

/**
 * Session AK Part 8.1: the unified review. `/app/review` is the one review: Week or Month (the Life review's period
 * buttons), then Goals, Habits, Health and Wealth as chapters, with ZIGi's note (8.3), the monthly balance note (8.4), the
 * values check and the weekly reflection that used to stand alone. This is the "at a glance" row at its top: one line per
 * pillar, each a link to its chapter. Counts only, never an amount or a Health value; nothing recorded is said, never "0".
 */
export const REVIEW_ROUTE = '/app/review';
export type GlancePillar = 'goals' | 'habits' | 'health' | 'wealth';
export type Glance = {pillar: GlancePillar; title: string; line: string; anchor: string; quiet: boolean};
const n = (v: number, one: string, many = `${one}s`) => `${formatNumber(v)} ${v === 1 ? one : many}`;

export function pillarGlance(review: Pick<LifeReview, 'counts' | 'goalsMoved' | 'streaks' | 'money' | 'window'>, {financial}: {financial: boolean}): Glance[] {
  const days = Math.round((Date.parse(`${review.window.end}T12:00:00Z`) - Date.parse(`${review.window.start}T12:00:00Z`)) / 86_400_000) + 1;
  const moved = new Set(review.goalsMoved.map(g => g.name)).size, {contributions, habitCheckIns, healthDays} = review.counts;
  const goals = [contributions ? n(contributions, 'contribution') : '', moved ? `${n(moved, 'goal')} moved` : ''].filter(Boolean);
  const habits = [habitCheckIns ? n(habitCheckIns, 'check-in') : '', review.streaks[0] ? `longest streak ${formatNumber(review.streaks[0].streak)} ${review.streaks[0].unit}` : ''].filter(Boolean);
  const changed = review.money.filter(m => m.change !== null).length;
  const out: Glance[] = [
    {pillar: 'goals', title: 'Goals', line: goals.join(' · ') || 'Nothing recorded yet', anchor: '#life-review-goals', quiet: !goals.length},
    {pillar: 'habits', title: 'Habits', line: habits.join(' · ') || 'No check-ins recorded yet', anchor: '#life-review-streaks', quiet: !habits.length},
    {pillar: 'health', title: 'Health', line: healthDays ? `Records on ${formatNumber(healthDays)} of ${formatNumber(days)} days` : 'Nothing recorded yet', anchor: '#life-review-health', quiet: !healthDays},
  ];
  if (financial) out.push({pillar: 'wealth', title: 'Wealth', line: changed ? `${n(changed, 'currency', 'currencies')} with a recorded change` : review.money.length ? 'Not enough recorded values yet' : 'Nothing recorded yet', anchor: '#life-review-money', quiet: !changed});
  return out;
}
