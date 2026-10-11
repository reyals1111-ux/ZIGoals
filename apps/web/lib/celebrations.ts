import * as z from 'zod';
import {CELEBRATIONS_KEY} from './w-device-keys';
import type {DeviceRecordSpec} from './device-record';

/**
 * Calm, one-time celebrations (Session W Parts 10–11): a milestone reached, a challenge finished. The device key
 * `zigoals:celebrations:v1` remembers which were already shown on this device (id → the day), so a celebration never
 * repeats here; nothing is synced, and a second device celebrates once too.
 */
export {CELEBRATIONS_KEY};
export const celebrationsSchema = z.strictObject({version: z.literal(1), seen: z.record(z.string().min(1).max(200), z.iso.date())})
  .refine(c => Object.keys(c.seen).length <= 1000, 'Too many celebrations remembered.');
export type Celebrations = z.infer<typeof celebrationsSchema>;
export const emptyCelebrations = (): Celebrations => ({version: 1, seen: {}});
export const CELEBRATIONS: DeviceRecordSpec<Celebrations> = {key: CELEBRATIONS_KEY, schema: celebrationsSchema, empty: emptyCelebrations};
