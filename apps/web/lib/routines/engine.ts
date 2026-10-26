import {habitDay, habitRuleOn, type Habit, type HabitData} from '../habits';
import {stacksOf} from '../habits-v2/stacks';
import {templateOfChain} from './templates';
import {routineRunSchema, type RoutineRun, type RoutineRunStore} from './run-schema';

/**
 * H5: a routine is a habit stack played one habit at a time. The steps are the stack's chain in order (lib/habits-v2/
 * stacks.ts, the existing "stack after" links); a step is a duration habit when its rule measures minutes or hours, so
 * the player shows the timer there. The run itself lives in `zigoals:routine-run:v1`; every check-in it makes goes
 * through the habit journal's own mutators from the player, never from here.
 */
export type RoutineStep = {habit: Habit; index: number; duration: boolean; minutes: number | null; status: 'done' | 'skipped' | 'pending' | 'current'};
export type Routine = {headId: string; title: string; habits: Habit[]};
/**
 * Every stack of two or more habits, as a routine. Session AH (HA4, N-134): one made from a template keeps the
 * template's name ("Morning routine"); any other is named by its first and last steps, never "Glass of water routine".
 */
export function routines(data: Pick<HabitData, 'habits'>): Routine[] {
  return stacksOf(data).map(chain => ({headId: chain[0]!.id, title: templateOfChain(chain.map(h => h.title))?.title ?? `${chain[0]!.title} → ${chain.at(-1)!.title}`, habits: chain}));
}
export function routineOf(data: Pick<HabitData, 'habits'>, headId: string): Routine | null {
  return routines(data).find(r => r.headId === headId) ?? null;
}
export function routineSteps(routine: Routine, run: RoutineRun | null, today: string): RoutineStep[] {
  return routine.habits.map((habit, index) => {
    const rule = habitRuleOn(habit, today) ?? habit.rules[0]!;
    const measurement = rule.measurement, duration = measurement.kind === 'duration';
    const minutes = measurement.kind === 'duration' ? (measurement.unit === 'hours' ? rule.target * 60 : rule.target) : null;
    const status: RoutineStep['status'] = run?.done.includes(habit.id) ? 'done' : run?.skipped.includes(habit.id) ? 'skipped' : run && run.step === index ? 'current' : 'pending';
    return {habit, index, duration, minutes, status};
  });
}
export function startRun(headId: string, day: string, at: Date): RoutineRun {
  return routineRunSchema.parse({version: 1, headId, day, step: 0, startedAt: at.toISOString(), stepStartedAt: at.toISOString(), done: [], skipped: []});
}
/** Moves past the current step as done or skipped; the step index points at the next habit, or past the end when finished. */
export function advanceRun(run: RoutineRun, habitId: string, outcome: 'done' | 'skipped', at: Date): RoutineRun {
  return routineRunSchema.parse({...run, step: run.step + 1, stepStartedAt: at.toISOString(), done: outcome === 'done' ? [...run.done, habitId] : run.done, skipped: outcome === 'skipped' ? [...run.skipped, habitId] : run.skipped});
}
export const runFinished = (routine: Routine, run: RoutineRun) => run.step >= routine.habits.length;
/** A run from another day, or of a stack that no longer exists, is stale: it reads as none. */
export function liveRun(store: RoutineRunStore, data: Pick<HabitData, 'habits'>, today: string): RoutineRun | null {
  const run = store.run;
  if (!run || run.day !== today) return null;
  return routineOf(data, run.headId) ? run : null;
}
/** Minutes elapsed on the current step from its own start time (a reload keeps it: stored time, not a ticking value). */
export const stepElapsedMinutes = (run: RoutineRun, now: Date) => Math.max(0, (now.getTime() - Date.parse(run.stepStartedAt)) / 60_000);
/** What the finish screen says: how many of the steps were done, and the first habit still due today, if any. */
export function finishSummary(routine: Routine, run: RoutineRun, today: string) {
  const done = run.done.length, total = routine.habits.length;
  const stillDue = routine.habits.filter(h => { const d = habitDay(h, today, today); return d.scheduled && d.status !== 'complete'; }).map(h => h.title);
  const minutes = Math.max(0, Math.round((Date.parse(run.stepStartedAt) - Date.parse(run.startedAt)) / 60_000));
  return {done, total, skipped: run.skipped.length, minutes, stillDue};
}
