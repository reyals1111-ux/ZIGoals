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
/**
 * Session AV (q4 #23; Streaks' "don't miss today"): the day after a missed day, today is the one that keeps "never missed
 * twice" going. True when today is still open on a daily "build" habit and its last scheduled day before today (skipped,
 * vacation and unscheduled days in between are neutral, up to a week back) was missed. Pure.
 */
export function dontMissToday(habit: Habit, today: string): boolean {
  const rule = habitRuleOn(habit, today);
  if (!rule || rule.type !== 'build' || rule.targetPeriod !== 'day') return false;
  const now = habitDay(habit, today, today).status;
  if (now !== 'due' && now !== 'partial') return false;
  for (let i = 1, d = addLocalDays(today, -1); i <= 7; i++, d = addLocalDays(d, -1)) {
    const s = habitDay(habit, d, today).status;
    if (s === 'failed' || s === 'partial') return true;
    if (s === 'complete' || s === 'not-started' || s === 'archived') return false;
  }
  return false;
}
/**
 * Session AV (q4 #23; owner decision kept: ADR-045 records "never missed twice" as a line beside the streak, not an opt-in
 * mode that keeps the streak): the card face's and Today's line — "Don't miss today" the day after a miss (with the run
 * when there is one), else "Never missed twice: N days" when it is longer than the streak, else nothing.
 */
export function twoDayLine(habit: Habit, today: string, streak: number): string | null {
  const twice = neverTwice(habit, today);
  if (dontMissToday(habit, today)) return twice > 0 ? `Don’t miss today · never missed twice: ${twice} ${twice === 1 ? 'day' : 'days'}` : 'Don’t miss today';
  return twice > streak ? `Never missed twice: ${twice} days` : null;
}
