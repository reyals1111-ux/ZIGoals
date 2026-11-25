import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {TASK_LOOK_COLOURS, TASK_LOOK_GLYPHS} from './look';

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
/** How deep the Tasks page draws subtasks (SB-3: a guard, so no chain of parents can recurse without end). */
export const MAX_SUBTASK_DEPTH = 8;
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
  /**
   * Session AV lane 2 (r4-plan, LEDGER #305; Motion's repeat window; TIER 3 (stored format), additive and optional): the
   * repeat floats — once a week or once a month, any day of it. Written with `every` week (on Sunday, the week's last day)
   * or month (on its last day) and `interval` 1, so an older build reads it as that fixed repeat; it keeps `flex` untouched.
   */
  flex: z.enum(['week', 'month']).optional().catch(undefined),
  /**
   * Session AV lane 2 (r6-plan, LEDGER #398; OmniFocus's "next to last" weekday; TIER 3 (stored format), additive and
   * optional): `fromEnd` a weekday counted from the month's end — n 2 the second-to-last, up to 5 (the last one stays `nth`
   * -1); `workday` the month's first or last working day (Monday to Friday). An older build drops an `nth` it cannot read, so
   * these never go in `nth`: each is written beside a plain `monthDay` (the first occurrence's day; the last working day:
   * -1, the first: 1) that an older build follows, keeping these untouched. This build reads them before `nth` and `monthDay`.
   */
  fromEnd: z.looseObject({n: z.number().int().min(2).max(5), weekday: z.number().int().min(0).max(6)}).optional().catch(undefined),
  workday: z.enum(['first', 'last']).optional().catch(undefined),
});
export type Recur = z.infer<typeof recurSchema>;
/**
 * Session AV lane 2 (tasks, LEDGER #3; Todoist's custom reminder; TIER 3 (stored format), additive and optional): `at` is
 * a reminder at a date and time of its own ("YYYY-MM-DDTHH:MM", the device's wall clock), apart from the task's day.
 * `before` stays (0 for such a reminder), so an older build still reads the reminder as "at the time" of a dated task.
 */
export const REMINDER_AT = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/;
/**
 * Session AW (X1, LEDGER #438; Due's "remind again"; TIER 3 (stored format), additive and optional): `again` repeats a
 * reminder that has gone off every 5, 10, 15 or 30 minutes, 2 to 10 times, until the task is done or the reminder snoozed
 * (lib/tasks/remind-again.ts); `false` keeps this reminder from following the device's default. A value this build cannot
 * read is dropped on read; older builds keep it untouched (the object is loose) and remind once, as before.
 */
export const reminderAgainSchema = z.union([z.literal(false), z.looseObject({every: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]), times: z.number().int().min(2).max(10)})]);
export const reminderSchema = z.looseObject({before: z.number().int().min(0).max(40_320), at: z.string().regex(REMINDER_AT).optional().catch(undefined), again: reminderAgainSchema.optional().catch(undefined)});
export type TaskReminder = z.infer<typeof reminderSchema>;

/**
 * Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): how much a task asks of the person — restful
 * (gives some back), neutral, light, medium or heavy. Words only; lib/tasks/energy-load.ts turns them into the day's total.
 */
