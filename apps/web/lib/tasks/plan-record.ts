import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';
import {completedLog} from './engine';
import {TASK_PLAN_KEY} from './plan-key';
import type {Tasks} from './schema';
import {MY_DAY_MAX, readMyDay} from './my-day';

/**
 * Session AV lane 2 (tasks; TIER 3 (stored format), a new additive key `zigoals:task-plan:v1`): how this person plans
 * their tasks on this device — loose, versioned and bounded; every field optional and dropped on read when it cannot be
 * read (never a reason to refuse the record). Device only: exported, restored and erased with the account, never synced.
 * - `defaultReminder` (TickTick's default reminder, LEDGER #11): minutes before a new task's time (0 = at the time);
 * - `dayLimit` (Sunsama's workload threshold, LEDGER #26): the minutes a day holds before Today warns;
 * - `dailyGoal` (Todoist's daily goal and streak, LEDGER #9): tasks to finish a day;
 * - `timers` (Sunsama's timers, several at once for parallel tasks, LEDGER #25, #27): which tasks are being timed, since when;
 * - `doneLog` (Todoist's history past the 30 days a finished task is kept, LEDGER #9, #13): finishes per day, counted up to
 *   `through` (yesterday at the last count), so a year of finishes outlives the tasks themselves.
 * Pure.
 */
export {TASK_PLAN_KEY};
export const MAX_TIMERS = 10, MAX_LOG_DAYS = 800, DAY_LIMIT_CHOICES = [120, 180, 240, 300, 360, 420, 480, 540, 600] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timerSchema = z.looseObject({taskId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), since: z.number().int().min(0)});
export const taskPlanSchema = z.looseObject({
  version: z.literal(1),
  defaultReminder: z.number().int().min(0).max(10_080).optional().catch(undefined),
  dayLimit: z.number().int().min(15).max(1440).optional().catch(undefined),
  dailyGoal: z.number().int().min(1).max(50).optional().catch(undefined),
  timers: z.preprocess(v => Array.isArray(v) ? v.filter(x => timerSchema.safeParse(x).success).slice(0, MAX_TIMERS) : undefined, z.array(timerSchema).optional()),
  doneLog: z.looseObject({
    through: day.optional().catch(undefined),
    days: z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, n]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 1000).sort(([a], [b]) => a.localeCompare(b)).slice(-MAX_LOG_DAYS)) : {}, z.record(z.string(), z.number())),
  }).optional().catch(undefined),
  /**
   * Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day; TIER 3 (stored format), additive and optional):
   * the tasks picked for one day (`day`, `ids`) and the last day's picks before it (`before`), lib/tasks/my-day.ts. A
   * value this build cannot read is dropped on read; older builds keep it untouched (the record is loose).
   */
  myDay: z.preprocess(v => readMyDay(v) ?? undefined, z.looseObject({day, ids: z.array(z.string()).max(MY_DAY_MAX), before: z.looseObject({day, ids: z.array(z.string()).max(MY_DAY_MAX)}).optional()}).optional()),
});
export type TaskPlan = z.infer<typeof taskPlanSchema>;
export const emptyTaskPlan = (): TaskPlan => ({version: 1});
export const TASK_PLAN: DeviceRecordSpec<TaskPlan> = {key: TASK_PLAN_KEY, schema: taskPlanSchema, empty: emptyTaskPlan};

/** Sets or clears (null) the person's choices. */
export function setPlanPrefs(plan: TaskPlan, patch: {defaultReminder?: number | null; dayLimit?: number | null; dailyGoal?: number | null}): TaskPlan {
  const next: Record<string, unknown> = {...plan};
  for (const key of ['defaultReminder', 'dayLimit', 'dailyGoal'] as const) { const v = patch[key]; if (v === null) delete next[key]; else if (v !== undefined) next[key] = v; }
  return taskPlanSchema.parse(next);
}

/* ---- Timers (Sunsama: planned vs actual; several at once) ------------------------------------------------------ */

