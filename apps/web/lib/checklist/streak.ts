import {addDays} from '../zone-time';
import type {ChecklistDays} from './schema';
import {dayCounts, needOn, type DayGoal} from './day-goal-core';

/**
 * The Checklist streak (Session AF, L3; P7.13). Fair by construction:
 * - a day counts when every counted dot is done, whatever the hour of the last tick (23:59 counts);
 * - a sealed day with nothing on the path is skipped, never a break (a rest day);
 * - today extends the streak once complete, and an unfinished today never breaks it (the day is not over);
 * - a day mended by a streak freeze (the game layer's own `applyFreeze` on a missed favourite habit, which turns that day's
 *   miss into a rest; `mendDay` then takes it out of the count) reads as kept.
 * A day never sealed (the path held nothing, or more than two weeks passed between visits) breaks the run.
 * Session AP (owner decision 14 Nov): with "A day counts as done at N" on (`goal`), each day counts by the rule in force on
 * that day (lib/checklist/day-goal-core.ts); without it, exactly as above.
 */
export type ChecklistStreak = {current: number; best: number; todayComplete: boolean; perfectDays: number; completeDays: number};

export function checklistStreak(days: ChecklistDays, today: string, todaySummary: {total: number; done: number; perfect?: boolean} | null, goal?: DayGoal | null): ChecklistStreak {
  const complete = (d: {total: number; done: number} | undefined, date: string) => dayCounts(d, needOn(goal, date));
  const todayComplete = complete(todaySummary ?? undefined, today);
  let current = 0;
  for (let d = addDays(today, -1), guard = 0; guard < 800; d = addDays(d, -1), guard++) {
    const day = days.days[d];
    if (!day) break;
    if (day.total === 0) continue;
    if (!complete(day, d)) break;
    current++;
  }
  if (todayComplete) current++;
  // The best run over the whole history, today included.
  const dates = Object.keys(days.days).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of dates) {
    const day = days.days[d]!;
    if (prev && addDays(prev, 1) !== d) run = 0;
    prev = d;
    if (day.total === 0) continue;
    run = complete(day, d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  best = Math.max(best, current);
  const sealed = Object.entries(days.days).filter(([d]) => d < today);
  // A Perfect orbit is every dot lit in path order, whatever the day's rule.
  const full = (d: {total: number; done: number}) => d.total > 0 && d.done >= d.total;
  return {current, best, todayComplete, perfectDays: sealed.filter(([, v]) => full(v) && v.perfect).length + (todaySummary && full(todaySummary) && todaySummary.perfect ? 1 : 0), completeDays: sealed.filter(([d, v]) => complete(v, d)).length + (todayComplete ? 1 : 0)};
}

/** The missed days a streak freeze could mend: sealed, incomplete, within the last week, with favourite habits missed. */
export function mendableDays(days: ChecklistDays, today: string, goal?: DayGoal | null): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 7; i++) { const d = addDays(today, -i), day = days.days[d]; if (day && day.total > 0 && !dayCounts(day, needOn(goal, d))) out.push(d); }
  return out;
}
