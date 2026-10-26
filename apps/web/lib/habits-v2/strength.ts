import {habitDay, type Habit} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Session AH (L2, as HALO's "Habit Strength"): how established a habit is, 0–100, from its own scheduled days over the
 * last 90. Each scheduled day moves the strength a tenth of the way toward that day's result (done 1, partly done its
 * share, missed 0), so one miss dents it and never resets it, and a long run builds it slowly. Skipped, paused, rest
 * and unscheduled days count for nothing either way; today counts only once it is done. Derived; nothing is stored.
 */
export const STRENGTH_DAYS = 90, STRENGTH_STEP = 0.1, STRENGTH_MIN_DAYS = 7;
export type HabitStrength = {score: number; days: number};

export function habitStrength(habit: Habit, today: string): HabitStrength | null {
  let s = 0, days = 0;
  for (let i = STRENGTH_DAYS - 1; i >= 0; i--) {
    const date = addLocalDays(today, -i), day = habitDay(habit, date, today);
    let result: number | null = null;
    if (day.status === 'complete') result = 1;
    else if (day.status === 'failed') result = 0;
    else if (day.status === 'partial' && date !== today) result = Math.max(0, Math.min(1, day.target ? day.count / day.target : 0));
    if (result === null) continue;
    s += STRENGTH_STEP * (result - s); days++;
  }
  return days < STRENGTH_MIN_DAYS ? null : {score: Math.round(s * 100), days};
}
