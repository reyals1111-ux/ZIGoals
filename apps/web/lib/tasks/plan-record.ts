import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';
import {completedLog} from './engine';
import {TASK_PLAN_KEY, timerMinutes} from './plan-key';
import {MAX_TRAVEL, TASK_NOTES_MAX, TASK_TITLE_MAX, type Tasks} from './schema';
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
/** An earlier version of a task's title and notes, kept on this device (newest last; capped in lib/tasks/versions.ts). */
export const MAX_TASK_VERSIONS = 300, TASK_VERSIONS_PER_TASK = 10, MAX_TASK_VERSION_CHARS = 200_000;
const taskVersionSchema = z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), taskId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), title: z.string().max(TASK_TITLE_MAX), notes: z.string().max(TASK_NOTES_MAX).optional().catch(undefined), savedAt: z.iso.datetime({offset: true})});
export type TaskVersion = z.infer<typeof taskVersionSchema>;
/** Session AV lane 2 (r3-plan, LEDGER #260): a note typed while a task's timer runs (kept with the timer until it stops). */
export const TIMER_NOTE_MAX = 1000;
const timerSchema = z.looseObject({taskId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), since: z.number().int().min(0), note: z.string().max(TIMER_NOTE_MAX).optional().catch(undefined)});
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
/** Session AV lane 2 (r3-plan, LEDGER #259): the day's energy amount the person sets (Structured's default is 20). */
export const ENERGY_AMOUNT_DEFAULT = 20, ENERGY_AMOUNT_CHOICES = [8, 12, 16, 20, 24, 28, 32, 40] as const;
/**
 * Session AV lane 2 (r4-plan, LEDGER #301; Motion's schedules): a block of hours ("09:00"–"12:30"), and a weekday's blocks
 * (two at most, for a lunch break; none is a day off). A block that cannot be read, or that overlaps the one before, is
 * dropped on read; a weekday that cannot be read is left out (it takes the usual hours).
 */
