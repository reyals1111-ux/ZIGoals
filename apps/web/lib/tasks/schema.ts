import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap: tasks with a priority and a due date; TIER 3 (stored format)). One-off things to do,
 * beside the daily Checklist path: a title, a priority (high, normal, low), an optional due day and an optional goal it
 * serves. A new device-only key, loose and versioned (older builds do not read it); in Export everything and its
 * restore; not synced (ADR-034 N18). Done tasks are kept 30 days, then dropped.
 *
 * Session AL (Part 8, O6: Tasks at Todoist/TickTick level; TIER 3 (stored format), additive only). Every new field is
 * optional and read tolerantly (a value this build cannot read is dropped on read, never failing the whole list); the
 * objects stay loose, so an older build keeps the new fields untouched when it writes the list back:
 * - on a task: `level` (priority p1–p4; `priority` is still written for older readers), `projectId`, `sectionId`,
 *   `parentId` (a subtask), `labels`, `recur` (a repeat rule), `reminders`, `notes`, `habit` and `health` (links beside
 *   `goal`), `order` (manual order), `updatedAt` (the last change, for "changed in another tab") and `completions` (the
 *   finished occurrences of a repeating task);
 * - on the record: `projects`, `sections`, `labelColors` and `filters` (saved searches).
 * The 500-task cap stays: the frozen readers of earlier builds (#53 and before) refuse a list over 500, so a longer list
 * would read as "could not be read" there. The page says so and counts towards it.
 */
export const TASKS_KEY = 'zigoals:tasks:v1';
export const MAX_TASKS = 500, DONE_KEEP_DAYS = 30;
export const TASK_PRIORITIES = ['high', 'normal', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_TITLE_MAX = 140, TASK_NOTES_MAX = 5000, TASK_LABELS_MAX = 20, LABEL_MAX = 40, PROJECT_NAME_MAX = 60;
export const MAX_PROJECTS = 100, MAX_SECTIONS = 300, MAX_FILTERS = 50, MAX_REMINDERS = 5, MAX_COMPLETIONS = 60;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
/** Session AK (T1; TIER 3 (stored format), additive): an optional wall-clock time on the due day ("HH:MM"). */
export const TASK_CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
/** A label as typed after "@": letters, digits, "_" and "-", no spaces. */
export const LABEL_PATTERN = /^[\p{L}\p{N}_-]{1,40}$/u;
/** The colours a project or label can take (named, so every theme draws its own shade). */
export const TASK_COLOURS = ['grey', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'violet', 'pink'] as const;
export type TaskColour = (typeof TASK_COLOURS)[number];
/** Links a task can carry besides a goal: the Health area it is about. */
export const HEALTH_LINKS = ['water', 'food', 'weight', 'sleep', 'movement', 'workout', 'mind', 'fasting'] as const;
export type HealthLink = (typeof HEALTH_LINKS)[number];

/** Keeps only the array items that read; drops the rest (one odd item never fails the list). */
const tolerantArray = <T extends z.ZodType>(item: T, max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => item.safeParse(x).success).slice(0, max) : undefined, z.array(item).max(max).optional());

/**
 * A repeat rule (Session AL, P-LS-02): every N days / weeks (on chosen weekdays) / months (on a day of the month, or
 * the "first Monday") / years; `afterDone` counts from the day it was finished ("every! 3 days"); `until` and `left`
 * end it. `text` is the phrase as typed, shown back to the person.
 */
export const recurSchema = z.looseObject({
  every: z.enum(['day', 'week', 'month', 'year']),
  interval: z.number().int().min(1).max(365),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional().catch(undefined),
  /** 1–31, or -1 for the last day of the month. */
  monthDay: z.number().int().min(-1).max(31).refine(n => n !== 0).optional().catch(undefined),
  /** The nth weekday of the month: n 1–5, or -1 for the last. */
  nth: z.object({n: z.number().int().min(-1).max(5).refine(n => n !== 0), weekday: z.number().int().min(0).max(6)}).optional().catch(undefined),
  afterDone: z.boolean().optional().catch(undefined),
  until: day.optional().catch(undefined),
  /** Occurrences left, this one included. */
  left: z.number().int().min(1).max(999).optional().catch(undefined),
  text: z.string().max(120).optional().catch(undefined),
});
export type Recur = z.infer<typeof recurSchema>;
export const reminderSchema = z.looseObject({before: z.number().int().min(0).max(40_320)});
export type TaskReminder = z.infer<typeof reminderSchema>;

export const taskSchema = z.looseObject({
  id,
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  priority: z.enum(TASK_PRIORITIES).catch('normal'),
  due: day.optional(),
  /** The goal it serves, by the goal's key (shown by name; a goal removed later is simply not named). */
  goal: z.string().max(120).optional(),
  /**
   * Session AK (T1; TIER 3 (stored format), additive and optional): a time on the due day, so the task sits among the
   * day's habits on the Agenda. A value this build cannot read is dropped on read (never fails the whole list); older
   * builds keep it untouched (the object is loose).
   */
  time: z.string().regex(TASK_CLOCK).optional().catch(undefined),
  createdAt: z.iso.datetime({offset: true}),
  doneAt: z.iso.datetime({offset: true}).optional(),
  // Session AL (Part 8): see the module note. Each one optional and dropped on read when it cannot be read.
  level: z.number().int().min(1).max(4).optional().catch(undefined),
  projectId: id.optional().catch(undefined),
  sectionId: id.optional().catch(undefined),
  parentId: id.optional().catch(undefined),
  labels: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && LABEL_PATTERN.test(x)))].slice(0, TASK_LABELS_MAX) : undefined, z.array(z.string()).optional()),
  recur: recurSchema.optional().catch(undefined),
  reminders: tolerantArray(reminderSchema, MAX_REMINDERS),
  notes: z.string().max(TASK_NOTES_MAX).optional().catch(undefined),
  habit: z.string().max(120).optional().catch(undefined),
  health: z.enum(HEALTH_LINKS).optional().catch(undefined),
  order: z.number().finite().optional().catch(undefined),
  updatedAt: z.iso.datetime({offset: true}).optional().catch(undefined),
  completions: tolerantArray(z.looseObject({at: z.iso.datetime({offset: true}), due: day.optional().catch(undefined)}), MAX_COMPLETIONS),
});
export const projectSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), colour: z.enum(TASK_COLOURS).catch('grey'),
  order: z.number().finite().catch(0), archived: z.boolean().optional().catch(undefined), view: z.enum(['list', 'board']).optional().catch(undefined),
});
export const sectionSchema = z.looseObject({id, projectId: id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), order: z.number().finite().catch(0)});
export const filterSchema = z.looseObject({id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), query: z.string().trim().min(1).max(200)});
export const tasksSchema = z.looseObject({
  version: z.literal(1),
  tasks: z.array(taskSchema).max(MAX_TASKS),
  projects: tolerantArray(projectSchema, MAX_PROJECTS),
  sections: tolerantArray(sectionSchema, MAX_SECTIONS),
  labelColors: z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, c]) => LABEL_PATTERN.test(k) && (TASK_COLOURS as readonly unknown[]).includes(c)).slice(0, 200)) : undefined, z.record(z.string(), z.enum(TASK_COLOURS)).optional()),
  filters: tolerantArray(filterSchema, MAX_FILTERS),
});
export type Task = z.infer<typeof taskSchema>;
export type Tasks = z.infer<typeof tasksSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SavedFilter = z.infer<typeof filterSchema>;
export const emptyTasks = (): Tasks => ({version: 1, tasks: []});
export const TASKS: DeviceRecordSpec<Tasks> = {key: TASKS_KEY, schema: tasksSchema, empty: emptyTasks};