export const TASK_ENERGY = ['restful', 'neutral', 'light', 'medium', 'heavy'] as const;
export type TaskEnergy = (typeof TASK_ENERGY)[number];
/** Session AV (F-TASK-MINUTES): the longest a task can be said to take, a whole day. */
export const MAX_TASK_MINUTES = 1440;
/** Session AV lane 2 (r4-plan, LEDGER #303, #304): a long task's smallest piece, and how many tasks one can wait for. */
export const MIN_CHUNK = 15, MAX_CHUNK = 240, MAX_AFTER = 3;
/** Session AV lane 2 (r5-plan, LEDGER #350, #353, #354): a task's states, the longest travel before it, the longest place. */
export const TASK_STATES = ['doing', 'cancelled'] as const;
export const MAX_TRAVEL = 600, PLACE_MAX = 200;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
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
  /**
   * Session AV (owner follow-up 1, F-DEADLINES; Things, Todoist Deadlines; TIER 3 (stored format), additive and optional):
   * the day the task must be done by, kept apart from `due` (the day it is planned for). A value this build cannot read
   * is dropped on read; older builds keep it untouched (the object is loose) and simply do not show it.
   */
  deadline: day.optional().catch(undefined),
  /**
   * Session AV (owner follow-up 1, F-TASK-MINUTES; Todoist durations, Sunsama's planned time; TIER 3 (stored format),
   * additive and optional): how many minutes the task takes, 1 to 1,440. A value this build cannot read is dropped on
   * read; older builds keep it untouched (the object is loose) and do not show it.
   */
  minutes: z.number().int().min(1).max(MAX_TASK_MINUTES).optional().catch(undefined),
  /**
   * Session AV (1c, q1 #1, fresh-agent review; Todoist and TickTick snooze; TIER 3 (stored format), additive and optional):
   * a reminder snoozed in the app — the reminder's own instant (`of`, ms), its offset (`before`, minutes) and when it
   * comes back (`until`, ms). A value
   * this build cannot read is dropped on read; older builds keep it untouched (the object is loose) and ignore it.
   */
  snooze: z.looseObject({of: z.number().int().min(0), until: z.number().int().min(0), before: z.number().int().min(0).max(40_320).optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AV lane 2 (tasks; Sunsama, Things, Todoist; TIER 3 (stored format), additive and optional, each dropped on
   * read when it cannot be read; older builds keep them untouched (the object is loose) and do not show them):
   * `spent` the minutes actually worked on it (the timer, planned vs actual); `early` start-early days (it shows in Today
   * that many days before its day); `parallel` a background task (not added to the day's load); `objective` the week
   * objective it serves (`objectives` on the record); `comments` short notes in time order (text and links, this device).
   */
  spent: z.number().int().min(0).max(100_000).optional().catch(undefined),
  early: z.number().int().min(1).max(60).optional().catch(undefined),
  parallel: z.literal(true).optional().catch(undefined),
  objective: id.optional().catch(undefined),
  comments: tolerantArray(z.looseObject({id, at: z.iso.datetime({offset: true}), text: z.string().trim().min(1).max(1000)}), 50),
  /**
   * Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields; TIER 3 (stored format), additive and optional): the
   * task's values of its project's own fields, by field id — text (≤ 200), a number, a day, one of the field's choices, or
   * a tick. A value this build cannot read is dropped on read (never the task); older builds keep `fields` untouched.
   */
  fields: z.preprocess(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
    const kept = Object.entries(v).filter(([k, x]) => /^[A-Za-z0-9_-]{1,80}$/.test(k) && ((typeof x === 'string' && x.length >= 1 && x.length <= FIELD_TEXT_MAX) || (typeof x === 'number' && Number.isFinite(x)) || x === true)).slice(0, 20);
    return kept.length ? Object.fromEntries(kept) : undefined;
  }, z.record(z.string(), z.union([z.string(), z.number(), z.literal(true)])).optional()),
  /**
   * Session AV lane 2 (r3-plan; TIER 3 (stored format), additive and optional, each dropped on read when it cannot be read;
   * older builds keep them untouched (the object is loose) and do not show them):
   * `look` (LEDGER #257, Structured's task icons and colours) a symbol and a named colour from the habit-look set, shown
   * beside the title; `energy` (LEDGER #259, Structured's Energy Monitor) how much the task asks, for the day's total.
   */
  look: z.looseObject({glyph: z.enum(TASK_LOOK_GLYPHS), colour: z.enum(TASK_LOOK_COLOURS)}).optional().catch(undefined),
  energy: z.enum(TASK_ENERGY).optional().catch(undefined),
  /**
   * Session AV lane 2 (r4-plan; Motion; TIER 3 (stored format), additive and optional, each dropped on read when it cannot
   * be read; older builds keep them untouched (the object is loose) and do not use them):
   * `chunk` (LEDGER #303, Motion's chunks) the smallest piece, 15–240 minutes, Plan my day and Plan my week place a long
   * task in; `after` (LEDGER #304, Motion's blockers) up to three tasks it waits for, by id (one no longer on the list, done,
   * repeating or itself is not waited for: lib/tasks/engine.ts waitingFor); `afterHours` (LEDGER #301, Motion's schedules)
   * placed in the evening hours of the planning record rather than the working hours.
   */
  chunk: z.number().int().min(MIN_CHUNK).max(MAX_CHUNK).optional().catch(undefined),
  after: z.preprocess(v => { if (!Array.isArray(v)) return undefined; const ids = [...new Set(v.filter(x => typeof x === 'string' && ID.test(x)))].slice(0, MAX_AFTER); return ids.length ? ids : undefined; }, z.array(z.string()).optional()),
  afterHours: z.literal(true).optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-plan; Akiflow, Logseq; TIER 3 (stored format), additive and optional, each dropped on read when it
   * cannot be read; older builds keep them untouched (the object is loose) and do not show them):
   * `state` (LEDGER #350, Logseq's DOING and CANCELED) "doing" — begun at `at` — or "cancelled" — closed at `at` without
   * being done. A cancelled task also carries `doneAt`, so an older build shows it as finished, never as open; this build
   * keeps it out of the done chart, the daily goal and its streak (lib/tasks/task-state.ts);
   * `plan` (LEDGER #349, Akiflow's This week and This month) a task with no day planned for a week (`of`, a day of it) or a
   * month (`of`, its first day); it means nothing once the task has a day (lib/tasks/plan-bucket.ts);
   * `block` (LEDGER #348, Akiflow's time slots) the time block (`zigoals:task-plan:v1` `blocks`) it is dropped into, on its day;
   * `travel` (LEDGER #353) the minutes of travel before its time, typed by the person (nothing is looked up);
   * `place` (LEDGER #354) a written place, an address or a link (nothing is looked up), written as the LOCATION of the .ics export.
   */
  state: z.looseObject({kind: z.enum(TASK_STATES), at: z.iso.datetime({offset: true})}).optional().catch(undefined),
  plan: z.looseObject({kind: z.enum(['week', 'month']), of: day}).refine(p => p.kind !== 'month' || p.of.endsWith('-01')).optional().catch(undefined),
  block: id.optional().catch(undefined),
  travel: z.number().int().min(1).max(MAX_TRAVEL).optional().catch(undefined),
  place: z.string().trim().min(1).max(PLACE_MAX).optional().catch(undefined),
  /**
   * Session AV lane 2 (r6-plan, LEDGER #393; OmniFocus's sequential action groups; TIER 3 (stored format), additive and
   * optional): its subtasks are done in order — only the first open one is available, the next waits for it
   * (lib/tasks/engine.ts orderAhead). An older build keeps it untouched and shows every subtask as before.
   */
  inOrder: z.literal(true).optional().catch(undefined),
});
/**
 * Session AV lane 2 (tasks-r2, LEDGER #228; Any.do's automations; TIER 3 (stored format), additive and optional): a rule on a
 * project — when a task is added, enters a section or is done, then set its priority, add a label, plan it for today, mark
 * it done, move it to a section or create the next one (lib/tasks/rules.ts runs them). Each field is dropped on read when
 * it cannot be read, and a rule that cannot be read is dropped (never the project); older builds keep `rules` untouched.
 */
export const RULE_WHEN = ['added', 'section', 'done'] as const;
export const RULE_THEN = ['level', 'label', 'today', 'done', 'move', 'next'] as const;
export const MAX_RULES = 10;
export const ruleSchema = z.looseObject({
  id, when: z.enum(RULE_WHEN), section: id.optional().catch(undefined), then: z.enum(RULE_THEN),
  level: z.number().int().min(1).max(4).optional().catch(undefined), label: z.string().regex(LABEL_PATTERN).optional().catch(undefined),
  to: id.optional().catch(undefined), title: z.string().trim().min(1).max(TASK_TITLE_MAX).optional().catch(undefined), days: z.number().int().min(0).max(365).optional().catch(undefined),
});
/**
 * Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields; TIER 3 (stored format), additive and optional): a field a
 * project adds to its tasks (text, number, date, a choice from a list, a tick), up to five. Read tolerantly: a field that
 * cannot be read is dropped (never the project); older builds keep `fields` untouched.
 */
export const FIELD_KINDS = ['text', 'number', 'date', 'choice', 'tick'] as const;
export const MAX_FIELDS = 5, FIELD_NAME_MAX = 40, FIELD_TEXT_MAX = 200, MAX_FIELD_OPTIONS = 12;
export const fieldDefSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(FIELD_NAME_MAX), kind: z.enum(FIELD_KINDS),
  options: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && x.trim() && x.trim().length <= FIELD_NAME_MAX).map(x => (x as string).trim()))].slice(0, MAX_FIELD_OPTIONS) : undefined, z.array(z.string()).optional()),
});
/** Session AV lane 2 (r6-plan, LEDGER #395, #397): the longest review interval in weeks; label groups and their size. */
export const MAX_REVIEW_WEEKS = 52, MAX_LABEL_GROUPS = 20, LABEL_GROUP_MAX = 12, LABEL_GROUP_NAME_MAX = 40;
/**
 * Session AV lane 2 (r6-plan, LEDGER #397; OmniFocus's mutually exclusive tags; TIER 3 (stored format), additive and
 * optional): a named group of labels ("Where": home, office, errand) of which a task carries one at a time. A label that
 * cannot be read is dropped, a group that cannot be read is dropped (never the record); older builds keep `labelGroups`
 * untouched and treat the labels as free words, as before.
 */
