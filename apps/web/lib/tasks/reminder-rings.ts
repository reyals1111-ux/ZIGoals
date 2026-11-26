import {againAt, againFor, repeatInstants, type Again} from './remind-again';
import {reminderInstants, type DueReminder} from './reminders';
import type {Tasks} from './schema';

/**
 * Session AW (X1, LEDGER #438): the reminder rows' repeats. With `again` (the device's default repeat and the quiet hours),
 * a reminder that repeats shows its latest ring (`at`, `round` of `times`, the `next` one ahead): a ring dismissed comes
 * back at the next repeat, until the task is done or the reminder snoozed. Without `again`, exactly as before (as
 * lib/tasks/reminders.ts dueReminders). Session AW Part 2 (speed): its own module, which the pages load right after their
 * first scripts (components/tasks/use-remind-again.ts). Pure.
 */
export function dueReminders(record: Tasks, nowMs: number, zone: string, {windowMs = 12 * 3_600_000, dismissed = new Set<string>(), again}: {windowMs?: number; dismissed?: ReadonlySet<string>; again?: {fallback: Again | null; quiet: {from: string; to: string} | null}} = {}): DueReminder[] {
  return reminderInstants(record, zone).flatMap((r): DueReminder[] => {
    if (!again) return r.at <= nowMs && r.at > nowMs - windowMs ? [{task: r.task, at: r.at, key: `${r.task.id}@${r.at}`, of: r.of, before: r.before}] : [];
    const ring = againAt(r.at, againFor(r.reminder, again.fallback), again.quiet, zone, nowMs);
    if (!ring || ring.at <= nowMs - windowMs) return [];
    return [{task: r.task, at: ring.at, key: `${r.task.id}@${ring.at}`, of: r.of, before: r.before, ...(ring.times ? {round: ring.round, times: ring.times, next: ring.next} : {})}];
  }).filter(r => !dismissed.has(r.key));
}
/**
 * Session AW (X1, LEDGER #438): the next moment a reminder rings — a first ring or a repeat — still ahead, so the rows can
 * wake exactly then (not at their next half-minute look). Dismissed rings do not matter: the next repeat comes anyway.
 */
export function nextRing(record: Tasks, nowMs: number, zone: string, again: {fallback: Again | null; quiet: {from: string; to: string} | null}): number | null {
  let soonest: number | null = null;
  for (const r of reminderInstants(record, zone)) {
    const a = againFor(r.reminder, again.fallback), rings = a ? [r.at, ...repeatInstants(r.at, a, again.quiet, zone)] : [r.at];
    const ahead = rings.find(t => t > nowMs);
    if (ahead !== undefined && (soonest === null || ahead < soonest)) soonest = ahead;
  }
  return soonest;
}
