import {ACTIVITY_TYPES} from './health-activity-types';
import type {Habit, HabitRule} from './habits';

/**
 * Session AL fourth pass (N-085, GAP-042; L2 request): an exercise habit's check-in may name the activity, from Health's
 * own list (lib/health-activity-types.ts) or in the person's words. It is kept as one "Activity: …" line in the day's
 * note, so the stored format is unchanged and the note's own words stay as they were.
 */
export const ACTIVITY_CHOICES = ACTIVITY_TYPES;
const LINE = /^Activity: .*$/m;
/** A minutes or hours habit about movement: its category or its title says so. */
export function offersActivityType(habit: Pick<Habit, 'title' | 'category'>, rule: Pick<HabitRule, 'measurement'>): boolean {
  return rule.measurement.kind === 'duration' && (/\b(movement|fitness|sport|exercise|training)\b/i.test(habit.category) || /\b(exercise|workout|training|run|gym|cardio|sport)\b/i.test(habit.title));
}
/** The activity named in a note, or "" when none. */
export function activityOfNote(note: string): string { return LINE.exec(note)?.[0].slice('Activity: '.length).trim() ?? ''; }
/** The note with its "Activity: …" line set to `activity` (added at the end, replaced, or removed when empty). */
export function withActivityNote(note: string, activity: string): string {
  const words = activity.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const rest = note.replace(LINE, '').replace(/\n{2,}/g, '\n').trim();
  const next = words ? (rest ? `${rest}\nActivity: ${words}` : `Activity: ${words}`) : rest;
  return next.slice(0, 2000);
}
