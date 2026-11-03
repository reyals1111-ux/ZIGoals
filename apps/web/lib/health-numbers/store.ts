import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #4, lane G1a): "Your numbers" — blood pressure readings and lab values the person copies from
 * their own lab sheet. A new device-only key, loose and versioned; written only when the person adds or removes a reading.
 * ZIGoals sets no ranges of its own: a lab value carries the reference range the person copied (`refLow`, `refHigh`, one
 * side or both, or none), and the only verdict ever shown is "inside / outside the range you copied". A unit is kept
 * exactly as typed ("mmol/L", "mg/dL"); values in different units are never mixed or converted. Health-describing data.
 */
export const HEALTH_NUMBERS_KEY = 'zigoals:health-numbers:v1';
export const MAX_NUMBERS = 3000;
export const NAME_MAX = 60, UNIT_MAX = 20, NOTE_MAX = 280;
/** Bounds for a typed blood pressure (mmHg) and pulse (beats a minute): wide, to refuse typos only. */
export const BP_LIMITS = {systolic: [50, 300], diastolic: [20, 200], pulse: [20, 250]} as const;
/** A lab value or a range end: any finite number the sheet can print, within a wide bound. */
export const LAB_VALUE_MAX = 1_000_000;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const labNumber = z.number().finite().min(0).max(LAB_VALUE_MAX);
const whole = (key: keyof typeof BP_LIMITS) => z.number().int().min(BP_LIMITS[key][0]).max(BP_LIMITS[key][1]);
export const healthNumberSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  date: day,
  kind: z.enum(['bp', 'lab']),
  /** Blood pressure (kind 'bp'), mmHg; the pulse is optional. */
  systolic: whole('systolic').optional(),
  diastolic: whole('diastolic').optional(),
  pulse: whole('pulse').optional(),
  /** A lab value (kind 'lab'): the marker's name and unit as the person typed them, the value, and the range copied. */
  name: z.string().trim().min(1).max(NAME_MAX).optional(),
  value: labNumber.optional(),
  unit: z.string().trim().max(UNIT_MAX).optional(),
  refLow: labNumber.optional(),
  refHigh: labNumber.optional(),
  note: z.string().trim().max(NOTE_MAX).optional(),
}).refine(e => e.kind === 'bp' ? e.systolic !== undefined && e.diastolic !== undefined : e.name !== undefined && e.value !== undefined, 'A reading needs its numbers.')
  .refine(e => e.refLow === undefined || e.refHigh === undefined || e.refLow <= e.refHigh, 'The low end of a range comes before the high end.');
export const healthNumbersSchema = z.looseObject({
  version: z.literal(1),
  entries: z.array(healthNumberSchema).max(MAX_NUMBERS).default([]),
});
export type HealthNumber = z.infer<typeof healthNumberSchema>;
export type HealthNumbers = z.infer<typeof healthNumbersSchema>;
export const emptyHealthNumbers = (): HealthNumbers => ({version: 1, entries: []});
export const HEALTH_NUMBERS: DeviceRecordSpec<HealthNumbers> = {key: HEALTH_NUMBERS_KEY, schema: healthNumbersSchema, empty: emptyHealthNumbers};
