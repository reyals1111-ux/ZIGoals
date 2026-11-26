import type {Sleep} from './schema';
import {dailySeries} from './engine';

// Session AW Part 2 (speed, attempt 2): "Your sleep goal" over 14 or 30 days, out of lib/sleep/engine.ts, which Today and
// Health load first; only Sleep's fold (components/health/x6/sleep-x6.tsx) and ZIGi's answer read it.
/**
 * Session AW (X6; LEDGER #460, Sleep as Android's goal over a longer period): the person's own sleep goal over the last 14
 * or 30 days — the average time asleep against the goal and the nights at or above it, and, with a bedtime window, the
 * average bedtime against the window's end and the nights whose bedtime fell inside it. Facts from the logged nights only
 * (a day without a night is left out, never counted as 0); the 7-day line on the page stays as it is. Null without a goal
 * or a logged night in the period. The period chosen is a device preference (lib/sleep/goal-period.ts).
 */
export const GOAL_PERIODS = [14, 30] as const;
export type GoalPeriodDays = typeof GOAL_PERIODS[number];
export type GoalPeriod = {days: GoalPeriodDays; goal: number; nights: number; asleep: number; estimated: boolean; atOrAbove: number;
  /** With a bedtime window: the average bedtime (minutes after noon), its minutes from the window's end (negative = before it), and the nights inside. */
  bedtime: {from: string; to: string; average: number; fromEnd: number; inside: number; nights: number} | null};
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const noonMinutes = (clock: string) => { const [h, m] = clock.split(':').map(Number); return ((h! * 60 + m! - 720) % 1440 + 1440) % 1440; };
export function goalPeriod(s: Sleep, today: string, days: GoalPeriodDays): GoalPeriod | null {
  const goal = s.goal;
  if (!goal) return null;
  const logged = dailySeries(s, today, days).filter(p => p.asleep !== null);
  if (!logged.length) return null;
  const beds = logged.filter(p => p.bed !== null).map(p => p.bed!);
  let bedtime: GoalPeriod['bedtime'] = null;
  if (goal.bedFrom && goal.bedTo && beds.length) {
    const from = noonMinutes(goal.bedFrom), to = noonMinutes(goal.bedTo), average = Math.round(mean(beds));
    const inside = beds.filter(b => from <= to ? b >= from && b <= to : b >= from || b <= to).length;
    bedtime = {from: goal.bedFrom, to: goal.bedTo, average, fromEnd: average - to, inside, nights: beds.length};
  }
  return {days, goal: goal.minutes, nights: logged.length, asleep: Math.round(mean(logged.map(p => p.asleep!))), estimated: logged.some(p => p.estimated), atOrAbove: logged.filter(p => p.asleep! >= goal.minutes).length, bedtime};
}
