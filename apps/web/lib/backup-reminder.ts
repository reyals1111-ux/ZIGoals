import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';

/**
 * Session AK Part 8.9 (TIER 3 (stored format)): a gentle monthly "keep a copy" reminder. Export everything writes
 * nothing on this device by design, so the app cannot know when a copy was made: the person says so ("I saved a copy
 * today"), or turns the reminder off. A new device-only key, loose and versioned; in Export everything and the catalog.
 */
export const BACKUP_REMINDER_KEY = 'zigoals:backup-reminder:v1';
const day = z.iso.date();
// Session AV Part 3 ([TIER 3] (stored formats), ADR-045 D-KEEP): optional fields only, on the same loose record (older
// builds read it and keep what they do not know). `countAt` is how many records the device held at the last copy made from
// the Today card; `remindedOn` the Today card's own "Not now"; `persistAskedOn`/`persistResult` the one automatic request
// to keep this site's data; `iosNoteDoneOn`/`iosNoteLaterOn` the iPhone Safari note; `restoreOfferDoneOn` the Home Screen
// app's "Restore a backup from Safari" offer.
export const backupReminderSchema = z.looseObject({version: z.literal(1), savedOn: day.optional(), askedOn: day.optional(), off: z.boolean().optional(),
  countAt: z.number().int().min(0).max(10_000_000).optional(), remindedOn: day.optional(),
  persistAskedOn: day.optional(), persistResult: z.enum(['kept', 'not-kept', 'unsupported', 'error']).optional(),
  iosNoteDoneOn: day.optional(), iosNoteLaterOn: day.optional(), restoreOfferDoneOn: day.optional()});
export type BackupReminder = z.infer<typeof backupReminderSchema>;
export const emptyBackupReminder = (): BackupReminder => ({version: 1});
export const BACKUP_REMINDER: DeviceRecordSpec<BackupReminder> = {key: BACKUP_REMINDER_KEY, schema: backupReminderSchema, empty: emptyBackupReminder};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
/** Whether to remind today: records exist, not off, no copy in 30 days, not asked in the last 30 days. */
export function backupDue(r: BackupReminder, today: string, hasRecords: boolean): boolean {
  if (!hasRecords || r.off) return false;
  if (r.savedOn && daysBetween(r.savedOn, today) < 30) return false;
  if (r.askedOn && daysBetween(r.askedOn, today) < 30) return false;
  return true;
}

/** Session AV Part 3 (D-KEEP): records added since the last copy before Today offers one, and how long "Not now" lasts. */
export const NEW_RECORDS_FOR_COPY = 25, COPY_QUIET_DAYS = 14;
/**
 * Whether Today offers a copy: records exist, the reminder is not off, at least 25 records were added since the last copy
 * made here (or since the start), no copy marked in the last 14 days, and no "Not now" in the last 14 days. Never nagging:
 * at most once every two weeks, and only after real new data.
 */
export function copyOfferDue(r: BackupReminder, today: string, count: number): boolean {
  if (r.off || count < NEW_RECORDS_FOR_COPY) return false;
  if (count - (r.countAt ?? 0) < NEW_RECORDS_FOR_COPY) return false;
  if (r.savedOn && daysBetween(r.savedOn, today) < COPY_QUIET_DAYS) return false;
  if (r.remindedOn && daysBetween(r.remindedOn, today) < COPY_QUIET_DAYS) return false;
  return true;
}
export {daysBetween as daysApart};
