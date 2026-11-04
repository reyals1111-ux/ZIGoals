import {instantAt} from '../zone-time';
import type {Task, TaskReminder, Tasks} from './schema';

/**
 * Session AL (Part 8, P-LS-68, C-LS-09): task reminders. A reminder is an offset before the task's due time (a task with a
 * day and no time is reminded at 09:00 on its day). In the app now: the Tasks page and Today's tasks card show the ones
 * that are due ("Reminder · Call mum at 6:00 PM"). On the device's notifications only when the owner has switched push
 * on: `reminderInstants` is the list a notification plan can take (lib/notify is read-only for this lane; see the
 * integrator request). Pure: the zone and the instant come in.
 */
export const DAY_ONLY_CLOCK = '09:00';
/** The offsets offered in the editor, in minutes. */
export const REMINDER_CHOICES: {before: number; label: string}[] = [
  {before: 0, label: 'At the time'}, {before: 5, label: '5 minutes before'}, {before: 15, label: '15 minutes before'},
  {before: 30, label: '30 minutes before'}, {before: 60, label: '1 hour before'}, {before: 120, label: '2 hours before'},
  {before: 1440, label: '1 day before'}, {before: 2880, label: '2 days before'}, {before: 10_080, label: '1 week before'},
];
export const reminderLabel = (r: TaskReminder) => REMINDER_CHOICES.find(c => c.before === r.before)?.label ?? `${r.before} minutes before`;
/** When each reminder of an open task with a day goes off, as instants (ms). */
export function reminderInstants(record: Tasks, zone: string): {task: Task; at: number; before: number}[] {
  const out: {task: Task; at: number; before: number}[] = [];
  for (const t of record.tasks) {
    if (t.doneAt || !t.due || !t.reminders?.length) continue;
    const base = instantAt(t.due, t.time ?? DAY_ONLY_CLOCK, zone);
    for (const r of t.reminders) out.push({task: t, at: base - r.before * 60_000, before: r.before});
  }
  return out.sort((a, b) => a.at - b.at);
}
/**
 * The reminders to show now: gone off within the last `windowMs` (12 hours by default) and not dismissed. `dismissed`
 * holds `${taskId}@${at}` keys (kept in the page's memory; a reload shows a still-recent one again, which is fine).
 */
export function dueReminders(record: Tasks, nowMs: number, zone: string, {windowMs = 12 * 3_600_000, dismissed = new Set<string>()}: {windowMs?: number; dismissed?: ReadonlySet<string>} = {}): {task: Task; at: number; key: string}[] {
  return reminderInstants(record, zone).filter(r => r.at <= nowMs && r.at > nowMs - windowMs).map(r => ({task: r.task, at: r.at, key: `${r.task.id}@${r.at}`})).filter(r => !dismissed.has(r.key));
}
/** The next reminder still ahead (for a "next reminder at …" line and a single timer). */
export function nextReminder(record: Tasks, nowMs: number, zone: string): number | null {
  return reminderInstants(record, zone).find(r => r.at > nowMs)?.at ?? null;
}
