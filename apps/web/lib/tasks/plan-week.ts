import {addLocalDays} from '../local-date';
import {editTask, setAside, waitingFor} from './engine';
import {firstFit, taskBusy, toClock, toMin, type Busy} from './layouts';
import {piecesOf, planAgain} from './pieces';
import type {TaskPlan} from './plan-record';
import {windowEnd, windowStart} from './recurrence';
import {taskLevel, type Task, type Tasks} from './schema';
import {closedBusy, taskHoursOn} from './work-hours';
import {blocksOn} from './time-blocks-read';

/**
 * Session AV lane 2 (r4-plan, LEDGER #300; Motion's auto-scheduling, made a proposal): "Plan my week". The open top-level
 * tasks with minutes and no time are placed over the next 7 days, each day's own free time inside the person's hours
 * (lib/tasks/work-hours.ts; an "after hours" task in the evening hours), around its timed tasks and imported events: the
 * earliest deadline first, then priority, then the planned day, then the oldest. A task is never placed before its own
 * day (or its start-early day), never after its deadline, a floating repeat only inside its week or month; a task in
 * pieces is placed piece by piece; a task that waits for another, a background task and a fixed repeat are not placed.
 * Nothing is written here: keepPlacements writes the kept ones as each task's day and time (the first kept piece of a
 * task in pieces), in one change the caller gives Undo. Pure.
 */
export const WEEK_DAYS = 7;
export type WeekPlacement = {key: string; task: Task; day: string; start: string; end: string; minutes: number; part?: number; of?: number};
export type WeekLeft = {task: Task; why: 'deadline' | 'room'; placed: number; of: number; by?: string};
/** Fixed items of a day the task list does not hold (imported calendar events). */
export type ExtraBusy = (day: string) => readonly Busy[];
const none: ExtraBusy = () => [];
const later = (a: string, b: string) => a > b ? a : b;

export {planAgain};
/**
 * The days a task may go on within [today, last]: from its own day (or start-early day; today when overdue or with no
 * day), a floating repeat from its window's first day, up to its deadline (or the window's last day). Null when its day is
 * after `last`.
 */
export function taskSpan(t: Task, today: string, last: string): {from: string; to: string; byDeadline: boolean} | null {
  let from = today, to = last, byDeadline = false;
  const flex = t.recur?.flex;
  // Review B4D-2: a floating repeat's day may be a planned day inside its window; the window's last day is its limit.
  if (flex && t.due) { const end = windowEnd(flex, t.due); from = later(today, windowStart(flex, t.due)); if (end < to) to = later(today, end); }
  else if (t.due && t.due > today) from = t.early ? later(today, addLocalDays(t.due, -t.early)) : t.due;
  if (t.deadline && t.deadline < to) { to = later(today, t.deadline); byDeadline = true; }
  if (from > to) { if (!byDeadline) return null; from = to; }
  return {from, to, byDeadline};
}
/** The tasks Plan my week places, in the order it places them. */
export function weekCandidates(record: Tasks, today: string, clock: string, days = WEEK_DAYS): Task[] {
  const last = addLocalDays(today, days - 1);
  // Session AV lane 2 (r5-plan, LEDGER #348): a task dropped into a time block is placed by Plan my day, inside its block.
  return record.tasks.filter(t => !t.doneAt && !t.parentId && !t.parallel && !t.block && !!t.minutes && (!t.time || planAgain(t, today, clock)) && (!t.recur || !!t.recur.flex) && !waitingFor(record, t).length && !setAside(record, t, today) /* Session AV lane 2 (r6-plan, LEDGER #392, #393) */ && !!taskSpan(t, today, last))
    .sort((a, b) => (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31') || taskLevel(a) - taskLevel(b) || (a.due ?? '9999-12-31').localeCompare(b.due ?? '9999-12-31') || a.createdAt.localeCompare(b.createdAt));
}
/** Plan my week: where each task (or piece) would go, and what found no room. */
export function fitWeek({record, plan, today, clock, extra = none, days = WEEK_DAYS}: {record: Tasks; plan: Pick<TaskPlan, 'workHours' | 'blocks'>; today: string; clock: string; extra?: ExtraBusy; days?: number}): {days: string[]; placed: WeekPlacement[]; left: WeekLeft[]} {
  const dayList = Array.from({length: days}, (_, i) => addLocalDays(today, i)), last = dayList.at(-1)!;
  const tasks = weekCandidates(record, today, clock, days), again = new Set(tasks.filter(t => t.time).map(t => t.id));
  // Session AV lane 2 (r5-plan, review B5L-4): a day's time blocks are kept for their own tasks, as Plan my day keeps them.
  const blocked = (d: string) => blocksOn(plan, d).map(b => ({start: toMin(b.from), end: toMin(b.to), title: b.name}));
  const taken = new Map(dayList.map(d => [d, [...taskBusy(record, d, again), ...extra(d), ...blocked(d)].filter(b => b.end > b.start).map(b => ({start: b.start, end: b.end}))]));
  const now = Math.ceil(toMin(clock) / 15) * 15, placed: WeekPlacement[] = [], left: WeekLeft[] = [];
  for (const t of tasks) {
    const span = taskSpan(t, today, last)!, {pieces, done} = piecesOf(t), split = pieces.length > 1 || done > 0;
    let day = span.from, from = 0, kept = 0;
    for (const piece of pieces) {
      // Session AV lane 2 (r5-plan, review B5L-5): the travel minutes before the task are kept free before its first piece.
      const travel = kept === 0 ? t.travel ?? 0 : 0;
      let found = -1;
      for (; day <= span.to; day = addLocalDays(day, 1), from = 0) {
        const start = Math.max(from, day === today ? now : 0);
        found = firstFit(piece + travel, [...taken.get(day)!, ...closedBusy(taskHoursOn(plan, day, t))], start, 24 * 60);
        if (found >= 0) break;
      }
      if (found < 0) break;
      const at = found + travel;
      taken.get(day)!.push({start: found, end: at + piece});
      placed.push({key: `${t.id}:${done + kept + 1}`, task: t, day, start: toClock(at), end: toClock(at + piece), minutes: piece, ...(split ? {part: done + kept + 1, of: done + pieces.length} : {})});
      kept++; from = at + piece;
    }
    if (kept < pieces.length) left.push({task: t, why: span.byDeadline ? 'deadline' : 'room', placed: kept, of: pieces.length, ...(span.byDeadline ? {by: span.to} : {})});
  }
  placed.sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));
  return {days: dayList, placed, left};
}
/** Writes the kept placements: each task's first kept piece becomes its day and time. Throws the edit's words. */
export function keepPlacements(record: Tasks, kept: readonly WeekPlacement[], today: string, at = new Date()): Tasks {
  const first = new Map<string, WeekPlacement>();
  for (const p of [...kept].sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start))) if (!first.has(p.task.id)) first.set(p.task.id, p);
  return [...first.values()].reduce((r, p) => r.tasks.some(t => t.id === p.task.id && !t.doneAt) ? editTask(r, p.task.id, {due: p.day, time: p.start}, today, {allowPast: true, at}) : r, record);
}
