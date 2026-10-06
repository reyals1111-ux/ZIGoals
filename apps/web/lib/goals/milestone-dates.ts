import {z} from 'zod';
import {MILESTONE_DATES_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Milestone target dates (Session W Part 11). A Goal's milestones (title, done, target value) already live in finance;
 * their target date is new, so in this release it is kept in the device key `zigoals:milestone-dates:v1`, per Goal and
 * milestone. Its synced home is finance v5 (milestone `targetDate`, read support only here; a later switch PR moves it).
 */
export {MILESTONE_DATES_KEY};
export const MAX_MILESTONE_DATES = 2000;
export const milestoneDatesSchema = z.strictObject({version: z.literal(1), dates: z.record(z.string().regex(/^\d{1,80}$/), z.record(z.string().min(1).max(250), z.iso.date()))})
  .refine(m => Object.values(m.dates).reduce((n, goal) => n + Object.keys(goal).length, 0) <= MAX_MILESTONE_DATES, `Up to ${MAX_MILESTONE_DATES} milestone dates.`);
export type MilestoneDates = z.infer<typeof milestoneDatesSchema>;
export const emptyMilestoneDates = (): MilestoneDates => ({version: 1, dates: {}});
export const MILESTONE_DATES: DeviceRecordSpec<MilestoneDates> = {key: MILESTONE_DATES_KEY, schema: milestoneDatesSchema, empty: emptyMilestoneDates};
