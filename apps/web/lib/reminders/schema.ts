import * as z from 'zod';

/**
 * In-app reminders (Session I, Part 8): times that make a reminder card appear on Today, kept on this device only.
 * One device key, never synced, never in a backup: {version:1, habits:{[habitId]:{time}}, water?:{time}, dismissed:{[id]:day}}.
 * Validated and bounded; anything unreadable is ignored and replaced only by the next save. Older builds ignore the key.
 */
export const REMINDERS_KEY = 'zigoals:reminders:v1';
/** The water reminder's id among `dismissed`; habit reminders use their habit id. */
export const WATER_REMINDER = 'water';
export const MAX_HABIT_REMINDERS = 200;
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().min(1).max(100);
export const remindersSchema = z.strictObject({
  version: z.literal(1),
  habits: z.record(id, z.strictObject({time})).refine(habits => Object.keys(habits).length <= MAX_HABIT_REMINDERS),
  water: z.strictObject({time}).optional(),
  dismissed: z.record(id, day).refine(dismissed => Object.keys(dismissed).length <= MAX_HABIT_REMINDERS + 1),
});
export type Reminders = z.infer<typeof remindersSchema>;
export const emptyReminders = (): Reminders => ({version: 1, habits: {}, dismissed: {}});
/** "HH:MM" on a 24-hour clock, or null for an empty or invalid time. */
export function reminderTime(value: string): string | null { return time.safeParse(value).success ? value : null; }