/* ---- Priority p1–p4 (Session AL, P-LS-01) --------------------------------------------------------------------- */

export type TaskLevel = 1 | 2 | 3 | 4;
/**
 * The older three-step priority read as p1–p4, keeping its order: high → p1, normal → p3 (the default, no chip),
 * low → p4. p2 (Medium) is new.
 */
const FROM_PRIORITY: Record<TaskPriority, TaskLevel> = {high: 1, normal: 3, low: 4};
/** What an older reader is given for each level (p2 has no older word, so it reads as high there, its nearest). */
export const PRIORITY_OF_LEVEL: Record<TaskLevel, TaskPriority> = {1: 'high', 2: 'high', 3: 'normal', 4: 'low'};
export const DEFAULT_LEVEL: TaskLevel = 3;
export const LEVEL_WORDS: Record<TaskLevel, string> = {1: 'P1 · High', 2: 'P2 · Medium', 3: 'P3 · Normal', 4: 'P4 · Low'};
export const LEVEL_SHORT: Record<TaskLevel, string> = {1: 'High', 2: 'Medium', 3: 'Normal', 4: 'Low'};
/** A task's priority as p1–p4: its level when written, else read from the older field. */
export function taskLevel(task: Pick<Task, 'level' | 'priority'>): TaskLevel {
  const level = task.level;
  return level === 1 || level === 2 || level === 3 || level === 4 ? level : FROM_PRIORITY[task.priority] ?? DEFAULT_LEVEL;
}
/** Both fields for a level: the level and the older reader's word. */
export const levelFields = (level: TaskLevel): {level: TaskLevel; priority: TaskPriority} => ({level, priority: PRIORITY_OF_LEVEL[level]});