export const labelGroupSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(LABEL_GROUP_NAME_MAX),
  labels: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && LABEL_PATTERN.test(x)))].slice(0, LABEL_GROUP_MAX) : undefined, z.array(z.string()).min(1)),
});
export type LabelGroup = z.infer<typeof labelGroupSchema>;
export const projectSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), colour: z.enum(TASK_COLOURS).catch('grey'),
  order: z.number().finite().catch(0), archived: z.boolean().optional().catch(undefined), view: z.enum(['list', 'board']).optional().catch(undefined),
  /** Session AV lane 2 (tasks, LEDGER #20, #12, #28; Things' Areas, TickTick's folders; TIER 3 (stored format), additive): the area it sits in. */
  areaId: id.optional().catch(undefined),
  rules: tolerantArray(ruleSchema, MAX_RULES),
  fields: tolerantArray(fieldDefSchema, MAX_FIELDS),
  /**
   * Session AV lane 2 (r6-plan; OmniFocus; TIER 3 (stored format), additive and optional, each dropped on read when it cannot
   * be read; older builds keep them untouched (the object is loose) and show the project's tasks as before):
   * `hold` (LEDGER #392, On Hold) the project is set aside from `since`, until the day `until` (none: until resumed); its tasks
   * leave Today, Upcoming, the matrix, the plans and the reminders meanwhile and come back by themselves on `until`;
   * `inOrder` (LEDGER #393, sequential projects) only the first open task is available, the next waits for it;
   * `review` (LEDGER #395, Review) the project comes up for review every `every` weeks after `last`, the day it was reviewed.
   */
  hold: z.looseObject({since: day, until: day.optional().catch(undefined)}).optional().catch(undefined),
  inOrder: z.literal(true).optional().catch(undefined),
  review: z.looseObject({every: z.number().int().min(1).max(MAX_REVIEW_WEEKS), last: day.optional().catch(undefined)}).optional().catch(undefined),
});
/** Session AV lane 2 (tasks, LEDGER #20): `archived` puts a finished section away as a block, its tasks with it. */
export const sectionSchema = z.looseObject({id, projectId: id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), order: z.number().finite().catch(0), archived: z.literal(true).optional().catch(undefined)});
/** Session AV lane 2 (tasks, LEDGER #20, #12, #28): an Area (a folder, a context) that groups projects. */
export const areaSchema = z.looseObject({id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), order: z.number().finite().catch(0)});
/** Session AV lane 2 (tasks, LEDGER #22, #23; Sunsama's weekly objectives): an objective for the week that starts on `week` (a Monday). */
export const objectiveSchema = z.looseObject({id, week: day, title: z.string().trim().min(1).max(TASK_TITLE_MAX), doneAt: z.iso.datetime({offset: true}).optional().catch(undefined), goal: z.string().max(120).optional().catch(undefined)});
export const MAX_AREAS = 30, MAX_OBJECTIVES = 200;
export const filterSchema = z.looseObject({id, name: z.string().trim().min(1).max(PROJECT_NAME_MAX), query: z.string().trim().min(1).max(200)});
/**
 * Session AL (security delta review B, SB-3; TIER 3 (stored format), no shape change): a task whose parent is itself,
 * one of its own subtasks (a loop of parents) or a task this list does not hold reads as a top-level task, so it shows in
 * the list views and no subtask walk can loop. An import, a restore or another tab's write could bring such a parent.
 * Each loop loses one link only (the first task of the loop in list order, which then heads it); the rest keep their
 * parents. Returns the same record when nothing needed it.
 */