export const MAX_DAY_BLOCKS = 2;
const hoursBlock = z.looseObject({from: clock, to: clock}).refine(b => b.from < b.to);
export type HoursBlock = {from: string; to: string};
export function readDayBlocks(v: unknown): HoursBlock[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const ok = v.flatMap(x => { const r = hoursBlock.safeParse(x); return r.success ? [r.data] : []; }).sort((a, b) => a.from.localeCompare(b.from));
  // Review B4D-6: a stored empty list is a day off; a list none of whose blocks can be read (a later build's shape, say a
  // block past midnight) is not: the weekday is left out, so it keeps the usual hours.
  if (v.length && !ok.length) return undefined;
  const out: HoursBlock[] = [];
  for (const b of ok) if (out.length < MAX_DAY_BLOCKS && (!out.length || b.from >= out.at(-1)!.to)) out.push(b);
  return out;
}
const workHoursSchema = z.looseObject({
  days: z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).flatMap(([k, x]) => { const blocks = /^[0-6]$/.test(k) ? readDayBlocks(x) : undefined; return blocks ? [[k, blocks]] : []; })) : undefined, z.record(z.string(), z.array(hoursBlock)).optional()),
  after: hoursBlock.optional().catch(undefined),
});
/** Session AV lane 2 (r5-plan, LEDGER #348, #353): time blocks and the travel minutes of imported events. */
export const MAX_TIME_BLOCKS = 30, BLOCK_NAME_MAX = 60, MAX_EVENT_TRAVEL = 200;
export const BLOCK_COLOURS = ['blue', 'teal', 'green', 'violet', 'yellow', 'grey'] as const;
export type BlockColour = (typeof BLOCK_COLOURS)[number];
const timeBlockSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), name: z.string().trim().min(1).max(BLOCK_NAME_MAX), colour: z.enum(BLOCK_COLOURS).catch('blue'),
  from: clock, to: clock,
  days: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter((x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b) : undefined, z.array(z.number()).optional()),
  on: day.optional().catch(undefined),
}).refine(b => b.from < b.to && (!!b.days?.length || !!b.on));
export type TimeBlock = z.infer<typeof timeBlockSchema>;
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
  /** Session AV lane 2 (rest, LEDGER #33; TIER 3 (stored formats), additive): earlier versions of tasks' titles and notes (lib/tasks/versions.ts). */
  versions: z.preprocess(v => Array.isArray(v) ? v.filter(x => taskVersionSchema.safeParse(x).success).slice(-MAX_TASK_VERSIONS) : undefined, z.array(taskVersionSchema).optional()).optional().catch(undefined),
  /**
   * Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day; TIER 3 (stored format), additive and optional):
   * the tasks picked for one day (`day`, `ids`) and the last day's picks before it (`before`), lib/tasks/my-day.ts. A
   * value this build cannot read is dropped on read; older builds keep it untouched (the record is loose).
   */
  myDay: z.preprocess(v => readMyDay(v) ?? undefined, z.looseObject({day, ids: z.array(z.string()).max(MY_DAY_MAX), before: z.looseObject({day, ids: z.array(z.string()).max(MY_DAY_MAX)}).optional()}).optional()),
  /**
   * Session AV lane 2 (r3-plan; TIER 3 (stored format), additive and optional, each dropped on read when it cannot be read;
   * older builds keep them untouched (the record is loose) and do nothing with them):
   * `planReminder` (LEDGER #256, Structured's morning planning) the time of the "Plan your day" notification, which opens
   * Plan my day (lib/notify/plan.ts, its own notification type); `energyAmount` (LEDGER #259, Structured's Energy Monitor)
   * how much energy a day holds, 1–100 (lib/tasks/energy-load.ts; 20 when not set).
   */
  planReminder: z.looseObject({time: clock}).optional().catch(undefined),
  energyAmount: z.number().int().min(1).max(100).optional().catch(undefined),
  /**
   * Session AV lane 2 (r4-plan, LEDGER #301; Motion's schedules; TIER 3 (stored format), additive and optional): the hours
   * tasks may be placed in, per weekday (`days`, "0" Sunday to "6" Saturday; a weekday not set keeps 09:00–18:00), and the
   * evening hours (`after`, 20:00–23:00 when not set) for a task marked "after hours" (lib/tasks/work-hours.ts). A value this
   * build cannot read is dropped on read; older builds keep it untouched (the record is loose) and plan from 09:00 as before.
   */
  workHours: workHoursSchema.optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-plan; Akiflow; TIER 3 (stored format), additive and optional; dropped on read when it cannot be
   * read, never the record; older builds keep them untouched (the record is loose) and do not use them):
   * `blocks` (LEDGER #348, Akiflow's time slots) named blocks of time ("Deep work", 09:00–11:00) in a calm colour, once on a
   * day (`on`) or on chosen weekdays (`days`, 0 Sunday to 6 Saturday); tasks are dropped into one by their `block`
   * (lib/tasks/time-blocks.ts). A block that cannot be read is dropped, never the others.
   * `eventTravel` (LEDGER #353) the travel minutes typed before an imported calendar event, by the event's id (the short
   * hash lib/ics/calendar.ts keeps, never its UID); an id or a number that cannot be read is dropped.
   */
  blocks: z.preprocess(v => Array.isArray(v) ? v.filter(x => timeBlockSchema.safeParse(x).success).slice(0, MAX_TIME_BLOCKS) : undefined, z.array(timeBlockSchema).optional()),
  eventTravel: z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, n]) => /^[0-9a-f]{16}$/.test(k) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_TRAVEL).slice(0, MAX_EVENT_TRAVEL)) : undefined, z.record(z.string(), z.number()).optional()),
});
export type TaskPlan = z.infer<typeof taskPlanSchema>;
export const emptyTaskPlan = (): TaskPlan => ({version: 1});
export const TASK_PLAN: DeviceRecordSpec<TaskPlan> = {key: TASK_PLAN_KEY, schema: taskPlanSchema, empty: emptyTaskPlan};

