import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (F5b): the supplements and medication log, on this device only. Information the person keeps for themself:
 * a name, the dose as they write it ("1 tablet", "500 mg"), when they plan to take it (times of day on chosen weekdays,
 * or as needed), and each day's "taken" or "skipped". No medical advice, no dose checks, no interaction claims.
 * Health-describing: restored only with the Health choice, erased with the account, never synced, and a reminder never
 * shows a name. Loose and versioned; every field optional or defaulted; bounded.
 */
export const SUPPLEMENTS_KEY = 'zigoals:supplements:v1';
export const MAX_SUPPLEMENTS = 40, MAX_TIMES = 4, MAX_LOG = 4000, LOG_KEEP_DAYS = 400, NAME_MAX = 60, DOSE_MAX = 60, NOTE_MAX = 200;
/** Every weekday (Monday = 1 … Sunday = 64, the notification plan's mask). */
export const EVERY_DAY = 127;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const clockSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const line = (max: number) => z.string().trim().max(max).regex(/^[^\u0000-\u001f\u007f]*$/);
export const SUPPLEMENT_KINDS = ['supplement', 'medication'] as const;
export const supplementItemSchema = z.looseObject({
  id: z.string().regex(/^supp_[a-z0-9-]{4,80}$/),
  name: line(NAME_MAX).min(1),
  dose: line(DOSE_MAX).optional(),
  kind: z.enum(SUPPLEMENT_KINDS).default('supplement'),
  /** Times of day ("HH:MM"), in order, no repeats; none means "as needed". */
  times: z.array(clockSchema).max(MAX_TIMES).default([]).refine(t => new Set(t).size === t.length, 'Each time once.'),
  weekdays: z.number().int().min(1).max(EVERY_DAY).default(EVERY_DAY),
  note: line(NOTE_MAX).optional(),
  /** A local reminder at each time, on this device (the notification plan); never with the name. */
  remind: z.boolean().optional(),
  createdAt: z.iso.datetime(),
});
export type SupplementItem = z.infer<typeof supplementItemSchema>;
/** One day's mark for one dose: its time ("HH:MM"), or "any" for an as-needed item. */
export const supplementMarkSchema = z.looseObject({
  itemId: z.string().regex(/^supp_[a-z0-9-]{4,80}$/),
  date: day,
  slot: z.union([clockSchema, z.literal('any')]),
  status: z.enum(['taken', 'skipped']),
  at: z.iso.datetime(),
});
export type SupplementMark = z.infer<typeof supplementMarkSchema>;
export const supplementsSchema = z.looseObject({
  version: z.literal(1),
  items: z.array(supplementItemSchema).max(MAX_SUPPLEMENTS).optional(),
  log: z.array(supplementMarkSchema).max(MAX_LOG).optional(),
});
export type Supplements = z.infer<typeof supplementsSchema>;
export const emptySupplements = (): Supplements => ({version: 1});
export const SUPPLEMENTS: DeviceRecordSpec<Supplements> = {key: SUPPLEMENTS_KEY, schema: supplementsSchema, empty: emptySupplements};
