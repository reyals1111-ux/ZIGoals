import type {TaskInput} from './engine';
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
