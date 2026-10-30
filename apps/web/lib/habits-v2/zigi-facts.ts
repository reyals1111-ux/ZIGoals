import {STREAK_MILESTONES} from '../ai/actions/milestone';
import {habitDay, habitStats, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * What a saved check-in means for ZIGi (Session X-Local Part 4, owner decision D5), counted by the habit engine on the
 * data before and after the write, never from what anyone said: whether this habit became complete today, whether its
 * current streak grew onto a milestone length, and whether every habit scheduled today is now complete (once a day; the
 * caller remembers it in the celebrations record). Pure; a refused change gives no facts.
 */
export type CheckInFacts = {completed: boolean; streakMilestone: number | null; allDone: boolean; comeback?: {total: number} | null};
export function checkInFacts(before: HabitData, after: HabitData, habitId: string, today: string): CheckInFacts {
  const was = before.habits.find(h => h.id === habitId), is = after.habits.find(h => h.id === habitId);
  if (!was || !is) return {completed: false, streakMilestone: null, allDone: false};
  const completed = habitDay(is, today, today).status === 'complete' && habitDay(was, today, today).status !== 'complete';
  const from = habitStats(was, today).currentStreak, to = habitStats(is, today).currentStreak;
  const streakMilestone = to > from && STREAK_MILESTONES.includes(to) ? to : null;
  const scheduled = after.habits.filter(h => { try { return habitDay(h, today, today).scheduled; } catch { return false; } });
  const allDone = completed && scheduled.length > 0 && scheduled.every(h => habitDay(h, today, today).status === 'complete');
  const comeback = completed ? comebackOf(is, today) : null;
  return {completed, streakMilestone, allDone, ...(comeback ? {comeback} : {})};
}
/**
 * Session AJ (item 10; COMPANIONS.md P4 moment 8): a habit done again after 3 or more of its scheduled days without it
 * (skips are neutral and do not count). ZIGi encourages, leading with the habit's total days done, never with the gap.
 * Looks back at most 60 days; null when the habit was done on its last scheduled day, or never before today.
 */
export function comebackOf(habit: HabitData['habits'][number], today: string): {total: number} | null {
  let missed = 0;
  for (let back = 1; back <= 60; back++) {
    const day = addLocalDays(today, -back), state = habitDay(habit, day, today);
    if (!state.scheduled || state.status === 'skipped') continue;
    if (state.status === 'complete') return missed >= 3 ? {total: habitStats(habit, today).successCount} : null;
    missed++;
  }
  return null;
}
/** The celebrations-record id of a habit's comeback moment (its day). */
export const comebackNoteId = (habitId: string, today: string) => `comeback:${habitId.slice(0, 120)}:${today}`;
/** Whether a comeback moment played for this habit in the 14 days up to today (it plays at most once in 14 days). */
export function comebackSeenRecently(seen: Readonly<Record<string, string>>, habitId: string, today: string): boolean {
  const prefix = `comeback:${habitId.slice(0, 120)}:`, from = addLocalDays(today, -13);
  return Object.keys(seen).some(k => k.startsWith(prefix) && k.slice(prefix.length) >= from && k.slice(prefix.length) <= today);
}
/** The celebrations-record id that remembers "all done" for a day on this device. */
export const allDoneNoteId = (today: string) => `all-done:${today}`;
/**
 * Session AI (mascot, "celebrate once"): the celebrations-record id for one streak milestone of one habit on one day, so
 * unticking and ticking again (or a second device view) never plays the same celebration twice.
 */
export const streakNoteId = (habitId: string, milestone: number, today: string) => `streak:${habitId.slice(0, 120)}:${milestone}:${today}`;
