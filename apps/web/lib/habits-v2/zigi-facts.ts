import {STREAK_MILESTONES} from '../ai/actions/milestone';
import {habitDay, habitStats, type HabitData} from '../habits';

/**
 * What a saved check-in means for ZIGi (Session X-Local Part 4, owner decision D5), counted by the habit engine on the
 * data before and after the write, never from what anyone said: whether this habit became complete today, whether its
 * current streak grew onto a milestone length, and whether every habit scheduled today is now complete (once a day; the
 * caller remembers it in the celebrations record). Pure; a refused change gives no facts.
 */
export type CheckInFacts = {completed: boolean; streakMilestone: number | null; allDone: boolean};
export function checkInFacts(before: HabitData, after: HabitData, habitId: string, today: string): CheckInFacts {
  const was = before.habits.find(h => h.id === habitId), is = after.habits.find(h => h.id === habitId);
  if (!was || !is) return {completed: false, streakMilestone: null, allDone: false};
  const completed = habitDay(is, today, today).status === 'complete' && habitDay(was, today, today).status !== 'complete';
  const from = habitStats(was, today).currentStreak, to = habitStats(is, today).currentStreak;
  const streakMilestone = to > from && STREAK_MILESTONES.includes(to) ? to : null;
  const scheduled = after.habits.filter(h => { try { return habitDay(h, today, today).scheduled; } catch { return false; } });
  const allDone = completed && scheduled.length > 0 && scheduled.every(h => habitDay(h, today, today).status === 'complete');
  return {completed, streakMilestone, allDone};
}
/** The celebrations-record id that remembers "all done" for a day on this device. */
export const allDoneNoteId = (today: string) => `all-done:${today}`;