/** Sets or clears (null) the person's choices. */
export function setPlanPrefs(plan: TaskPlan, patch: {defaultReminder?: number | null; dayLimit?: number | null; dailyGoal?: number | null; energyAmount?: number | null; planTime?: string | null}): TaskPlan {
  const next: Record<string, unknown> = {...plan};
  for (const key of ['defaultReminder', 'dayLimit', 'dailyGoal', 'energyAmount'] as const) { const v = patch[key]; if (v === null) delete next[key]; else if (v !== undefined) next[key] = v; }
  if (patch.planTime === null) delete next.planReminder;
  else if (patch.planTime !== undefined) { if (!clock.safeParse(patch.planTime).success) throw new Error('Choose a time such as 07:30.'); next.planReminder = {...(plan.planReminder ?? {}), time: patch.planTime}; }
  return taskPlanSchema.parse(next);
}
/** Session AV lane 2 (r3-plan, LEDGER #260): the note kept with a running timer (an empty one is removed). */
export function setTimerNote(plan: TaskPlan, taskId: string, note: string): TaskPlan {
  if (!runningTimer(plan, taskId)) return plan;
  const text = note.slice(0, TIMER_NOTE_MAX);
  return taskPlanSchema.parse({...plan, timers: (plan.timers ?? []).map(t => { if (t.taskId !== taskId) return t; const {note: _n, ...rest} = t; void _n; return text.trim() ? {...rest, note: text} : rest; })});
}

/* ---- Timers (Sunsama: planned vs actual; several at once) ------------------------------------------------------ */

export const runningTimer = (plan: TaskPlan, taskId: string) => plan.timers?.find(t => t.taskId === taskId);
export function startTimer(plan: TaskPlan, taskId: string, nowMs: number): TaskPlan {
  if (runningTimer(plan, taskId)) return plan;
  if ((plan.timers?.length ?? 0) >= MAX_TIMERS) throw new Error(`At most ${MAX_TIMERS} timers run at once. Stop one first.`);
  return taskPlanSchema.parse({...plan, timers: [...(plan.timers ?? []), {taskId, since: Math.round(nowMs)}]});
}
export {timerMinutes};
/** Stops a task's timer: the plan without it, the minutes it ran (0 when none was running) and the note kept with it. */
export function stopTimer(plan: TaskPlan, taskId: string, nowMs: number): {plan: TaskPlan; minutes: number; note?: string} {
  const t = runningTimer(plan, taskId);
  if (!t) return {plan, minutes: 0};
  const timers = (plan.timers ?? []).filter(x => x.taskId !== taskId), next: Record<string, unknown> = {...plan};
  if (timers.length) next.timers = timers; else delete next.timers;
  return {plan: taskPlanSchema.parse(next), minutes: timerMinutes(t.since, nowMs), ...(t.note?.trim() ? {note: t.note.trim()} : {})};
}
/** Timers of tasks no longer on the list are dropped. */
export function tidyTimers(plan: TaskPlan, record: Tasks): TaskPlan { return settleTimers(plan, record).plan; }
/**
 * Review b1 #2: timers of tasks that are done (finished somewhere the Done box could not stop the timer: another tab, an
 * older build) give their minutes up to the moment the task was finished, for the task's time spent; timers of tasks that
 * are gone are dropped. `spent` lists what to add; the plan is the same object when nothing changes.
 */
export function settleTimers(plan: TaskPlan, record: Tasks): {plan: TaskPlan; spent: {taskId: string; minutes: number}[]} {
  if (!plan.timers?.length) return {plan, spent: []};
  const byId = new Map(record.tasks.map(t => [t.id, t])), spent: {taskId: string; minutes: number}[] = [];
  const timers = plan.timers.filter(x => {
    const t = byId.get(x.taskId);
    if (t && !t.doneAt) return true;
    const done = t?.doneAt ? Date.parse(t.doneAt) : NaN;
    if (t && Number.isFinite(done) && done >= x.since) spent.push({taskId: t.id, minutes: timerMinutes(x.since, done)});
    return false;
  });
  if (timers.length === plan.timers.length) return {plan, spent};
  const next: Record<string, unknown> = {...plan}; if (timers.length) next.timers = timers; else delete next.timers;
  return {plan: taskPlanSchema.parse(next), spent};
}

/* ---- Finishes per day, kept past the 30 days (Todoist's history, TickTick's year) ------------------------------ */

/** The finishes per device day the task list still holds (one-off tasks and each finished time of a repeating one). */
export function liveFinishes(record: Tasks, doneDay: (iso: string) => string): Map<string, number> {
  const out = new Map<string, number>();
  // Session AV lane 2 (r5-plan, LEDGER #350): a cancelled task is not a finish (the daily goal and its streak leave it out).
  for (const e of completedLog(record)) { if (e.cancelled) continue; const d = doneDay(e.at); out.set(d, (out.get(d) ?? 0) + 1); }
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
