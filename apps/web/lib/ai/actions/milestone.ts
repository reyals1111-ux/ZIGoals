import {habitCalendarDay, habitStats, type HabitData} from '../../habits';
import type {Plan} from './plan';

/**
 * ZIGi is proud (Session V Part 12) only when the habit engine counts it: a check-in card the person added that made the
 * habit's current streak grow onto one of these lengths. Never because the AI said so, and never for a skip or an edit
 * that leaves the streak as it was. The unit is the habit's own (days, or weeks/months for a habit counted per period).
 */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 21, 30, 50, 100, 150, 200, 365, 500, 1000];
function habitIdOf(plan: Plan): string | null {
  const id = plan.activity?.id;
  if (plan.card.kind !== 'check-in' || !id?.startsWith('habit:')) return null;
  const rest = id.slice('habit:'.length), at = rest.lastIndexOf(':');
  return at > 0 ? rest.slice(0, at) : null;
}
/** The milestone the check-in reached (its streak length), or null. */
export function streakMilestone(plan: Plan, before: HabitData, after: HabitData, now = new Date()): number | null {
  const id = habitIdOf(plan); if (!id) return null;
  const was = before.habits.find(h => h.id === id), is = after.habits.find(h => h.id === id);
  if (!was || !is) return null;
  let today: string;
  try { today = habitCalendarDay(after, now); } catch { return null; }
  const from = habitStats(was, today).currentStreak, to = habitStats(is, today).currentStreak;
  return to > from && STREAK_MILESTONES.includes(to) ? to : null;
}
