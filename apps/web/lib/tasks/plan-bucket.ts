import {addLocalDays, localWeekday} from '../local-date';
import {heldProject} from './engine';
import {tasksSchema, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (r5-plan, LEDGER #349; Akiflow's This week and This month): a task with no day can be planned for a
 * week or a month (`plan` on the loose task; TIER 3 stored format). It shows in Upcoming under its week or month until it
 * is done or given a day (a day wins: `plan` then means nothing and the next save drops it). Once its week or month has
 * passed it belongs to the current one: `bucketOf` reads it there at once, and `rollBuckets` writes the move once, said in
 * one line and never as "missed". Weeks start on Monday, as Tasks' weeks do. Pure.
 */
export type BucketKind = 'week' | 'month';
export type Bucket = {kind: BucketKind; of: string; moved: boolean};
const monday = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
/** The first day of the week (Monday) or the month that `day` is in. */
export const periodStart = (kind: BucketKind, day: string): string => kind === 'week' ? monday(day) : `${day.slice(0, 8)}01`;
/** The last day of that week or month. */
export function periodEnd(kind: BucketKind, start: string): string {
  if (kind === 'week') return addLocalDays(start, 6);
  const [y, m] = start.split('-').map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addLocalDays(next, -1);
}
/** The next week's or month's first day. */
export const nextPeriod = (kind: BucketKind, start: string): string => addLocalDays(periodEnd(kind, start), 1);
/** Where an open task with no day is planned: its week or month, the current one once its own has passed; else null. */
export function bucketOf(task: Pick<Task, 'plan' | 'due' | 'doneAt'>, today: string): Bucket | null {
  if (!task.plan || task.due || task.doneAt) return null;
  const own = periodStart(task.plan.kind, task.plan.of), now = periodStart(task.plan.kind, today);
  return own < now ? {kind: task.plan.kind, of: now, moved: true} : {kind: task.plan.kind, of: own, moved: false};
}
/** The plan for "This week", "Next week", "This month" or "Next month" from today. */
export const planFor = (choice: 'week' | 'next-week' | 'month' | 'next-month', today: string): NonNullable<Task['plan']> => {
  const kind: BucketKind = choice.endsWith('week') ? 'week' : 'month', now = periodStart(kind, today);
  return {kind, of: choice.startsWith('next') ? nextPeriod(kind, now) : now};
};
/** Writes the move of every task whose week or month has passed into the current one; `moved` names them (said once). */
export function rollBuckets(record: Tasks, today: string, at = new Date()): {record: Tasks; moved: Task[]} {
  const moved: Task[] = [], stamp = at.toISOString();
  // Review B6M-4: a task of a project on hold is never rewritten (it moves on once the project is back).
  const tasks = record.tasks.map(t => { const b = bucketOf(t, today); if (!b?.moved || heldProject(record, t, today)) return t; moved.push(t); return {...t, plan: {...t.plan!, of: b.of}, updatedAt: stamp}; });
  return moved.length ? {record: tasksSchema.parse({...record, tasks}), moved} : {record, moved};
}
export type BucketGroup = {kind: BucketKind; of: string; end: string; tasks: Task[]};
/** The open top-level tasks planned for a week or a month, grouped (weeks first, then months, each in time order). */
export function bucketGroups(record: Tasks, today: string): BucketGroup[] {
  const groups = new Map<string, BucketGroup>();
  for (const t of record.tasks) {
    if (t.parentId && record.tasks.some(p => p.id === t.parentId && !p.doneAt)) continue;
    const b = bucketOf(t, today); if (!b) continue;
    const key = `${b.kind}:${b.of}`, g = groups.get(key) ?? {kind: b.kind, of: b.of, end: periodEnd(b.kind, b.of), tasks: []};
    g.tasks.push(t); groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'week' ? -1 : 1) || a.of.localeCompare(b.of))
    .map(g => ({...g, tasks: g.tasks.sort((x, y) => x.createdAt.localeCompare(y.createdAt))}));
}
/** "This week", "Next week", "Week of Dec 7"; "This month", "Next month", or the month's name. */
export function bucketTitle(kind: BucketKind, of: string, today: string, monthName: (of: string) => string, dayName: (day: string) => string): string {
  const now = periodStart(kind, today);
  if (of === now) return kind === 'week' ? 'This week' : 'This month';
  if (of === nextPeriod(kind, now)) return kind === 'week' ? 'Next week' : 'Next month';
  return kind === 'week' ? `Week of ${dayName(of)}` : monthName(of);
}
