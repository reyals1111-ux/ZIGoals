import type {BackupReminder} from '../backup-reminder';
import {daysApart} from '../backup-reminder';

/**
 * Session AV lane 2 (N6 #193, Loop Habit Tracker's automatic backups): the schedule of a copy of Export everything, pure.
 * Kept as `schedule` in `zigoals:backup-reminder:v1` (lib/backup-reminder.ts). With a folder (File System Access, where the
 * browser has it: Chromium on computers) the copy is written there; elsewhere the schedule reminds instead. Nothing ever
 * leaves the device: the file is made here and written into the person's own folder.
 */
export type Every = 'day' | 'week' | 'month';
export const EVERY: readonly Every[] = ['day', 'week', 'month'];
export const EVERY_DAYS: Record<Every, number> = {day: 1, week: 7, month: 30};
export const EVERY_WORDS: Record<Every, {en: string; nl: string}> = {day: {en: 'every day', nl: 'elke dag'}, week: {en: 'every week', nl: 'elke week'}, month: {en: 'every month', nl: 'elke maand'}};
export type Schedule = NonNullable<BackupReminder['schedule']>;

/** Whether a scheduled copy is due today: a schedule, and no copy in its period (a copy marked by hand counts too). */
export function scheduleDue(r: BackupReminder, today: string): boolean {
  const s = r.schedule;
  if (!s) return false;
  const last = [s.lastOn, r.savedOn].filter((d): d is string => !!d).sort().pop();
  return !last || daysApart(last, today) >= EVERY_DAYS[s.every];
}
/** The day the next copy is due (YYYY-MM-DD), or null without a schedule; today when it is due now. */
export function nextDueOn(r: BackupReminder, today: string): string | null {
  const s = r.schedule;
  if (!s) return null;
  const last = [s.lastOn, r.savedOn].filter((d): d is string => !!d).sort().pop();
  if (!last) return today;
  const next = new Date(`${last}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + EVERY_DAYS[s.every]);
  const iso = next.toISOString().slice(0, 10);
  return iso < today ? today : iso;
}
/** The record with a schedule (or none); every other field is kept. */
export function withSchedule(r: BackupReminder, schedule: Schedule | null): BackupReminder {
  const next = {...r};
  if (schedule) next.schedule = schedule; else delete next.schedule;
  return next;
}
/** A copy was written today: the schedule's day, and the person's own "saved a copy" mark, so the reminder stays quiet. */
export function wroteCopy(r: BackupReminder, today: string): BackupReminder {
  if (!r.schedule) return {...r, savedOn: today};
  const {failedOn, ...schedule} = r.schedule; void failedOn;
  return {...r, savedOn: today, schedule: {...schedule, lastOn: today}};
}
/** The try today could not write (no permission, the folder gone, a full disk): said once on Settings → Your data. */
export function couldNotWrite(r: BackupReminder, today: string): BackupReminder {
  return r.schedule ? {...r, schedule: {...r.schedule, failedOn: today}} : r;
}
