import type {TaskInput} from './engine';
import type {Tasks} from './schema';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {getAppStorage} from '../showcase-storage';

/**
 * Session AV lane 2 (tasks; TickTick's default reminder, Sunsama's day threshold, Todoist's daily goal): the key of the
 * Tasks planning record (lib/tasks/plan-record.ts holds its schema), and the one value the add paths need at once — the
 * default reminder — read without a schema, so the Tasks page's first chunk stays light. A value this reader cannot
 * read is no default (never an error).
 */
export const TASK_PLAN_KEY = 'zigoals:task-plan:v1';
/** The default reminder in minutes before a task's time (0 = at the time), or null when none is chosen. */
export function defaultReminderOf(storage: Pick<Storage, 'getItem'> | null | undefined): number | null {
  try {
    const raw = storage?.getItem(TASK_PLAN_KEY), v = raw ? JSON.parse(raw) as {version?: unknown; defaultReminder?: unknown} : null;
    const n = v && v.version === 1 ? v.defaultReminder : undefined;
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10_080 ? n : null;
  } catch { return null; }
}
/** A new task with a day and no reminder of its own takes the default reminder (TickTick); anything else is unchanged. */
export function withDefaultReminder<T extends Pick<TaskInput, 'due' | 'reminders'>>(input: T, before: number | null): T {
  return before === null || !input.due || input.reminders?.length ? input : {...input, reminders: [{before}]};
}
/** The same, reading this device's choice. */
export function withDeviceDefault<T extends Pick<TaskInput, 'due' | 'reminders'>>(input: T, storage?: Pick<Storage, 'getItem'> | null): T {
  let from = storage ?? null;
  try { if (!from && typeof window !== 'undefined') from = getAppStorage(); } catch { from = null; }
  return withDefaultReminder(input, defaultReminderOf(from));
}

/** Whole minutes a timer has run (at least 1 once started, so a short burst still counts). */
export const timerMinutes = (since: number, nowMs: number) => Math.max(1, Math.round((nowMs - since) / 60_000));
/**
 * Session AV lane 2 (review b1 #2): a task ticked Done while its timer runs keeps those minutes, as Stop does. This reads
 * the task's running timer without a schema (the add and Done paths stay light): its minutes up to `nowMs`, and `stop`,
 * which takes that timer off the planning record — called once the task's change is kept, so a change that fails leaves
 * the timer running. Null when the task has no timer (or the record cannot be read: then nothing is written over it).
 */
export function timerOnDone(storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined, taskId: string, nowMs: number): {minutes: number; stop: () => void} | null {
  try {
    const raw = storage?.getItem(TASK_PLAN_KEY), v = raw ? JSON.parse(raw) as {version?: unknown; timers?: unknown} : null;
    if (!storage || !v || v.version !== 1 || !Array.isArray(v.timers)) return null;
    const t = (v.timers as {taskId?: unknown; since?: unknown}[]).find(x => x && x.taskId === taskId && typeof x.since === 'number' && Number.isFinite(x.since));
    if (!t) return null;
    return {minutes: timerMinutes(t.since as number, nowMs), stop: () => {
      const now = JSON.parse(storage.getItem(TASK_PLAN_KEY) ?? 'null') as Record<string, unknown> | null;
      if (!now || !Array.isArray(now.timers)) return;
      const timers = (now.timers as {taskId?: unknown}[]).filter(x => !x || x.taskId !== taskId), next = {...now};
      if (timers.length) next.timers = timers; else delete next.timers;
      storage.setItem(TASK_PLAN_KEY, JSON.stringify(next));
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASK_PLAN_KEY}));
    }};
  } catch { return null; }
}
/** The minutes added to a task's time spent (capped as the schema caps it). */
export const withTimedMinutes = (record: Tasks, id: string, minutes: number): Tasks => minutes > 0
  ? {...record, tasks: record.tasks.map(t => t.id === id ? {...t, spent: Math.min((t.spent ?? 0) + Math.round(minutes), 100_000)} : t)} : record;
