import {z} from 'zod';
import {W_REMINDERS_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';
import {clockSchema} from '../sleep/schema';

/**
 * Session W's in-app reminders (Parts 4, 5, 10, 12): wind-down before bed, a daily meditation time, a stack's chained
 * reminder ("after X, Y") and a contribution plan's reminder. Their own device key, `zigoals:w-reminders:v1`, because the
 * strict `zigoals:reminders:v1` would reset on builds #29–#31 if it met new kinds (ADR-014 S13). Shown on Today and by
 * ZIGi's knock while ZIGoals is open; not sent as push notifications in this release. Device-only, like REMINDERS_V1.
 */
export {W_REMINDERS_KEY};
const day = z.iso.date();
export const wRemindersSchema = z.strictObject({
  version: z.literal(1),
  windDown: z.strictObject({time: clockSchema}).optional(),
  meditation: z.strictObject({time: clockSchema}).optional(),
  chained: z.record(z.uuid(), z.literal(true)).refine(c => Object.keys(c).length <= 200, 'Up to 200 chained reminders.'),
  contributions: z.record(z.string().regex(/^\d{1,80}$/), z.strictObject({time: clockSchema})).refine(c => Object.keys(c).length <= 200, 'Up to 200 plan reminders.'),
  dismissed: z.record(z.string().max(120), day).refine(d => Object.keys(d).length <= 500, 'Too many dismissals.'),
});
export type WReminders = z.infer<typeof wRemindersSchema>;
export const emptyWReminders = (): WReminders => ({version: 1, chained: {}, contributions: {}, dismissed: {}});
export const W_REMINDERS: DeviceRecordSpec<WReminders> = {key: W_REMINDERS_KEY, schema: wRemindersSchema, empty: emptyWReminders};
