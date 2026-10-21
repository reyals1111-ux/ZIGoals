import {addDays} from '../zone-time';
import type {ChecklistDays} from './schema';

/**
 * The Checklist streak (Session AF, L3; P7.13). Fair by construction:
 * - a day counts when every counted dot is done, whatever the hour of the last tick (23:59 counts);
 * - a sealed day with nothing on the path is skipped, never a break (a rest day);
 * - today extends the streak once complete, and an unfinished today never breaks it (the day is not over);
 * - a day mended by a streak freeze (the game layer's own `applyFreeze` on a missed favourite habit, which turns that day's
 *   miss into a rest; `mendDay` then takes it out of the count) reads as kept.
 * A day never sealed (the path held nothing, or more than two weeks passed between visits) breaks the run.
 */
export type ChecklistStreak = {current: number; best: number; todayComplete: boolean; perfectDays: number; completeDays: number};
const complete = (d: {total: number; done: number} | undefined) => !!d && d.total > 0 && d.done >= d.total;

export function checklistStreak(days: ChecklistDays, today: string, todaySummary: {total: number; done: number; perfect?: boolean} | null): ChecklistStreak {
  const todayComplete = complete(todaySummary ?? undefined);
  let current = 0;
  for (let d = addDays(today, -1), guard = 0; guard < 800; d = addDays(d, -1), guard++) {
    const day = days.days[d];
    if (!day) break;
    if (day.total === 0) continue;
    if (!complete(day)) break;
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
    run = complete(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  best = Math.max(best, current);
  const sealed = Object.entries(days.days).filter(([d]) => d < today).map(([, v]) => v);
  return {current, best, todayComplete, perfectDays: sealed.filter(d => complete(d) && d.perfect).length + (todayComplete && todaySummary?.perfect ? 1 : 0), completeDays: sealed.filter(complete).length + (todayComplete ? 1 : 0)};
}

/** The missed days a streak freeze could mend: sealed, incomplete, within the last week, with favourite habits missed. */
export function mendableDays(days: ChecklistDays, today: string): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 7; i++) { const d = addDays(today, -i), day = days.days[d]; if (day && day.total > 0 && day.done < day.total) out.push(d); }
  return out;
}
