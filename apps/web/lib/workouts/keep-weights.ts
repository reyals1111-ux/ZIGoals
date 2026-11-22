import {setReady} from './engine';
import {workoutsSchema, type Workout, type Workouts, type WorkoutTemplate} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #373, Bevel's Auto Update Template): per routine, "Keep my last weights". When a
 * workout started from such a routine is finished, its done sets' weights and reps (and time, distance, added weight or
 * help, as the exercise measures) are written back into the routine, set by set — warm-ups into warm-ups, working sets into
 * working sets, in order — so the routine starts next time where you left off. The routine keeps its exercises, their
 * order and its number of sets: an exercise added during the workout is not added, one left out keeps its sets, and a set
 * not done keeps its values. A routine with a progression rule still starts at the rule's targets (lib/workouts/
 * progression.ts reads the history, not the routine). The caller offers Undo with the routine as it was. Pure.
 */
export function setKeepWeights(w: Workouts, routineId: string, on: boolean): Workouts {
  return workoutsSchema.parse({...w, templates: w.templates.map(t => {
    if (t.id !== routineId) return t;
    const rest: Record<string, unknown> = {...t}; delete rest.keepWeights;
    return on ? {...rest, keepWeights: true} : rest;
  })});
}
type RoutineSet = WorkoutTemplate['exercises'][number]['sets'][number];
const VALUE_KEYS = ['weightKg', 'reps', 'seconds', 'distanceKm', 'addedKg', 'assistKg'] as const;
/** The routine with the workout's done values written in, or null when the routine does not keep weights or nothing changed. */
export function keepLastWeights(w: Workouts, workout: Workout): {workouts: Workouts; before: WorkoutTemplate; changed: number} | null {
  const routine = workout.templateId ? w.templates.find(t => t.id === workout.templateId) : undefined;
  if (!routine?.keepWeights) return null;
  const used = new Set<string>();
  let changed = 0;
  const exercises = routine.exercises.map(rx => {
    const entry = workout.exercises.find(e => e.exerciseId === rx.exerciseId && !used.has(e.id));
    if (!entry) return rx;
    used.add(entry.id);
    const done = entry.sets.filter(s => s.done && setReady(entry.measure, s)), warm = done.filter(s => s.kind === 'warmup'), work = done.filter(s => s.kind !== 'warmup');
    let wi = 0, ni = 0;
    const sets = rx.sets.map((rs): RoutineSet => {
      const src = rs.kind === 'warmup' ? warm[wi++] : work[ni++];
      if (!src) return rs;
      const next: Record<string, unknown> = {...rs};
      for (const k of VALUE_KEYS) if (typeof src[k] === 'number') next[k] = src[k];
      if (VALUE_KEYS.some(k => next[k] !== rs[k])) changed++;
      return next as RoutineSet;
    });
    return {...rx, sets};
  });
  if (!changed) return null;
  return {workouts: workoutsSchema.parse({...w, templates: w.templates.map(t => t.id === routine.id ? {...routine, exercises} : t)}), before: routine, changed};
}
/** Undo: the routine as it was, where it still is (a routine removed since stays removed). */
export const restoreRoutine = (w: Workouts, before: WorkoutTemplate): Workouts => workoutsSchema.parse({...w, templates: w.templates.map(t => t.id === before.id ? before : t)});
/** The routines that keep their last weights. */
export const keepingRoutines = (w: Workouts) => w.templates.filter(t => t.keepWeights);