export const runningTimer = (plan: TaskPlan, taskId: string) => plan.timers?.find(t => t.taskId === taskId);
export function startTimer(plan: TaskPlan, taskId: string, nowMs: number): TaskPlan {
  if (runningTimer(plan, taskId)) return plan;
  if ((plan.timers?.length ?? 0) >= MAX_TIMERS) throw new Error(`At most ${MAX_TIMERS} timers run at once. Stop one first.`);
  return taskPlanSchema.parse({...plan, timers: [...(plan.timers ?? []), {taskId, since: Math.round(nowMs)}]});
}
/** Whole minutes a timer has run (at least 1 once started, so a short burst still counts). */
export const timerMinutes = (since: number, nowMs: number) => Math.max(1, Math.round((nowMs - since) / 60_000));
/** Stops a task's timer: the plan without it and the minutes it ran (0 when none was running). */
export function stopTimer(plan: TaskPlan, taskId: string, nowMs: number): {plan: TaskPlan; minutes: number} {
  const t = runningTimer(plan, taskId);
  if (!t) return {plan, minutes: 0};
  const timers = (plan.timers ?? []).filter(x => x.taskId !== taskId), next: Record<string, unknown> = {...plan};
  if (timers.length) next.timers = timers; else delete next.timers;
  return {plan: taskPlanSchema.parse(next), minutes: timerMinutes(t.since, nowMs)};
}
/** Timers of tasks no longer on the list are dropped. */
export function tidyTimers(plan: TaskPlan, record: Tasks): TaskPlan {
  const live = new Set(record.tasks.filter(t => !t.doneAt).map(t => t.id)), timers = plan.timers?.filter(t => live.has(t.taskId));
  if (!plan.timers || timers!.length === plan.timers.length) return plan;
  const next: Record<string, unknown> = {...plan}; if (timers!.length) next.timers = timers; else delete next.timers;
  return taskPlanSchema.parse(next);
}

/* ---- Finishes per day, kept past the 30 days (Todoist's history, TickTick's year) ------------------------------ */

/** The finishes per device day the task list still holds (one-off tasks and each finished time of a repeating one). */
export function liveFinishes(record: Tasks, doneDay: (iso: string) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of completedLog(record)) { const d = doneDay(e.at); out.set(d, (out.get(d) ?? 0) + 1); }
  return out;
}
/**
 * Counts every day after `through` up to yesterday into the log (the list keeps 30 days, so a count at least every 30
 * days loses nothing). Today is never counted in: it is still changing. Returns the same plan when nothing is new.
 */
export function harvestDoneLog(plan: TaskPlan, record: Tasks, today: string, doneDay: (iso: string) => string): TaskPlan {
  const yesterday = addLocalDays(today, -1), through = plan.doneLog?.through;
  if (through && through >= yesterday) return plan;
  const live = liveFinishes(record, doneDay), days = {...(plan.doneLog?.days ?? {})};
  let changed = !plan.doneLog;
  for (const [d, n] of live) if (d <= yesterday && (!through || d > through) && n > 0) { days[d] = (days[d] ?? 0) + n; changed = true; }
  if (!changed && through === yesterday) return plan;
  return taskPlanSchema.parse({...plan, doneLog: {through: yesterday, days}});
}
/** Finishes per day: the log up to its `through`, the live list after it. */
export function finishesByDay(plan: TaskPlan, record: Tasks, doneDay: (iso: string) => string): Map<string, number> {
  const through = plan.doneLog?.through, out = new Map<string, number>(Object.entries(plan.doneLog?.days ?? {}));
  for (const [d, n] of liveFinishes(record, doneDay)) if (!through || d > through) out.set(d, (out.get(d) ?? 0) + n);
  return out;
}
/**
 * The daily goal's streak (Todoist): days in a row that reached the goal, up to today — today counts once reached, and a
 * today not reached yet does not break it (the streak then runs to yesterday). `best` is the longest run in the counts.
 */
export function goalStreak(byDay: ReadonlyMap<string, number>, goal: number, today: string): {current: number; best: number; today: number; reached: boolean} {
  const done = byDay.get(today) ?? 0, reached = done >= goal;
  let current = 0, d = reached ? today : addLocalDays(today, -1);
  while ((byDay.get(d) ?? 0) >= goal && current < 3660) { current++; d = addLocalDays(d, -1); }
  let best = current, run = 0, prev = '';
  for (const k of [...byDay.keys()].filter(k => (byDay.get(k) ?? 0) >= goal).sort()) { run = prev && addLocalDays(prev, 1) === k ? run + 1 : 1; prev = k; best = Math.max(best, run); }
  return {current, best, today: done, reached};
}
