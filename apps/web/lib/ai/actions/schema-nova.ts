import * as z from 'zod';
import {FOCUS_LENGTHS} from '../../focus-session';
import {AK_WORKOUT_TYPES} from './schema-ak';

/**
 * Owner follow-up 2 (N5): the card kinds NOVA (and ZIGi, one engine) proposes for what had no card yet. Every other N5
 * act reuses an existing kind (a goal or habit bundle, a check-in, a meal, water, a measurement, a supplement, meals and
 * the grocery list, a soundscape, a page, a contribution pre-fill, the staking review). Each of these is a confirm card:
 * - `add-task`: a task on the person's own list (`zigoals:tasks:v1`, lane T's record), with a day and a time it shows on
 *   the agenda; Undo takes it off again;
 * - `log-workout`: a finished workout with its minutes on the workout log (`zigoals:workouts:v1`); Undo removes it;
 * - `capture-note`: the person's words into the notes inbox (`zigoals:notes:v1`, lane B's record), marked as from NOVA; Undo
 *   removes it;
 * - `file-note`: an inbox note filed into the day's note, a note, a new topic, or beside a goal or habit (lane B's
 *   `fileNote`); Undo puts it back in the inbox while nothing changed since;
 * - `start-focus`: opens Focus sessions with the length chosen; the session starts on the person's own tap there.
 * The arguments are data: titles and words are the person's own (bounded), a goal is named and matched on the device.
 */
/**
 * "Open any page" (N5): the pages the open-page card did not know yet, each with its route; a page the person hid is not
 * opened behind their back (Workouts follows Health). Notes and NOVA are lanes B's and NA's routes.
 */
export const NOVA_OPEN_PAGES = ['journal', 'agenda', 'nova', 'notes', 'focus', 'workouts'] as const;
export const NOVA_PAGE_ROUTES: Record<(typeof NOVA_OPEN_PAGES)[number], {href: string; label: string; follows?: 'health'}> = {
  journal: {href: '/app/journal', label: 'Journal'}, agenda: {href: '/app/agenda', label: 'Agenda'}, nova: {href: '/app/nova', label: 'NOVA'}, notes: {href: '/app/notes', label: 'Notes'},
  focus: {href: '/app/journey#focus', label: 'Journey → Focus sessions'}, workouts: {href: '/app/health?view=workouts', label: 'Health → Workouts', follows: 'health'},
};
/** Where an inbox note can be filed (lane B's `fileNote` targets). */
export const NOTE_FILE_TARGETS = ['daily', 'topic', 'goal', 'habit', 'note'] as const;
export const NOVA_TASK_PRIORITIES = ['high', 'normal', 'low'] as const;
export const MAX_NOVA_NOTE = 2000;
const text = (max: number) => z.string().trim().min(1).max(max);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A day is YYYY-MM-DD.').refine(v => !Number.isNaN(Date.parse(`${v}T12:00:00Z`)), 'That day does not exist.');
const clock = z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time is HH:MM on a 24-hour clock.');

export const NOVA_ACTION_SCHEMAS = [
  z.strictObject({kind: z.literal('add-task'), title: text(140), due: z.union([z.literal('today'), z.literal('tomorrow'), isoDay]).optional(), time: clock.optional(),
    priority: z.enum(NOVA_TASK_PRIORITIES).optional(), goal: text(120).optional()})
    .refine(a => a.time === undefined || a.due !== undefined, 'A time belongs to a day: give "due" as well.'),
  z.strictObject({kind: z.literal('log-workout'), name: text(80).optional(), type: z.enum(AK_WORKOUT_TYPES).default('other'), minutes: z.number().int().min(1).max(600),
    day: z.union([z.literal('today'), z.literal('yesterday'), isoDay]).default('today'), time: clock.optional(), note: z.string().trim().max(500).optional()}),
  z.strictObject({kind: z.literal('capture-note'), text: text(MAX_NOVA_NOTE), title: z.string().trim().max(120).optional()}),
  z.strictObject({kind: z.literal('file-note'), note: text(120), to: z.enum(NOTE_FILE_TARGETS), day: z.union([z.literal('today'), z.literal('yesterday'), isoDay]).optional(), title: text(120).optional(), name: text(120).optional()})
    .superRefine((a, ctx) => {
      if (a.to === 'topic' && !a.title) ctx.addIssue({code: 'custom', path: ['title'], message: 'A new topic note needs its title.'});
      if ((a.to === 'goal' || a.to === 'habit' || a.to === 'note') && !a.name) ctx.addIssue({code: 'custom', path: ['name'], message: 'Name the goal, habit or note it goes to.'});
      if (a.day !== undefined && a.to !== 'daily') ctx.addIssue({code: 'custom', path: ['day'], message: 'Only a daily note has a day.'});
    }),
  z.strictObject({kind: z.literal('start-focus'), minutes: z.union([z.literal(FOCUS_LENGTHS[0]), z.literal(FOCUS_LENGTHS[1]), z.literal(FOCUS_LENGTHS[2])]).default(25), goal: text(120).optional()}),
] as const;
export const NOVA_ACTION_KINDS = ['add-task', 'log-workout', 'capture-note', 'file-note', 'start-focus'] as const;
export const NOVA_ALIASES = {
  'add_task': 'add-task', task: 'add-task', 'new-task': 'add-task', 'create-task': 'add-task', todo: 'add-task', 'add-todo': 'add-task', 'schedule-task': 'add-task',
  'log_workout': 'log-workout', workout: 'log-workout', 'add-workout': 'log-workout', 'record-workout': 'log-workout',
  // "add-note" stays the goal note's old alias (add-goal-note); a note for the inbox is "capture-note".
  'capture_note': 'capture-note', capture: 'capture-note', 'new-note': 'capture-note', 'create-note': 'capture-note', 'inbox-note': 'capture-note', 'add-to-inbox': 'capture-note',
  'file_note': 'file-note', 'file-inbox-note': 'file-note', 'move-note': 'file-note',
  'start_focus': 'start-focus', focus: 'start-focus', pomodoro: 'start-focus', 'focus-session': 'start-focus', 'start-pomodoro': 'start-focus',
} as const;
