import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AV (owner follow-up 1, F-TASKS-DONE; Todoist's productivity view, without points or karma): how many tasks were
 * finished per day over the last 14 days and per week over the last 4 (weeks start on Monday), from the Completed list
 * (lib/tasks/engine.ts completedLog, finished tasks kept 30 days). Counts only; nothing stored. Pure.
 */
export type DoneDay = {date: string; count: number};
export type DoneWeek = {start: string; end: string; count: number};
export function doneByDay(log: readonly {at: string}[], today: string, doneDay: (iso: string) => string, days = 14): DoneDay[] {
  const counts = new Map<string, number>();
  for (const e of log) { const d = doneDay(e.at); counts.set(d, (counts.get(d) ?? 0) + 1); }
  return Array.from({length: days}, (_, i) => { const date = addLocalDays(today, i - days + 1); return {date, count: counts.get(date) ?? 0}; });
}
export function doneByWeek(log: readonly {at: string}[], today: string, doneDay: (iso: string) => string, weeks = 4): DoneWeek[] {
  const monday = addLocalDays(today, -((localWeekday(today) + 6) % 7));
  const out = Array.from({length: weeks}, (_, i) => { const start = addLocalDays(monday, -7 * (weeks - 1 - i)); return {start, end: addLocalDays(start, 6), count: 0}; });
  for (const e of log) { const d = doneDay(e.at), w = out.find(x => d >= x.start && d <= x.end); if (w) w.count++; }
  return out;
}
/**
 * Session AV lane 2 (minors, q1 #6 check 8; Todoist draws the daily goal on its chart): the daily goal kept in Tasks →
 * This week (zigoals:task-plan:v1 `dailyGoal`) as a line across the bars — `top` is the bars' scale with the goal in it —
 * and how many of the days shown reached it. Null without a goal. Pure.
 */
export function goalLine(days: readonly DoneDay[], goal: number | undefined): {goal: number; top: number; reached: number} | null {
  if (!goal || !Number.isInteger(goal) || goal < 1) return null;
  return {goal, top: Math.max(goal, ...days.map(d => d.count)), reached: days.filter(d => d.count >= goal).length};
}
