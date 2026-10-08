import * as z from 'zod';
import {timeZoneSchema} from '../time-zone-schema';

/**
 * Sleep (Session W Part 4; synced home Health v4 `sleep`, docs/product/SYNC_HOMES.md): nights and naps the person logs,
 * starts with "I'm going to bed", or brings in from an import or a device link. A night is two instants and the zone it
 * was lived in, so its length is exact across a daylight-saving change; its day is the wake date in that zone. A running
 * night has `end: null` (the fasting pattern), so two devices never fight over a separate marker. Imported and linked
 * nights carry deterministic ids (`health_sleep-<source>-<hash>`): the same export imported on two devices is one night.
 */
export const SLEEP_SOURCES = ['manual', 'timer', 'apple-health', 'fitbit', 'garmin', 'samsung', 'oura', 'oura-link', 'withings-link', 'polar-link', 'strava-link'] as const;
export type SleepSource = typeof SLEEP_SOURCES[number];
/** Tags offered as one-tap chips; the person may add their own words too (at most 24 characters each). */
export const SLEEP_TAGS = ['caffeine', 'alcohol', 'screens', 'exercise', 'late meal', 'stress', 'travel', 'noise'] as const;
export const MAX_NIGHTS = 5000, MAX_NIGHT_MINUTES = 24 * 60;
const instant = z.iso.datetime();
const minutes = (max: number) => z.number().int().min(0).max(max);
export const sleepIdSchema = z.string().regex(/^health_sleep-[a-z0-9-]{8,90}$/);
export const sleepNightSchema = z.strictObject({
  id: sleepIdSchema, kind: z.enum(['night', 'nap']), start: instant, end: instant.nullable(), timeZone: timeZoneSchema,
  latencyMin: minutes(720).optional(), awakenings: z.number().int().min(0).max(100).optional(), awakeMin: minutes(MAX_NIGHT_MINUTES).optional(),
  stages: z.strictObject({deepMin: minutes(MAX_NIGHT_MINUTES).optional(), remMin: minutes(MAX_NIGHT_MINUTES).optional(), coreMin: minutes(MAX_NIGHT_MINUTES).optional()}).optional(),
  quality: z.number().int().min(1).max(5).optional(), tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(), note: z.string().max(1000).optional(),
  source: z.enum(SLEEP_SOURCES), createdAt: instant, updatedAt: instant,
}).superRefine((night, ctx) => {
  if (night.end === null) return;
  const span = Date.parse(night.end) - Date.parse(night.start);
  if (span <= 0) ctx.addIssue({code: 'custom', message: 'A night ends after it starts.'});
  else if (span > MAX_NIGHT_MINUTES * 60_000) ctx.addIssue({code: 'custom', message: 'A night lasts at most 24 hours.'});
  const used = (night.latencyMin ?? 0) + (night.awakeMin ?? 0);
  if (span > 0 && used * 60_000 > span) ctx.addIssue({code: 'custom', message: 'Time to fall asleep and time awake cannot be longer than the night.'});
});
export type SleepNight = z.infer<typeof sleepNightSchema>;
/** The person's own goal: how long, and optionally a bedtime window ("22:30"–"23:30"). Stamped, so the newer edit wins in sync. */
export const clockSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const sleepGoalSchema = z.strictObject({minutes: z.number().int().min(180).max(900), bedFrom: clockSchema.optional(), bedTo: clockSchema.optional(), updatedAt: instant})
  .refine(goal => (goal.bedFrom === undefined) === (goal.bedTo === undefined), 'Choose both ends of the bedtime window, or neither.');
export type SleepGoal = z.infer<typeof sleepGoalSchema>;
/**
 * More than one running night is allowed on purpose: two devices that each tapped "I'm going to bed" while apart merge to
 * two, and sync must not stop over it. The latest-started one is tonight's; any other asks for its end time
 * (`lib/sleep/engine.ts`), and nothing ever invents one.
 */
export const sleepSchema = z.strictObject({version: z.literal(1), nights: z.array(sleepNightSchema).max(MAX_NIGHTS), goal: sleepGoalSchema.optional()})
  .refine(group => new Set(group.nights.map(n => n.id)).size === group.nights.length, 'Duplicate sleep record.');
export type Sleep = z.infer<typeof sleepSchema>;
export const emptySleep = (): Sleep => ({version: 1, nights: []});
