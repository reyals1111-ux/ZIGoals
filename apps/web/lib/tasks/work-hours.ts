import {localWeekday} from '../local-date';
import {MAX_DAY_BLOCKS, readDayBlocks, taskPlanSchema, type HoursBlock, type TaskPlan} from './plan-record';
import type {Busy} from './layouts';

/**
 * Session AV lane 2 (r4-plan, LEDGER #301; Motion's schedules): the hours tasks may be placed in. Each weekday has up to
 * two blocks (a morning and an afternoon, around a lunch break) or none (a day off); a weekday the person has not set
 * keeps 09:00–18:00, the hours Plan my day always used. A task marked "after hours" goes in the evening hours instead
 * (20:00–23:00 unless set), so a night owl's evening tasks land after work. Kept in `zigoals:task-plan:v1` `workHours`.
 * Pure.
 */
export const DEFAULT_WORK: readonly HoursBlock[] = [{from: '09:00', to: '18:00'}];
export const DEFAULT_AFTER: HoursBlock = {from: '20:00', to: '23:00'};
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_WORDS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const toMin = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

/** A weekday's working hours (0 Sunday … 6 Saturday): its own blocks, or the usual 09:00–18:00. */
export function weekdayHours(plan: Pick<TaskPlan, 'workHours'>, weekday: number): readonly HoursBlock[] {
  return plan.workHours?.days?.[String(weekday)] ?? DEFAULT_WORK;
}
/** A day's working hours ("YYYY-MM-DD"). */
export const hoursOn = (plan: Pick<TaskPlan, 'workHours'>, day: string) => weekdayHours(plan, localWeekday(day));
/** The evening hours for "after hours" tasks. */
export const afterHours = (plan: Pick<TaskPlan, 'workHours'>): HoursBlock => plan.workHours?.after ?? DEFAULT_AFTER;
/** The hours a task may be placed in on a day: the evening hours for an "after hours" task, else the working hours. */
export const taskHoursOn = (plan: Pick<TaskPlan, 'workHours'>, day: string, task: {afterHours?: true}): readonly HoursBlock[] => task.afterHours ? [afterHours(plan)] : hoursOn(plan, day);
/** Whether the person has set any hours of their own. */
export const hoursSet = (plan: Pick<TaskPlan, 'workHours'>) => !!plan.workHours && (Object.keys(plan.workHours.days ?? {}).length > 0 || !!plan.workHours.after);

/** The times outside the blocks, as busy blocks of the day (so the day's first-fit never places a task there). */
export function closedBusy(blocks: readonly HoursBlock[]): Busy[] {
  const out: Busy[] = [];
  let at = 0;
  for (const b of [...blocks].sort((x, y) => x.from.localeCompare(y.from))) { const s = toMin(b.from), e = toMin(b.to); if (s > at) out.push({start: at, end: s, title: 'outside your hours'}); at = Math.max(at, e); }
  if (at < 24 * 60) out.push({start: at, end: 24 * 60, title: 'outside your hours'});
  return out;
}
/**
 * The free minutes inside the blocks, after `from` (minutes of the day) and outside the busy blocks. Overlapping blocks
 * count once. Pure.
 */
export function freeIn(blocks: readonly HoursBlock[], busy: readonly Busy[], from = 0): number {
  const spans = blocks.map(b => ({s: Math.max(toMin(b.from), from), e: toMin(b.to)})).filter(x => x.e > x.s).sort((a, b) => a.s - b.s);
  const merged: {s: number; e: number}[] = [];
  for (const x of spans) { const prev = merged.at(-1); if (prev && x.s <= prev.e) prev.e = Math.max(prev.e, x.e); else merged.push({...x}); }
  let free = 0;
  for (const m of merged) {
    let at = m.s;
    for (const b of [...busy].filter(x => x.end > m.s && x.start < m.e).sort((x, y) => x.start - y.start)) { if (b.start > at) free += Math.min(b.start, m.e) - at; at = Math.max(at, b.end); if (at >= m.e) break; }
    if (at < m.e) free += m.e - at;
  }
  return free;
}
/** Minutes inside the blocks. */
export const blockMinutes = (blocks: readonly HoursBlock[]) => blocks.reduce((n, b) => n + toMin(b.to) - toMin(b.from), 0);

/** Checks a weekday's blocks, in words: each ends after it starts; the second starts once the first has ended. */
export function checkBlocks(blocks: readonly HoursBlock[]): string | null {
  if (blocks.length > MAX_DAY_BLOCKS) return 'A day has two blocks of hours at most (for a lunch break).';
  for (const b of blocks) if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.from) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.to)) return 'Choose times such as 09:00 and 17:30.';
  for (const b of blocks) if (b.from >= b.to) return 'Each block ends after it starts (within the same day).';
  const sorted = [...blocks].sort((x, y) => x.from.localeCompare(y.from));
  if (sorted.length === 2 && sorted[1]!.from < sorted[0]!.to) return 'The second block starts after the first one ends.';
  return null;
}
/**
 * Sets a weekday's hours (blocks; an empty list is a day off), or back to the usual (null). `weekdays` sets several at once
 * ("the same on every weekday"). Throws the check's words. Pure.
 */
export function setWeekdayHours(plan: TaskPlan, weekdays: readonly number[], blocks: readonly HoursBlock[] | null): TaskPlan {
  if (blocks) { const wrong = checkBlocks(blocks); if (wrong) throw new Error(wrong); }
  const days: Record<string, HoursBlock[]> = {...(plan.workHours?.days ?? {})};
  for (const w of weekdays) { if (!Number.isInteger(w) || w < 0 || w > 6) continue; if (blocks) days[String(w)] = readDayBlocks(blocks.map(b => ({from: b.from, to: b.to}))) ?? []; else delete days[String(w)]; }
  return withHours(plan, {days});
}
/** Sets the evening hours for "after hours" tasks, or back to 20:00–23:00 (null). */
export function setAfterHours(plan: TaskPlan, block: HoursBlock | null): TaskPlan {
  if (block) { const wrong = checkBlocks([block]); if (wrong) throw new Error(wrong); }
  return withHours(plan, {after: block ? {from: block.from, to: block.to} : undefined});
}
function withHours(plan: TaskPlan, patch: {days?: Record<string, HoursBlock[]>; after?: HoursBlock | undefined}): TaskPlan {
  const next: Record<string, unknown> = {...(plan.workHours ?? {})};
  if ('days' in patch) { if (patch.days && Object.keys(patch.days).length) next.days = patch.days; else delete next.days; }
  if ('after' in patch) { if (patch.after) next.after = patch.after; else delete next.after; }
  const out: Record<string, unknown> = {...plan};
  if (Object.keys(next).length) out.workHours = next; else delete out.workHours;
  return taskPlanSchema.parse(out);
}
