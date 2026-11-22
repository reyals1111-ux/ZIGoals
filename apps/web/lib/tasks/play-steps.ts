import {childrenOf, finishTask} from './engine';
import {addSpent} from './layouts';
import type {Task, Tasks} from './schema';

/**
 * Session AV lane 2 (r5-plan, LEDGER #351; Tiimo's timers on the steps of a task): a task with subtasks played one step at
 * a time — the current step with a countdown from its own minutes (or a count up when it has none), the done and coming
 * steps listed; Next ticks the step and adds the time it took to its time spent. From existing fields (`parentId`,
 * `minutes`, `spent`, `doneAt`); nothing new is stored. Pure; the clock is passed in.
 */
export type StepClock = {since: number | null; carried: number};
export const startClock = (now: number): StepClock => ({since: now, carried: 0});
/** The milliseconds the step has run (a pause stops it). */
export const runMs = (c: StepClock, now: number): number => c.carried + (c.since === null ? 0 : Math.max(0, now - c.since));
export const pauseClock = (c: StepClock, now: number): StepClock => c.since === null ? c : {since: null, carried: runMs(c, now)};
export const resumeClock = (c: StepClock, now: number): StepClock => c.since === null ? {since: now, carried: c.carried} : c;
/** Whole minutes for the time spent: at least one once a step has run at all. */
export const spentMinutes = (ms: number): number => ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000));
/** "4:05" left (or, past its minutes, "+1:10"), or the time run when the step has no minutes. */
export function clockText(step: Pick<Task, 'minutes'>, ms: number): {text: string; over: boolean; counting: 'down' | 'up'} {
  const mmss = (x: number) => { const s = Math.floor(x / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  if (!step.minutes) return {text: mmss(ms), over: false, counting: 'up'};
  const left = step.minutes * 60_000 - ms;
  return left >= 0 ? {text: mmss(left), over: false, counting: 'down'} : {text: `+${mmss(-left)}`, over: true, counting: 'down'};
}
/** The steps: done ones, the current (first open) one and the coming ones, in the list's order. */
export function playSteps(record: Tasks, parentId: string): {done: Task[]; now: Task | null; coming: Task[]; all: Task[]} {
  const all = childrenOf(record, parentId), open = all.filter(t => !t.doneAt);
  return {all, done: all.filter(t => t.doneAt), now: open[0] ?? null, coming: open.slice(1)};
}
/** Next: the step is done and the minutes it ran are added to its time spent. */
export function finishStep(record: Tasks, stepId: string, ms: number, at: Date, today: string): Tasks {
  const minutes = spentMinutes(ms), done = finishTask(record, stepId, at, {today, doneDay: today});
  return minutes ? addSpent(done, stepId, minutes, {at}) : done;
}
