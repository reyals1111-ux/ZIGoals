import * as z from 'zod';
import {IMPORT_BATCHES_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session W's import batches (Part 7, "Switch to ZIGoals"): one device key, `zigoals:import-batches:v1`, naming exactly
 * which records each import created, so "Undo this import" removes those and nothing else. Separate from the older
 * `zigoals:import-undo:v1` ledger (its strict kinds stay as builds #29–#31 read them). Device-only: the records it names
 * are ordinary Health and Habits records that sync with their modules.
 */
export {IMPORT_BATCHES_KEY};
export const IMPORT_FORMATS = ['apple-health', 'fitbit', 'garmin', 'samsung', 'oura', 'myfitnesspal', 'cronometer', 'loop', 'streaks'] as const;
export type ImportFormat = typeof IMPORT_FORMATS[number];
export const MAX_IMPORT_BATCHES = 50, MAX_BATCH_REFS = 50_000;
const ids = z.array(z.string().min(1).max(120)).max(MAX_BATCH_REFS);
export const HEALTH_REF_GROUPS = ['diary', 'foods', 'weights', 'activity', 'measurements', 'sleep', 'meditation', 'vitals'] as const;
export const importBatchSchema = z.strictObject({
  id: z.uuid(), format: z.enum(IMPORT_FORMATS), label: z.string().min(1).max(120), at: z.iso.datetime(),
  counts: z.record(z.string().max(40), z.number().int().min(0).max(1_000_000)),
  /** Summaries kept instead of raw samples when the full detail would not fit (owner decision D), named for the person. */
  summarised: z.array(z.string().max(200)).max(20).optional(),
  refs: z.strictObject({
    health: z.partialRecord(z.enum(HEALTH_REF_GROUPS), ids).optional(),
    habits: z.strictObject({habitIds: z.array(z.uuid()).max(200), entries: z.array(z.tuple([z.uuid(), z.iso.date()])).max(MAX_BATCH_REFS)}).optional(),
  }),
  undoneAt: z.iso.datetime().optional(),
});
export type ImportBatch = z.infer<typeof importBatchSchema>;
export const importBatchesSchema = z.strictObject({version: z.literal(1), batches: z.array(importBatchSchema).max(MAX_IMPORT_BATCHES)})
  .refine(b => new Set(b.batches.map(x => x.id)).size === b.batches.length, 'Duplicate import batch.');
export type ImportBatches = z.infer<typeof importBatchesSchema>;
export const emptyImportBatches = (): ImportBatches => ({version: 1, batches: []});
export const IMPORT_BATCHES: DeviceRecordSpec<ImportBatches> = {key: IMPORT_BATCHES_KEY, schema: importBatchesSchema, empty: emptyImportBatches};
