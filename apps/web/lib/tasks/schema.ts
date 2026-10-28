import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap: tasks with a priority and a due date; TIER 3 (stored format)). One-off things to do,
 * beside the daily Checklist path: a title, a priority (high, normal, low), an optional due day and an optional goal it
 * serves. A new device-only key, loose and versioned (older builds do not read it); in Export everything and its
 * restore; not synced (ADR-034 N18). Done tasks are kept 30 days, then dropped.
 */
export const TASKS_KEY = 'zigoals:tasks:v1';
export const MAX_TASKS = 500, DONE_KEEP_DAYS = 30;
export const TASK_PRIORITIES = ['high', 'normal', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const taskSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  title: z.string().trim().min(1).max(140),
  priority: z.enum(TASK_PRIORITIES).catch('normal'),
  due: day.optional(),
  /** The goal it serves, by the goal's key (shown by name; a goal removed later is simply not named). */
  goal: z.string().max(120).optional(),
  createdAt: z.iso.datetime({offset: true}),
  doneAt: z.iso.datetime({offset: true}).optional(),
});
export const tasksSchema = z.looseObject({version: z.literal(1), tasks: z.array(taskSchema).max(MAX_TASKS)});
export type Task = z.infer<typeof taskSchema>;
export type Tasks = z.infer<typeof tasksSchema>;
export const emptyTasks = (): Tasks => ({version: 1, tasks: []});
export const TASKS: DeviceRecordSpec<Tasks> = {key: TASKS_KEY, schema: tasksSchema, empty: emptyTasks};
