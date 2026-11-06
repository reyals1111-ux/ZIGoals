import {habitDay, type Habit} from '../habits';

/**
 * The habit counts of lib/numbers/counts.ts (Session AH Part 4, TR6: one count per thing), in their own module so a page
 * that counts check-ins (Habits' rhythm, the weekly review) does not load Wealth's and Goals' counting code with them.
 * lib/numbers/counts.ts re-exports these; import from either.
 */

/** Check-ins on one day: habits whose scheduled day is complete. */
export function checkInsOn(habits: readonly Habit[], date: string, today: string) {
  return habits.filter(h => { const d = habitDay(h, date, today); return d.scheduled && d.status === 'complete'; }).length;
}
/** Habits due and done on a day, as every "X of Y" shows them. */
export function habitsOnDay(habits: readonly Habit[], date: string, today: string) {
  let due = 0, done = 0;
  for (const h of habits) { const d = habitDay(h, date, today); if (!d.scheduled || d.status === 'skipped') continue; due++; if (d.status === 'complete') done++; }
  return {due, done};
}
/**
 * Session AL (Part 13): the habits still open on a day, as ZIGi's habits_due and NOVA's "habits left" list them: due or
 * partly done. A quit or limit habit that failed today is not "left" (nothing more to do), so left ≤ due − done.
 */
export function habitsLeftOn(habits: readonly Habit[], date: string, today: string) {
  return habits.filter(h => { const s = habitDay(h, date, today).status; return s === 'due' || s === 'partial'; }).length;
}
