import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';

/**
 * Session AK Part 8.9 (TIER 3 (stored format)): a gentle monthly "keep a copy" reminder. Export everything writes
 * nothing on this device by design, so the app cannot know when a copy was made: the person says so ("I saved a copy
 * today"), or turns the reminder off. A new device-only key, loose and versioned; in Export everything and the catalog.
 */
export const BACKUP_REMINDER_KEY = 'zigoals:backup-reminder:v1';
const day = z.iso.date();
export const backupReminderSchema = z.looseObject({version: z.literal(1), savedOn: day.optional(), askedOn: day.optional(), off: z.boolean().optional()});
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
