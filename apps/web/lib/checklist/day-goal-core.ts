/**
 * Session AP (owner decision 14 Nov, backlog #3, C-DVG-20; TIER 3 stored format, ADR-040): "A day counts as done at N".
 * Off by default (no record, or `need: null`): a day counts when every dot is lit — the Checklist's rule exactly as before.
 * On: a day counts once N of its dots are lit; a day with fewer than N dots counts when all are lit (min(N, the day's dots),
 * the reading the owner approved). The flame (lib/checklist/streak.ts) and Journey's orbit badges (lib/game/badges.ts via
 * checklistOrbitDays) read it; the Checklist awards no XP of its own (Session AG), so nothing else changes.
 *
 * Never rewrites or re-counts a past day: the record is a list of dated changes and each day is judged by the rule in force
 * on that day (days before the first change by "every dot", forever). A change applies from the day it is made.
 * This core has no imports (the shell and the Checklist launcher carry nothing more; lib/checklist/day-goal-read.ts reads
 * a stored value without the schema, loaded only when a device has one; lib/checklist/day-goal.ts holds the schema and the write).
 */
export const DAY_GOAL_KEY_LITERAL = 'zigoals:day-goal:v1';
export const DAY_GOAL_MAX = 30;
export const DAY_GOAL_CHANGES_MAX = 400;
export type DayGoalChange = {from: string; need: number | null};
export type DayGoal = {version: 1; changes: DayGoalChange[]};
export const emptyDayGoal = (): DayGoal => ({version: 1, changes: []});

/** The rule in force on `date`: N, or null for "every dot". */
export function needOn(goal: DayGoal | null | undefined, date: string): number | null {
  let need: number | null = null;
  for (const c of goal?.changes ?? []) { if (c.from > date) break; need = c.need; }
  return need;
}
/** How many lit dots the day needs to count: every dot, or min(N, the day's dots). */
export const dotsNeeded = (total: number, need: number | null): number => need === null ? total : Math.min(need, total);
/** Whether a day with these dots counts as done under its own rule. */
export function dayCounts(day: {total: number; done: number} | null | undefined, need: number | null): boolean {
  return !!day && day.total > 0 && day.done >= dotsNeeded(day.total, need);
}

// The rule on this page, set by the shell from the device record (components/day-ends-keeper.tsx), as "My day ends at" is.
let current: DayGoal = emptyDayGoal();
const listeners = new Set<() => void>();
export function currentDayGoal(): DayGoal { return current; }
export function setCurrentDayGoal(next: DayGoal): void {
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  for (const listener of listeners) listener();
}
export function subscribeDayGoal(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
