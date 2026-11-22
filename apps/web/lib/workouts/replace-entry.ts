import {inProgress} from './engine';
import type {LibraryExercise} from './library';
import {workoutsSchema, type Workouts} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #241): the write behind "Replace" in a running workout, kept apart from the
 * alternatives (lib/workouts/replace.ts reads the written how-tos, which load only when Replace is opened). Pure.
 */
/** Replaces an exercise of the workout in progress by another, keeping its sets as typed, its note and its rest time. */
export function replaceInWorkout(w: Workouts, entryId: string, x: Pick<LibraryExercise, 'id' | 'name' | 'measure'>): Workouts {
  const current = inProgress(w);
  if (!current) throw Error('No workout is in progress.');
  const entry = current.exercises.find(e => e.id === entryId);
  if (!entry) throw Error('This exercise is no longer in the workout.');
  if (entry.measure !== x.measure) throw Error('Choose an exercise that records the same as this one.');
  if (current.exercises.some(e => e.id !== entryId && e.exerciseId === x.id)) throw Error(`${x.name} is already in this workout.`);
  return workoutsSchema.parse({...w, workouts: w.workouts.map(y => y.id === current.id ? {...y, exercises: y.exercises.map(e => e.id === entryId ? {...e, exerciseId: x.id, name: x.name} : e)} : y)});
}
