import type {z} from 'zod';

/**
 * One small pattern for the device-only records added from Session V on (Today's remembered folds, ZIGi's options,
 * memory, usage, look & feel, reminders): read tolerantly, write only on the person's choice. A missing record reads as
 * the empty value; bytes that do not parse, or that the schema refuses, also read as the empty value and say so
 * (`unreadable`), and a read never rewrites them. A write applies the change to what the device holds now, validates the
 * result and stores it, or throws with nothing written. The keys go through `getAppStorage()` at the call site, so an
 * account keeps its own copy and Showcase keeps the tab's.
 */
export type DeviceRecordSpec<T> = {key: string; schema: z.ZodType<T>; empty: () => T};
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
export function readDeviceRecord<T>(storage: Read, spec: DeviceRecordSpec<T>): {data: T; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(spec.key); } catch { return {data: spec.empty(), unreadable: true}; }
  if (raw === null) return {data: spec.empty(), unreadable: false};
  try {
    const parsed = spec.schema.safeParse(JSON.parse(raw));
    return parsed.success ? {data: parsed.data, unreadable: false} : {data: spec.empty(), unreadable: true};
  } catch { return {data: spec.empty(), unreadable: true}; }
}
export function updateDeviceRecord<T>(storage: ReadWrite, spec: DeviceRecordSpec<T>, change: (current: T) => T): T {
  const next = spec.schema.parse(change(readDeviceRecord(storage, spec).data));
  storage.setItem(spec.key, JSON.stringify(next));
  return next;
}
/**
 * Review B6P-1 and B6P-4 (Session AV lane 2, r6-body): a writer that adds to a record the person keeps (a line in the
 * journal, a line to bring up at a visit) from somewhere other than that record's own page. When what this device holds
 * cannot be read, nothing is written and null comes back, so the record is never replaced by the empty value plus one
 * line; otherwise exactly `updateDeviceRecord`.
 */
export function addToDeviceRecord<T>(storage: ReadWrite, spec: DeviceRecordSpec<T>, change: (current: T) => T): T | null {
  const read = readDeviceRecord(storage, spec);
  if (read.unreadable) return null;
  const next = spec.schema.parse(change(read.data));
  storage.setItem(spec.key, JSON.stringify(next));
  return next;
}
