import {z} from 'zod';
import {clockSchema} from '../sleep/schema';

/**
 * The evening wrap-up (Session W Part 13; synced home settings v3 `wrapUp`): whether it is on, from what time, and the
 * person's one intention for tomorrow, per day. Every value is stamped (`at`) so two devices never conflict over it: the
 * newer choice wins. The mood of the day is about how the person feels, so it lives in Health v4 (`moods`), under the
 * Health consent, never here.
 */
export const MAX_WRAP_UP_DAYS = 400;
const stamp = z.iso.datetime();
export const wrapUpSchema = z.strictObject({
  version: z.literal(1),
  enabled: z.strictObject({v: z.boolean(), at: stamp}),
  time: z.strictObject({v: clockSchema, at: stamp}).optional(),
  days: z.record(z.iso.date(), z.strictObject({intention: z.string().trim().max(280).optional(), doneAt: stamp.optional(), at: stamp})),
}).refine(w => Object.keys(w.days).length <= MAX_WRAP_UP_DAYS, `Up to ${MAX_WRAP_UP_DAYS} days of wrap-ups.`);
export type WrapUp = z.infer<typeof wrapUpSchema>;
export const DEFAULT_WRAP_UP_TIME = '18:00';
