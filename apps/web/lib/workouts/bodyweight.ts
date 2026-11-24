import {inProgress} from './engine';
import {workoutsSchema, type ExerciseEntry, type Workouts} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #201 and #202, Strong's units per exercise and assisted or weighted bodyweight): an
 * exercise's own unit (a machine in lb while the barbell is in kg; the sets stay in kilograms), and a reps exercise done
 * with added weight or with help. Pure; each returns a parsed record or throws a sentence.
 */
export type Unit = 'kg' | 'lb';
export const unitFor = (w: Workouts, exerciseId: string, fallback: Unit): Unit => w.exerciseUnits?.[exerciseId] ?? fallback;
/** Sets an exercise's unit; null goes back to the Health weight unit. */
export function setExerciseUnit(w: Workouts, exerciseId: string, unit: Unit | null): Workouts {
  const next = {...w.exerciseUnits};
  if (unit) next[exerciseId] = unit; else delete next[exerciseId];
  if (Object.keys(next).length > 300) throw Error('Up to 300 exercises can keep their own unit.');
  const {exerciseUnits: _u, ...rest} = w; void _u;
  return workoutsSchema.parse(Object.keys(next).length ? {...rest, exerciseUnits: next} : rest);
}
export const LOAD_WORDS: Record<NonNullable<ExerciseEntry['load']> | 'none', string> = {none: 'Body weight only', weighted: 'With added weight', assisted: 'Assisted (help taken off)'};
/** Sets how a reps exercise in the workout in progress is loaded; the other kind's values are cleared from its sets. */
export function setLoad(w: Workouts, entryId: string, load: ExerciseEntry['load'] | null): Workouts {
  const current = inProgress(w); if (!current) throw Error('No workout is in progress.');
  const entry = current.exercises.find(e => e.id === entryId); if (!entry) throw Error('This exercise is no longer in the workout.');
  if (entry.measure !== 'reps') throw Error('Only a reps exercise can take added weight or help.');
  const sets = entry.sets.map(s => { const {addedKg: a, assistKg: h, ...rest} = s; return load === 'weighted' ? {...rest, ...(a !== undefined ? {addedKg: a} : {})} : load === 'assisted' ? {...rest, ...(h !== undefined ? {assistKg: h} : {})} : rest; });
  const {load: _l, ...plain} = entry; void _l;
  const next: ExerciseEntry = {...plain, sets, ...(load ? {load} : {})};
  return workoutsSchema.parse({...w, workouts: w.workouts.map(x => x.id === current.id ? {...x, exercises: x.exercises.map(e => e.id === entryId ? next : e)} : x)});
}
