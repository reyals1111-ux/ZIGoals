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
export const NOTIFY_TYPES = ['habits', 'morning', 'evening', 'water', 'contributions', 'windDown', 'review', 'prices', 'bills', 'supplements', 'tasks', 'countdowns', 'journal', 'money', 'meals', 'mood', 'energy', 'weighIn'] as const;
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
  /** Set while notifications are on on this device: a cheap hint so most pages never load the notification code. */
  here: z.boolean().optional(),
});
export type NotifyPrefs = z.infer<typeof notifyPrefsSchema>;
export const emptyNotifyPrefs = (): NotifyPrefs => ({version: 1, types: {}});
export const NOTIFY_PREFS: DeviceRecordSpec<NotifyPrefs> = {key: NOTIFY_KEY, schema: notifyPrefsSchema, empty: emptyNotifyPrefs};
/** On by default: what most people want from a reminder app; the evening wrap-up is opt-in. */
export const DEFAULT_ON: Record<NotifyType, boolean> = {habits: true, morning: true, evening: false, water: true, contributions: true, windDown: true, review: true, prices: true, bills: true, supplements: false, tasks: true /* Session AV (follow-up 1, F-TASK-NOTIFY): a reminder the person set on a task */, countdowns: true /* Session AV (1c): a reminder the person set on a countdown */, journal: true /* Session AV lane 2: the reminder to write is itself off until set in the Journal */, money: true /* Session AV lane 2 (money): budgets near or over, payday, the low-balance line */, meals: false /* Session AV lane 2 (food, LEDGER #90): opt-in */, mood: false /* Session AV lane 2 (LEDGER #180): opt-in */, energy: false /* Session AV lane 2 (bodymind-r2, LEDGER #235, #236): opt-in */, weighIn: true /* Session AV lane 2 (health r3, LEDGER #286): the reminder itself is off until set in Health → Weight */};
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
export const NOTIFY_LABELS: Record<NotifyType, {title: string; blurb: string}> = {
  habits: {title: 'Habits due', blurb: 'At each habit’s reminder time, unless it is already done.'},
  morning: {title: 'Morning orbit', blurb: 'What is next today and any contribution due; a tap opens the Checklist.'},
  evening: {title: 'Evening wrap-up', blurb: 'How the day went and what is still open.'},
  water: {title: 'Water', blurb: 'At your water reminder time, with how much is left to drink.'},
  contributions: {title: 'Goal contributions', blurb: 'On days a plan has an amount due, at the plan’s reminder time.'},
  windDown: {title: 'Wind-down', blurb: 'At your wind-down time before bed.'},
  review: {title: 'Weekly Life review', blurb: 'On your review day, at its time.'},
  prices: {title: 'Price alerts', blurb: 'Checked with the morning and evening notifications.'},
  bills: {title: 'Bills due', blurb: 'The morning before a bill you track is due.'},
  supplements: {title: 'Supplements and medication', blurb: 'At the times you set in Health. The notification never names what you take.'},
  tasks: {title: 'Task reminders', blurb: 'At each reminder you set on a task, with Snooze 1 h; the task’s name only if names are on.'},
  mood: {title: 'Mood check-in', blurb: 'At your mood time, and a second one if you like, unless you already said how today feels; a tap opens the mood question. It never says a mood.'},
  countdowns: {title: 'Countdown reminders', blurb: 'In the morning when a countdown’s reminder starts, and on its day; its name only if names are on.'},
  journal: {title: 'Reminder to write', blurb: 'At the time you set in Journal → Reminder to write, unless you already wrote that day. Never a word of your journal.'},
  money: {title: 'Money notices', blurb: 'In the morning after a budget passes 80 % or its amount, the day before payday, and before cash may go below your own line; amounts only if names are on.'},
  // Session AV lane 2 (food, LEDGER #90): off by default; the meal reminders themselves are switched on in Health.
  meals: {title: 'Meal reminders', blurb: 'At each meal’s usual time set in Health, while nothing is logged for it; never what you ate.'},
  // Session AV lane 2 (bodymind-r2, LEDGER #235, #236): off by default; which ones is chosen under the energy curve and the plan steps.
  // Session AV lane 2 (health r3, LEDGER #286): the reminder itself is set in Health → Weight.
  weighIn: {title: 'Weigh-in', blurb: 'At the weigh-in time you set in Health → Weight, unless a weight is already logged that day. Never a weight.'},
  energy: {title: 'Energy curve and plan steps', blurb: 'From your energy curve (the focus window, before the dip, winding down) and at the steps of your morning and evening plan you chose, in Health → Sleep. Never a sleep figure.'},
};
export type EnergyReminders = {focus: boolean; dip: boolean; windDown: boolean};
/** Session AV lane 2 (bodymind-r2, LEDGER #235): the curve reminders chosen (each off unless set). */
export const energyReminders = (p: NotifyPrefs): EnergyReminders => ({focus: p.energy?.focus === true, dip: p.energy?.dip === true, windDown: p.energy?.windDown === true});
/** Sets one curve reminder; switching any on also switches the energy type on (one tap, where it is chosen). */
export function setEnergyReminder(p: NotifyPrefs, which: keyof EnergyReminders, on: boolean): NotifyPrefs {
  const energy = {...(p.energy ?? {}), [which]: on};
  return notifyPrefsSchema.parse({...p, energy, ...(on ? {types: {...p.types, energy: true}} : {})});
}
