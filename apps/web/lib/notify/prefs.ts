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
export const NOTIFY_TYPES = ['habits', 'morning', 'evening', 'water', 'contributions', 'windDown', 'review', 'prices', 'bills'] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const notifyPrefsSchema = z.looseObject({
  version: z.literal(1),
  // Any type name is kept (a later build may add types; this one reads only its own).
  types: z.record(z.string().max(40), z.boolean()).refine(t => Object.keys(t).length <= 40).default({}),
  morning: z.looseObject({time}).optional(),
  evening: z.looseObject({time}).optional(),
  /** Set while notifications are on on this device: a cheap hint so most pages never load the notification code. */
  here: z.boolean().optional(),
});
export type NotifyPrefs = z.infer<typeof notifyPrefsSchema>;
export const emptyNotifyPrefs = (): NotifyPrefs => ({version: 1, types: {}});
export const NOTIFY_PREFS: DeviceRecordSpec<NotifyPrefs> = {key: NOTIFY_KEY, schema: notifyPrefsSchema, empty: emptyNotifyPrefs};
/** On by default: what most people want from a reminder app; the evening wrap-up is opt-in. */
export const DEFAULT_ON: Record<NotifyType, boolean> = {habits: true, morning: true, evening: false, water: true, contributions: true, windDown: true, review: true, prices: true, bills: true};
export const DEFAULT_TIMES = {morning: '08:00', evening: '20:30'} as const;
export const typeOn = (p: NotifyPrefs, type: NotifyType) => p.types[type] ?? DEFAULT_ON[type];
export const morningTime = (p: NotifyPrefs) => p.morning?.time ?? DEFAULT_TIMES.morning;
export const eveningTime = (p: NotifyPrefs) => p.evening?.time ?? DEFAULT_TIMES.evening;
export const setType = (p: NotifyPrefs, type: NotifyType, on: boolean): NotifyPrefs => notifyPrefsSchema.parse({...p, types: {...p.types, [type]: on}});
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
};
