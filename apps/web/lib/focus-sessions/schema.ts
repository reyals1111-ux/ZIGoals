import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AJ (item 34; owner decision D13; `TIER 3 (stored format)`): Focus Sessions on My Universe, extending Session
 * AI's goal timer. A new device-only key `zigoals:focus-sessions:v1`, loose and versioned: each finished session with its
 * planned length, the seconds focused (the page open and in front) and away (the tab hidden), and its outcome — `grown`
 * when it ran its length with little time away, `withered` when it ended early or was mostly away. A withered one is kept,
 * never deleted (a trace, not a punishment). Not synced; in Export everything and its restore; erased with the account.
 * At most 1,000 sessions (the oldest drop first).
 */
export const FOCUS_SESSIONS_KEY = 'zigoals:focus-sessions:v1';
export const MAX_SESSIONS = 1000;
export const focusSessionSchema = z.looseObject({
  id: z.string().regex(/^focus_[A-Za-z0-9-]{8,60}$/),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plannedMinutes: z.number().int().min(1).max(180),
  focusedSeconds: z.number().int().min(0).max(4 * 3600),
  awaySeconds: z.number().int().min(0).max(24 * 3600),
  outcome: z.enum(['grown', 'withered']),
  goalId: z.string().max(250).optional(),
  /*
   * Session AK (T3; TIER 3 (stored format), additive and optional): a Pomodoro work block — `mode` 'pomodoro', its
   * `block` number in the run (1 = the first) and the task it was for (`taskId`, a zigoals:tasks:v1 id). A value this
   * build cannot read is dropped on read, never failing the list; older builds keep the fields as they are (loose).
   */
  mode: z.string().max(20).optional().catch(undefined),
  block: z.number().int().min(1).max(12).optional().catch(undefined),
  taskId: z.string().max(80).optional().catch(undefined),
});
/** Session AK (T3): the Pomodoro lengths the person last chose (minutes) and their two choices (a sound, tick the task). */
export const POMODORO_LIMITS = {work: [5, 90], shortBreak: [1, 30], longBreak: [5, 60], cycles: [1, 8]} as const;
const minutes = (key: keyof typeof POMODORO_LIMITS) => z.number().int().min(POMODORO_LIMITS[key][0]).max(POMODORO_LIMITS[key][1]);
export const pomodoroSettingsSchema = z.looseObject({
  work: minutes('work'), shortBreak: minutes('shortBreak'), longBreak: minutes('longBreak'), cycles: minutes('cycles'),
  sound: z.boolean().optional(), tickTask: z.boolean().optional(),
});
export type PomodoroSettings = z.infer<typeof pomodoroSettingsSchema>;
export const focusSessionsSchema = z.looseObject({version: z.literal(1), sessions: z.array(focusSessionSchema).max(MAX_SESSIONS).default([]),
  /** Session AK (T3; TIER 3 (stored format), additive): the Pomodoro choices, written when a run starts. */
  pomodoro: pomodoroSettingsSchema.optional().catch(undefined),
});
export type FocusSessionEntry = z.infer<typeof focusSessionSchema>;
export type FocusSessions = z.infer<typeof focusSessionsSchema>;
export const emptyFocusSessions = (): FocusSessions => ({version: 1, sessions: []});
export const FOCUS_SESSIONS: DeviceRecordSpec<FocusSessions> = {key: FOCUS_SESSIONS_KEY, schema: focusSessionsSchema, empty: emptyFocusSessions};
