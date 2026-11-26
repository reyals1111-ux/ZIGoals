import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK Part 2 (ADR-036 Q3, D1; `TIER 3 (stored format)`): which notifications this device wants while ZIGoals is
 * closed, a new device key `zigoals:notify:v1`. One switch per type, plus the morning and evening times. Loose and
 * versioned; device-only (never synced); in Export everything and its restore; erased with Erase everything. The quiet
 * hours are the reminders plan's (ADR-036 Q12), the weekly review day and time too; habit, water, wind-down and
 * contribution times stay where they always were.
 */
export const NOTIFY_KEY = 'zigoals:notify:v1';
export const NOTIFY_TYPES = ['habits', 'morning', 'evening', 'water', 'contributions', 'windDown', 'review', 'prices', 'bills', 'supplements', 'tasks', 'countdowns', 'journal', 'money', 'meals', 'mood', 'energy', 'planDay', 'weighIn', 'moneyMorning', 'timers'] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const notifyPrefsSchema = z.looseObject({
  version: z.literal(1),
  // Any type name is kept (a later build may add types; this one reads only its own).
  types: z.record(z.string().max(40), z.boolean()).refine(t => Object.keys(t).length <= 40).default({}),
  morning: z.looseObject({time}).optional(),
  evening: z.looseObject({time}).optional(),
  /**
   * Session AV lane 2 (habits; LEDGER #180, Daylio's reminders to log; TIER 3 (stored format) and TIER 3 (PWA)): the mood
   * check-in's time and an optional second one. Optional and loose; an older build keeps it and simply has no mood type.
   */
  mood: z.looseObject({time, second: time.optional()}).optional(),
  /**
   * Session AV lane 2 (bodymind-r2; LEDGER #235, #236, Rise's energy schedule; TIER 3 (stored format) and TIER 3 (PWA)):
   * which reminders the day's energy curve sends (the focus window's start, before the dip, the wind-down start from the
   * curve), all off unless chosen. Optional and loose; a value this build cannot read is dropped on read; an older build
   * keeps it untouched and simply has no energy type. Step reminders are the evening plan's own (`remind`).
   */
  energy: z.looseObject({focus: z.boolean().optional().catch(undefined), dip: z.boolean().optional().catch(undefined), windDown: z.boolean().optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AV lane 2 (health r3; LEDGER #280, Waterllama's reminders through the day; TIER 3 (stored format) and TIER 3
   * (PWA)): water reminders every 1, 2 or 3 hours between a start and an end time, each skipped when the day is on pace.
   * `on` false keeps the choice. Optional and loose; a value this build cannot read is dropped on read; an older build keeps
   * it untouched and keeps its one water time.
   */
  waterSpread: z.looseObject({on: z.boolean(), from: time, to: time, every: z.union([z.literal(60), z.literal(120), z.literal(180)])}).optional().catch(undefined),
  /**
   * Session AV lane 2 (health r3; LEDGER #286, Carb Manager's weigh-in reminders; TIER 3 (stored format) and TIER 3 (PWA)):
   * an opt-in weigh-in reminder at a time, every day, on chosen weekdays (Monday = 1 … Sunday = 64, as the push Workers
   * count) or on one day of the month (1–28), skipped once a weight is logged that day. Optional and loose; a value this
   * build cannot read is dropped on read; an older build keeps it untouched.
   */
  weighIn: z.looseObject({time, repeat: z.enum(['daily', 'weekdays', 'monthly']), weekdays: z.number().int().min(1).max(127).optional().catch(undefined), day: z.number().int().min(1).max(28).optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-body; LEDGER #369, Productive's reminders for each part of the day; TIER 3 (stored format) and
   * TIER 3 (PWA)): one reminder at the start of the morning, the afternoon and the evening (times the person sets) saying
   * how many of that part's habits are still open, in place of one per habit for the habits in a part. `on` false keeps
   * the times. Optional and loose; a value this build cannot read is dropped on read; an older build keeps it untouched
   * and sends one reminder per habit, as before.
   */
  habitParts: z.looseObject({on: z.boolean(), morning: time.optional().catch(undefined), afternoon: time.optional().catch(undefined), evening: time.optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384; TIER 3 (stored format) and TIER 3 (PWA)): the
   * choices of "Yesterday's money" beside its notification switch (`types.moneyMorning`, off unless chosen): `onToday`, a
   * quiet line on Today. Optional and loose; a value this build cannot read is dropped on read; an older build keeps it
   * untouched and simply shows no such line.
   */
  moneyMorning: z.looseObject({onToday: z.literal(true).optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AW (X1, LEDGER #438; Due's "remind again until done"; TIER 3 (stored format)): the default repeat for every
   * task reminder of this device ({every, times}: every 5, 10, 15 or 30 minutes, 2 to 10 times), in the app and on the
   * notifications; a reminder's own `again` wins. Optional and loose; a value this build cannot read is dropped on read; an
   * older build keeps it untouched and reminds once, as before.
   */
  taskAgain: z.looseObject({every: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]), times: z.number().int().min(2).max(10)}).optional().catch(undefined),
  /**
   * Session AW (X1, LEDGER #439; Due's own snooze times; TIER 3 (stored format)): up to six snooze choices of the person's
   * own (lib/tasks/snooze-choices.ts: `{for}` minutes, or `{at, day}` a time "next", "tomorrow" or on a weekday 0–6), in
   * a reminder's snooze row; the first is the notification's snooze button. Entries this build cannot read are skipped
   * where read (lib/tasks/snooze-choices.ts ownSnoozes); an older build keeps the list untouched and offers its usual three.
   */
  snoozes: z.array(z.unknown()).max(12).optional().catch(undefined),
  /** Set while notifications are on on this device: a cheap hint so most pages never load the notification code. */
  here: z.boolean().optional(),
});
export type NotifyPrefs = z.infer<typeof notifyPrefsSchema>;
export const emptyNotifyPrefs = (): NotifyPrefs => ({version: 1, types: {}});
export const NOTIFY_PREFS: DeviceRecordSpec<NotifyPrefs> = {key: NOTIFY_KEY, schema: notifyPrefsSchema, empty: emptyNotifyPrefs};
/** On by default: what most people want from a reminder app; the evening wrap-up is opt-in. */
export const DEFAULT_ON: Record<NotifyType, boolean> = {habits: true, morning: true, evening: false, water: true, contributions: true, windDown: true, review: true, prices: true, bills: true, supplements: false, tasks: true /* Session AV (follow-up 1, F-TASK-NOTIFY): a reminder the person set on a task */, countdowns: true /* Session AV (1c): a reminder the person set on a countdown */, journal: true /* Session AV lane 2: the reminder to write is itself off until set in the Journal */, money: true /* Session AV lane 2 (money): budgets near or over, payday, the low-balance line */, meals: false /* Session AV lane 2 (food, LEDGER #90): opt-in */, mood: false /* Session AV lane 2 (LEDGER #180): opt-in */, energy: false /* Session AV lane 2 (bodymind-r2, LEDGER #235, #236): opt-in */, planDay: true /* Session AV lane 2 (r3-plan, LEDGER #256): the reminder itself is off until a time is set in Tasks → This week */, weighIn: true, moneyMorning: false /* Session AV lane 2, round 5 (money; LEDGER #384): Yesterday's money is off unless chosen */, timers: true /* Session AW (X1, LEDGER #440): a timer the person started */};
export const DEFAULT_TIMES = {morning: '08:00', evening: '20:30', mood: '20:00'} as const;
export const typeOn = (p: NotifyPrefs, type: NotifyType) => p.types[type] ?? DEFAULT_ON[type];
export const morningTime = (p: NotifyPrefs) => p.morning?.time ?? DEFAULT_TIMES.morning;
export const eveningTime = (p: NotifyPrefs) => p.evening?.time ?? DEFAULT_TIMES.evening;
export const setType = (p: NotifyPrefs, type: NotifyType, on: boolean): NotifyPrefs => notifyPrefsSchema.parse({...p, types: {...p.types, [type]: on}});
/** Session AV lane 2 (LEDGER #180): the mood check-in's time, and the second one when set. */
export const moodTimes = (p: NotifyPrefs): string[] => [p.mood?.time ?? DEFAULT_TIMES.mood, ...(p.mood?.second ? [p.mood.second] : [])];
export function setMoodTimes(p: NotifyPrefs, first: string, second: string | null): NotifyPrefs {
  const mood: Record<string, unknown> = {...(p.mood ?? {}), time: time.parse(first)};
  if (second) mood.second = time.parse(second); else delete mood.second;
  return notifyPrefsSchema.parse({...p, mood});
}
export const setTime = (p: NotifyPrefs, which: 'morning' | 'evening', value: string): NotifyPrefs => notifyPrefsSchema.parse({...p, [which]: {time: time.parse(value)}});
export type EnergyReminders = {focus: boolean; dip: boolean; windDown: boolean};
/** Session AV lane 2 (bodymind-r2, LEDGER #235): the curve reminders chosen (each off unless set). */
export const energyReminders = (p: NotifyPrefs): EnergyReminders => ({focus: p.energy?.focus === true, dip: p.energy?.dip === true, windDown: p.energy?.windDown === true});
/** Sets one curve reminder; switching any on also switches the energy type on (one tap, where it is chosen). */
export function setEnergyReminder(p: NotifyPrefs, which: keyof EnergyReminders, on: boolean): NotifyPrefs {
  const energy = {...(p.energy ?? {}), [which]: on};
  return notifyPrefsSchema.parse({...p, energy, ...(on ? {types: {...p.types, energy: true}} : {})});
}
/** Session AW (X1, LEDGER #438): the device's default repeat for task reminders, or null (each reminder rings once). */
export const taskAgainOf = (p: NotifyPrefs): {every: 5 | 10 | 15 | 30; times: number} | null => p.taskAgain ? {every: p.taskAgain.every, times: p.taskAgain.times} : null;