export function breakParentLoops<T extends {tasks: {id: string; parentId?: string}[]}>(record: T): T {
  if (!record.tasks.some(t => t.parentId)) return record;
  const parentOf = new Map<string, string | undefined>(record.tasks.map(t => [t.id, t.parentId]));
  const drop = new Set<string>();
  for (const t of record.tasks) {
    // A parent this list does not hold; else up from this task: back at itself is a loop through it (a loop higher up
    // is broken at its own first task). Bounded by the list's length.
    let p = parentOf.get(t.id), steps = 0;
    if (p !== undefined && !parentOf.has(p)) { drop.add(t.id); parentOf.set(t.id, undefined); continue; }
    while (p !== undefined && steps++ <= record.tasks.length) {
      if (p === t.id) { drop.add(t.id); parentOf.set(t.id, undefined); break; }
      p = parentOf.get(p);
    }
  }
  if (!drop.size) return record;
  return {...record, tasks: record.tasks.map(t => { if (!drop.has(t.id)) return t; const {parentId: _p, ...rest} = t; void _p; return rest; })};
}
export const tasksSchema = z.looseObject({
  version: z.literal(1),
  tasks: z.array(taskSchema).max(MAX_TASKS),
  projects: tolerantArray(projectSchema, MAX_PROJECTS),
  sections: tolerantArray(sectionSchema, MAX_SECTIONS),
  labelColors: z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, c]) => LABEL_PATTERN.test(k) && (TASK_COLOURS as readonly unknown[]).includes(c)).slice(0, 200)) : undefined, z.record(z.string(), z.enum(TASK_COLOURS)).optional()),
  filters: tolerantArray(filterSchema, MAX_FILTERS),
  // Session AV lane 2 (tasks; TIER 3 (stored format), additive): areas above projects and the week objectives.
  areas: tolerantArray(areaSchema, MAX_AREAS),
  objectives: tolerantArray(objectiveSchema, MAX_OBJECTIVES),
  // Session AV lane 2 (r6-plan, LEDGER #397; TIER 3 (stored format), additive): label groups, one label of each on a task.
  labelGroups: tolerantArray(labelGroupSchema, MAX_LABEL_GROUPS),
}).transform(breakParentLoops);
export type Task = z.infer<typeof taskSchema>;
export type Tasks = z.infer<typeof tasksSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SavedFilter = z.infer<typeof filterSchema>;
export type Area = z.infer<typeof areaSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
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
