import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log — opt-in and hidden by default. A new device-only key, loose and
 * versioned: whether the person turned it on (`on`, off when missing) and, per calendar day, the flow, symptom chips and
 * a short note. Health-describing: the lead keeps it with the Health choice for sync and restore; it never appears in a
 * notification. Turning it off hides it and keeps every entry; deleting is its own, confirmed step. Information for the
 * person, not a contraceptive or a diagnosis.
 */
export const CYCLE_KEY = 'zigoals:cycle:v1';
export const MAX_CYCLE_DAYS = 1500, MAX_SYMPTOMS = 12, CYCLE_NOTE_MAX = 280;
export const FLOWS = ['light', 'medium', 'heavy'] as const;
export type Flow = typeof FLOWS[number];
/** The chips offered (an id this build does not know is kept and shown as written). */
export const SYMPTOMS = ['cramps', 'headache', 'back-pain', 'bloating', 'tender-breasts', 'tired', 'mood-changes', 'acne', 'spotting', 'cravings'] as const;
export const SYMPTOM_WORDS: Readonly<Record<string, string>> = {cramps: 'Cramps', headache: 'Headache', 'back-pain': 'Back pain', bloating: 'Bloating', 'tender-breasts': 'Tender breasts', tired: 'Tired', 'mood-changes': 'Mood changes', acne: 'Skin changes', spotting: 'Spotting', cravings: 'Cravings'};
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const cycleDaySchema = z.looseObject({
  flow: z.enum(FLOWS).optional().catch(undefined),
  symptoms: z.array(z.string().regex(/^[a-z-]{1,30}$/)).max(MAX_SYMPTOMS).optional(),
  note: z.string().trim().max(CYCLE_NOTE_MAX).optional(),
});
export const cycleSchema = z.looseObject({
  version: z.literal(1),
  /** true: the cycle log shows in Health. Missing or false: hidden (the default); entries are kept either way. */
  on: z.boolean().optional(),
  days: z.record(day, cycleDaySchema).default({}).refine(d => Object.keys(d).length <= MAX_CYCLE_DAYS, `Up to ${MAX_CYCLE_DAYS} days.`),
});
export type CycleDay = z.infer<typeof cycleDaySchema>;
export type Cycle = z.infer<typeof cycleSchema>;
export const emptyCycle = (): Cycle => ({version: 1, days: {}});
export const CYCLE: DeviceRecordSpec<Cycle> = {key: CYCLE_KEY, schema: cycleSchema, empty: emptyCycle};
export const cycleOn = (c: Pick<Cycle, 'on'>) => c.on === true;
/** The days with a period logged (a flow), oldest first. */
export const periodDays = (c: Pick<Cycle, 'days'>): string[] => Object.entries(c.days).filter(([, d]) => !!d.flow).map(([d]) => d).sort();
