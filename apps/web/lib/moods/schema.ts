import {z} from 'zod';

/**
 * The evening wrap-up's mood (Session W Part 13; synced home Health v4 `moods`, under the Health consent like every
 * record about how a person feels): one per day, 1–5, an optional short note. Each day is stamped (`at`), so two devices
 * that both answered keep the newer answer instead of stopping sync.
 */
export const MAX_MOOD_DAYS = 1100;
export const moodDaySchema = z.strictObject({mood: z.number().int().min(1).max(5), note: z.string().max(280).optional(), at: z.iso.datetime()});
export type MoodDay = z.infer<typeof moodDaySchema>;
export const moodsSchema = z.strictObject({version: z.literal(1), days: z.record(z.iso.date(), moodDaySchema)})
  .refine(group => Object.keys(group.days).length <= MAX_MOOD_DAYS, `Up to ${MAX_MOOD_DAYS} days of moods.`);
export type Moods = z.infer<typeof moodsSchema>;
export const emptyMoods = (): Moods => ({version: 1, days: {}});
