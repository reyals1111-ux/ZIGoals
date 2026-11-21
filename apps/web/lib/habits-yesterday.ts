import {habitDay, habitRuleOn, type HabitData} from './habits';
import {addLocalDays} from './local-date';
import {isDeletedHabit} from './habit-delete';

/**
 * Session AV (owner follow-up 1, F-YESTERDAY; Habitica's "Record yesterday's activity"): yesterday's daily habits left
 * open, in one list, to tick late in one go. Only "build" habits with a daily target that were scheduled yesterday and
 * are not complete (nothing logged, or part of the target); quit and limit habits are left out (not doing them is the
 * point), as are skipped, paused and weekly-target habits. `missing` is what "Done" adds to reach yesterday's target.
 * The list is shown until anything is logged today: nothing new is stored. Pure.
 */
export type OpenYesterday = {id: string; title: string; count: number; target: number; missing: number};
export function yesterdaysOpen(data: HabitData, today: string): {day: string; open: OpenYesterday[]; loggedToday: boolean} {
  const day = addLocalDays(today, -1), open: OpenYesterday[] = [];
  let loggedToday = false;
  for (const h of data.habits) {
    if (isDeletedHabit(h)) continue;
    if (h.entries.some(e => e.date === today && (e.count > 0 || e.disposition !== 'logged'))) loggedToday = true;
    const rule = habitRuleOn(h, day);
    if (!rule || rule.type !== 'build' || rule.targetPeriod !== 'day') continue;
    const d = habitDay(h, day, today);
    if (d.status !== 'failed' && d.status !== 'partial' && d.status !== 'due') continue;
    const missing = Math.max(0, d.target - d.count);
    if (missing > 0) open.push({id: h.id, title: h.title, count: d.count, target: d.target, missing});
  }
  return {day, open, loggedToday};
}
