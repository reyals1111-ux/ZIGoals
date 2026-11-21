import {habitDay, habitRuleOn, type Habit} from './habits';
import {addLocalDays} from './local-date';

/**
 * Session AV (owner follow-up 1, F-TWO-DAY; Streaks' 2-day rule, "never miss twice"): beside the streak, the run of
 * completed days in which no two scheduled days in a row were missed — one missed day does not end it, a second one
 * right after does. Skipped, vacation and unscheduled days are neutral, as for the streak; today still open does not
 * count against it. Only daily "build" habits. Shown only when it is longer than the streak (it says something then).
 * The streak itself is unchanged. Pure; at most two years back.
 */
export function neverTwice(habit: Habit, today: string): number {
  const rule = habitRuleOn(habit, today);
  if (!rule || rule.type !== 'build' || rule.targetPeriod !== 'day') return 0;
  let count = 0, missed = 0;
  for (let i = 0, d = today; i < 730; i++, d = addLocalDays(d, -1)) {
    const s = habitDay(habit, d, today).status;
    if (s === 'complete') { count++; missed = 0; continue; }
    if (s === 'failed' || s === 'partial') { if (d === today) continue; if (missed) break; missed = 1; continue; }
    if (s === 'not-started' || s === 'archived') break;
  }
  return count;
}
