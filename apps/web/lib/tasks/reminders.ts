import {instantAt, wallClock} from '../zone-time';
import type {Task, TaskReminder, Tasks} from './schema';
import {heldProject} from './engine';
import {againAt, againFor, type Again} from './remind-again';

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
/**
 * When each reminder of an open task with a day goes off, as instants (ms). `of` is the reminder's own instant; a reminder
 * the person snoozed (Session AV 1c, `task.snooze`) goes off at the snooze's end instead (`at`), once.
 */
export function reminderInstants(record: Tasks, zone: string): {task: Task; at: number; before: number; of: number; reminder: TaskReminder}[] {
  const out: {task: Task; at: number; before: number; of: number; reminder: TaskReminder}[] = [];
  for (const t of record.tasks) {
    // Session AV lane 2 (LEDGER #3): a reminder at its own date and time (`at`) needs no day on the task.
    if (t.doneAt || !t.reminders?.length || (!t.due && !t.reminders.some(r => r.at))) continue;
    const base = t.due ? instantAt(t.due, t.time ?? DAY_ONLY_CLOCK, zone) : 0, seen = new Set<number>();
    for (const r of t.reminders) {
      if (!r.at && !t.due) continue;
      const of = r.at ? instantAt(r.at.slice(0, 10), r.at.slice(11, 16), zone) : base - r.before * 60_000;
      if (seen.has(of)) continue; seen.add(of);
      // Session AV lane 2 (r6-plan, LEDGER #392; TIER 3 (PWA)): no reminder while its project is on hold (from its resume day, as before).
      if (record.projects?.some(p => p.hold) && heldProject(record, t, wallClock(of, zone).date)) continue;
      out.push({task: t, at: t.snooze && t.snooze.of === of && (t.snooze.before === undefined || t.snooze.before === r.before) ? t.snooze.until : of, before: r.before, of, reminder: r});
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
/**
 * Session AV (1c, q1 #1, fresh-agent review; Todoist and TickTick let you pick): the snooze lengths offered on a reminder
 * that has gone off — 15 minutes, an hour, or tomorrow at 09:00 (the day-only reminder time).
 */
export const SNOOZE_CHOICES = [{id: '15m', label: '15 min', words: 'for 15 minutes'}, {id: '1h', label: '1 h', words: 'for 1 hour'}, {id: 'tomorrow', label: 'Tomorrow', words: 'until tomorrow morning'}] as const;
export type SnoozeChoice = (typeof SNOOZE_CHOICES)[number]['id'];
export function snoozeUntil(choice: SnoozeChoice, nowMs: number = Date.now(), zone: string): number {
  if (choice === '15m') return nowMs + 15 * 60_000;
  if (choice === '1h') return nowMs + 3_600_000;
  const day = wallClock(nowMs, zone).date, next = new Date(`${day}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  return instantAt(next.toISOString().slice(0, 10), DAY_ONLY_CLOCK, zone);
}
/**
 * A reminder snoozed: the task keeps the reminder's own instant (`of`), its offset (`before`) and when it comes back (`until`). One snooze per
 * task (a newer one replaces it); it counts only while that reminder is still the task's (done, moved or changed: gone).
 * Pure; the task's other fields stay as they are.
 */
export function snoozeReminder(record: Tasks, taskId: string, of: number, until: number, before?: number): Tasks {
  if (!record.tasks.some(t => t.id === taskId)) throw new Error('That task is no longer on this device.');
  return {...record, tasks: record.tasks.map(t => t.id === taskId ? {...t, snooze: {of: Math.round(of), until: Math.round(until), ...(before !== undefined ? {before} : {})}} : t)};
}
/**
 * The reminders to show now: gone off within the last `windowMs` (12 hours by default) and not dismissed. `dismissed`
 * holds `${taskId}@${at}` keys (kept in the page's memory; a reload shows a still-recent one again, which is fine).
 * Session AW (X1, LEDGER #438): with `again` (the device's default repeat and the quiet hours), a reminder that repeats
 * shows its latest ring (`at`, `round` of `times`, the `next` one ahead): a ring dismissed comes back at the next repeat,
 * until the task is done or the reminder snoozed. Without `again`, exactly as before.
 */
export type DueReminder = {task: Task; at: number; key: string; of: number; before: number; round?: number; times?: number; next?: number | null};
export function dueReminders(record: Tasks, nowMs: number, zone: string, {windowMs = 12 * 3_600_000, dismissed = new Set<string>(), again}: {windowMs?: number; dismissed?: ReadonlySet<string>; again?: {fallback: Again | null; quiet: {from: string; to: string} | null}} = {}): DueReminder[] {
  return reminderInstants(record, zone).flatMap((r): DueReminder[] => {
    if (!again) return r.at <= nowMs && r.at > nowMs - windowMs ? [{task: r.task, at: r.at, key: `${r.task.id}@${r.at}`, of: r.of, before: r.before}] : [];
    const ring = againAt(r.at, againFor(r.reminder, again.fallback), again.quiet, zone, nowMs);
    if (!ring || ring.at <= nowMs - windowMs) return [];
    return [{task: r.task, at: ring.at, key: `${r.task.id}@${ring.at}`, of: r.of, before: r.before, ...(ring.times ? {round: ring.round, times: ring.times, next: ring.next} : {})}];
  }).filter(r => !dismissed.has(r.key));
}
/** The next reminder still ahead (for a "next reminder at …" line and a single timer). */
export function nextReminder(record: Tasks, nowMs: number, zone: string): number | null {
  return reminderInstants(record, zone).find(r => r.at > nowMs)?.at ?? null;
}
