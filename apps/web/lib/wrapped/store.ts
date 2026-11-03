import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (F5d): ZIGoals Wrapped's one small record, `zigoals:wrapped:v1` — the day the person first opened each
 * year's Wrapped (`"2026" → "2026-12-02"`), so Today's card rests once it has been seen. A display record: device only,
 * versioned and loose, never synced; written only on the person's own Open. The story itself is never stored; it is
 * read again from the records each time. At most 20 years.
 */
export const WRAPPED_KEY = 'zigoals:wrapped:v1';
export const MAX_WRAPPED_YEARS = 20;
export const wrappedSchema = z.looseObject({
  version: z.literal(1),
  opened: z.record(z.string().regex(/^\d{4}$/), z.iso.date()).refine(o => Object.keys(o).length <= MAX_WRAPPED_YEARS, `Up to ${MAX_WRAPPED_YEARS} years.`).optional(),
});
export type WrappedRecord = z.infer<typeof wrappedSchema>;
export const emptyWrapped = (): WrappedRecord => ({version: 1});
export const WRAPPED: DeviceRecordSpec<WrappedRecord> = {key: WRAPPED_KEY, schema: wrappedSchema, empty: emptyWrapped};
/** Remembers the first day a year's Wrapped was opened; past the cap the oldest years go first. */
export function markWrappedOpened(record: WrappedRecord, year: number, today: string): WrappedRecord {
  const key = String(year);
  if (record.opened?.[key]) return record;
  const opened = Object.fromEntries(Object.entries({...record.opened, [key]: today}).sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_WRAPPED_YEARS));
  return wrappedSchema.parse({...record, opened});
}
export const wrappedOpened = (record: WrappedRecord | null, year: number) => !!record?.opened?.[String(year)];
