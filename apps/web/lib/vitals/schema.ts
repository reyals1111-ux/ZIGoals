import * as z from 'zod';

/**
 * Daily vitals (Session W Parts 7–8; synced home Health v4 `vitals`): values a person brings in from an export or a
 * device link, one record per day and source (`health_vital-<source>-<date>`), so two devices that import the same file
 * hold one record. Resting heart rate, and active and resting energy where the source provides them; a day summarised
 * from heart-rate samples keeps only its lowest, average and highest value. Unknown stays absent, never zero.
 */
export const VITAL_SOURCES = ['apple-health', 'fitbit', 'garmin', 'samsung', 'oura', 'oura-link', 'withings-link', 'polar-link', 'strava-link', 'bluetooth'] as const;
export type VitalSource = typeof VITAL_SOURCES[number];
export const MAX_VITAL_DAYS = 10_000;
const bpm = z.number().int().min(20).max(250);
const kcal = z.number().int().min(0).max(20_000);
export const vitalIdSchema = z.string().regex(/^health_vital-[a-z0-9-]{4,60}-\d{4}-\d{2}-\d{2}$/);
export const vitalDaySchema = z.strictObject({
  id: vitalIdSchema, date: z.iso.date(), source: z.enum(VITAL_SOURCES),
  restingHr: bpm.optional(), hrMin: bpm.optional(), hrAvg: bpm.optional(), hrMax: bpm.optional(), activeKcal: kcal.optional(), restingKcal: kcal.optional(),
  updatedAt: z.iso.datetime(),
}).superRefine((day, ctx) => {
  if (day.id !== `health_vital-${day.source}-${day.date}`) ctx.addIssue({code: 'custom', message: 'A vitals record is named by its source and day.'});
  if ([day.restingHr, day.hrMin, day.hrAvg, day.hrMax, day.activeKcal, day.restingKcal].every(v => v === undefined)) ctx.addIssue({code: 'custom', message: 'A vitals record holds at least one value.'});
  if (day.hrMin !== undefined && day.hrMax !== undefined && day.hrMin > day.hrMax) ctx.addIssue({code: 'custom', message: 'Heart rate summary out of order.'});
});
export type VitalDay = z.infer<typeof vitalDaySchema>;
export const vitalsSchema = z.strictObject({version: z.literal(1), days: z.array(vitalDaySchema).max(MAX_VITAL_DAYS)})
  .refine(group => new Set(group.days.map(d => d.id)).size === group.days.length, 'Duplicate vitals record.');
export type Vitals = z.infer<typeof vitalsSchema>;
export const emptyVitals = (): Vitals => ({version: 1, days: []});
