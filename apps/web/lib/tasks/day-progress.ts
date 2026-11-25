import {completedLog} from './engine';
import {isOutOfPlay} from './focus';
import type {HoursBlock} from './plan-record';
import type {Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #436; Amazing Marvin's progress bar and its "day is N % through"): two facts side by side in
 * Tasks → Today's heading line — how many of today's tasks are done ("4 of 7 done", a thin bar) and how far the working
 * hours have gone ("the day is 60 % through") — never compared, never "behind". Today's tasks are the open top-level ones
 * planned for today or earlier (as Today lists them, a project on hold or a task waiting its turn left out) and the ones
 * finished today (a repeat's time finished today counts once; a cancelled task does not). Nothing shows before the first
 * one: `null`. The hours are the person's own (Tasks → This week; 09:00–18:00 when not set). Pure.
 */
export type DayProgress = {done: number; total: number; share: number | null; hours: 'before' | 'during' | 'after' | 'off'; starts?: string};
const toMin = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
/** How far through the working hours `clock` is, 0–100 (a lunch break between blocks does not count), and where it is. */
export function hoursShare(blocks: readonly HoursBlock[], clock: string): {share: number | null; hours: DayProgress['hours']; starts?: string} {
  if (!blocks.length) return {share: null, hours: 'off'};
  const now = toMin(clock), total = blocks.reduce((n, b) => n + toMin(b.to) - toMin(b.from), 0);
  if (total <= 0) return {share: null, hours: 'off'};
  if (now < toMin(blocks[0]!.from)) return {share: 0, hours: 'before', starts: blocks[0]!.from};
  if (now >= toMin(blocks.at(-1)!.to)) return {share: 100, hours: 'after'};
  const gone = blocks.reduce((n, b) => n + Math.max(0, Math.min(now, toMin(b.to)) - toMin(b.from)), 0);
  return {share: Math.min(100, Math.max(0, Math.round((gone / total) * 100))), hours: 'during'};
}
export function dayProgress(record: Tasks, today: string, clock: string, blocks: readonly HoursBlock[], doneDay: (iso: string) => string): DayProgress | null {
  const open = record.tasks.filter(t => !t.doneAt && !t.parentId && !!t.due && t.due <= today && !isOutOfPlay(record, t, today)).length;
  const done = completedLog(record).filter(e => !e.cancelled && !e.task.parentId && doneDay(e.at) === today).length;
  const total = open + done;
  if (!total) return null;
  return {done, total, ...hoursShare(blocks, clock)};
}
/** The two facts in words: "4 of 7 of today’s tasks done · the day is 60 % through". */
export function dayProgressWords(p: DayProgress, formatClock: (clock: string) => string = c => c): {tasks: string; hours: string | null} {
  const tasks = p.done === p.total ? `All ${p.total} of today’s tasks done` : `${p.done} of ${p.total} of today’s tasks done`;
  const hours = p.hours === 'off' ? null : p.hours === 'before' ? `your hours start at ${formatClock(p.starts!)}` : p.hours === 'after' ? 'your working hours are over for today' : `the day is ${p.share} % through`;
  return {tasks, hours};
}
