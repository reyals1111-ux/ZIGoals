import {habitDay, type Habit} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Session AL fourth pass (C-DVG-76): the next day a habit is due after `today`, for the List row of a habit that is not
 * due today ("next Thu 6 Nov"). Each day is read as Habits reads its own today, so rest days, weekdays, every-N-days and
 * a paused habit follow Habits' rule. Null when none falls in the next `days` days (paused, ended, or far away).
 */
export function nextHabitDay(habit: Habit, today: string, days = 60): string | null {
  for (let i = 1; i <= days; i++) {
    const day = addLocalDays(today, i), read = habitDay(habit, day, day);
    if (read.scheduled) return day;
  }
  return null;
}
