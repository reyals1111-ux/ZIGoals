import {editHabit, habitCalendarDay, habitDay, habitInputSchema, latestHabitRule, type Habit, type HabitData, type HabitInput} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Habit challenges (Session W Part 10): a habit with an end date, started for 30 days or any number from 7 to 365. It
 * uses the habit's existing end condition (`{kind: 'date'}`), so every build reads it, and after the end the habit is
 * simply not due. Progress counts the scheduled days that were done; rest days (skips) are neutral, as everywhere in
 * Habits. When it ends, a calm one-time note says what was done, never what was not.
 */
export type Challenge = {start: string; end: string; days: number; dayNumber: number; done: number; scheduled: number; finished: boolean};
export const CHALLENGE_DAYS = {min: 7, max: 365, usual: 30} as const;
const between = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** The habit's challenge (its current end date and the day it was set), or null when it has no end date. */
export function challengeOf(habit: Habit, today: string): Challenge | null {
  const latest = latestHabitRule(habit);
  if (latest.endCondition.kind !== 'date') return null;
  const end = latest.endCondition.date, same = JSON.stringify(latest.endCondition);
  let start = latest.from;
  for (let i = habit.rules.length - 1; i >= 0 && JSON.stringify(habit.rules[i]!.endCondition) === same; i--) start = habit.rules[i]!.from;
  if (start > end) return null;
  let done = 0, scheduled = 0;
  const last = today < end ? today : end;
  for (let date = start; date <= last; date = addLocalDays(date, 1)) {
    const day = habitDay(habit, date, today);
    if (!day.scheduled || day.status === 'skipped') continue;
    if (day.status === 'complete') done++;
    // Today counts once it is done; until then it is still open, not "not done".
    if (date < today || day.status === 'complete') scheduled++;
  }
  return {start, end, days: between(start, end) + 1, dayNumber: Math.min(between(start, end) + 1, Math.max(1, between(start, today) + 1)), done, scheduled, finished: today > end};
}
/** The habit as editor input, with another end condition (everything else as it is today). */
function inputWith(habit: Habit, endCondition: HabitInput['endCondition']): HabitInput {
  const rule = latestHabitRule(habit);
  return habitInputSchema.parse({
    title: habit.title, category: habit.category, description: habit.description, notes: habit.notes, ...(habit.goalLink ? {goalLink: habit.goalLink} : {}),
    type: rule.type, measurement: rule.measurement, schedule: rule.schedule, target: rule.target, targetPeriod: rule.targetPeriod, timeOfDay: habit.timeOfDay, endCondition,
    ...(habit.stackAfterId ? {stackAfterId: habit.stackAfterId} : {}),
  });
}
/** Starts a challenge of `days` days from today on an active habit (today is day 1). */
export function startChallenge(data: HabitData, id: string, days: number, now = new Date()): HabitData {
  if (!Number.isInteger(days) || days < CHALLENGE_DAYS.min || days > CHALLENGE_DAYS.max) throw Error(`A challenge lasts ${CHALLENGE_DAYS.min} to ${CHALLENGE_DAYS.max} days.`);
  const habit = data.habits.find(h => h.id === id);
  if (!habit) throw Error('This habit is no longer here.');
  if (latestHabitRule(habit).state !== 'active') throw Error('Resume this habit before starting a challenge.');
  const today = habitCalendarDay(data, now);
  return editHabit(data, id, inputWith(habit, {kind: 'date', date: addLocalDays(today, days - 1)}), now);
}
/** "Keep going": the habit carries on with no end date, from today. */
export function keepGoing(data: HabitData, id: string, now = new Date()): HabitData {
  const habit = data.habits.find(h => h.id === id);
  if (!habit) throw Error('This habit is no longer here.');
  return editHabit(data, id, inputWith(habit, {kind: 'none'}), now);
}
/** The one-time note's key in the celebrations device record. */
export const challengeNoteId = (habit: Pick<Habit, 'id'>, c: Pick<Challenge, 'end'>) => `challenge:${habit.id}:${c.end}`;
/** The words of the finished note: what was done, in the person's own numbers. */
export function finishedWords(habit: Pick<Habit, 'title'>, c: Challenge): string {
  return `Your ${c.days}-day ${habit.title} challenge ended on ${c.end}: done on ${c.done} of ${c.scheduled} scheduled ${c.scheduled === 1 ? 'day' : 'days'}.`;
}
