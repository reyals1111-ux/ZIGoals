import {describe, expect, test} from 'vitest';
import {addExercise, finishWorkout, startWorkout, updateSet} from './engine';
import {keepingRoutines, keepLastWeights, restoreRoutine, setKeepWeights} from './keep-weights';
import {emptyWorkouts, type Workouts} from './schema';
import {showcaseWorkouts} from './showcase';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #373, Bevel's Auto Update Template): a routine that keeps its last weights takes
 * the done sets' weights and reps of a workout started from it, set by set; Undo puts the routine back.
 */
const AT = new Date('2026-11-20T08:00:00.000Z'), DAY = '2026-11-20';
const base = (): Workouts => ({...emptyWorkouts(), templates: [{id: 'routine-a', name: 'Push day', type: 'strength', createdAt: AT.toISOString(), exercises: [
  {exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{kind: 'warmup', weightKg: 40, reps: 10}, {kind: 'normal', weightKg: 60, reps: 8}, {kind: 'normal', weightKg: 60, reps: 8}]},
  {exerciseId: 'plank', name: 'Plank', measure: 'time', sets: [{kind: 'normal', seconds: 30}]},
  {exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{kind: 'normal', weightKg: 80, reps: 5}]}]}]});
/** Starts the routine, ticks the sets with the given values (null: not done), and finishes. */
function train(w: Workouts, values: Record<string, ({weightKg?: number; reps?: number; seconds?: number} | null)[]>, extra = false) {
  let x = startWorkout(w, {date: DAY, now: AT, template: w.templates[0]!});
  if (extra) x = addExercise(x, {id: 'bicep-curl', name: 'Bicep curl', measure: 'weight-reps'});
  const current = x.workouts.find(y => !y.endedAt)!;
  for (const e of current.exercises) (values[e.exerciseId] ?? []).forEach((v, i) => { const set = e.sets[i]; if (set && v) x = updateSet(x, e.id, set.id, {...v, done: true}); });
  if (extra) { const curl = x.workouts.find(y => !y.endedAt)!.exercises.find(e => e.exerciseId === 'bicep-curl')!; x = updateSet(x, curl.id, curl.sets[0]!.id, {weightKg: 12, reps: 10, done: true}); }
  return finishWorkout(x, new Date(AT.getTime() + 3_600_000));
}

describe('keep my last weights', () => {
  test('off by default: nothing is written back', () => {
    const r = train(base(), {'bench-press': [{weightKg: 40, reps: 10}, {weightKg: 62.5, reps: 8}, {weightKg: 62.5, reps: 7}]});
    expect(keepLastWeights(r.workouts, r.workout)).toBeNull();
  });
  test('on: warm-ups into warm-ups, working sets into working sets; a set not done and an exercise left out keep theirs', () => {
    const w = setKeepWeights(base(), 'routine-a', true);
    expect(keepingRoutines(w).map(t => t.name)).toEqual(['Push day']);
    const r = train(w, {'bench-press': [{weightKg: 42.5, reps: 10}, {weightKg: 62.5, reps: 8}, null], plank: [{seconds: 45}]}, true);
    const kept = keepLastWeights(r.workouts, r.workout)!;
    expect(kept.changed).toBe(3);
    const t = kept.workouts.templates[0]!;
    expect(t.exercises.map(e => e.exerciseId)).toEqual(['bench-press', 'plank', 'squat']);
    expect(t.exercises[0]!.sets).toEqual([{kind: 'warmup', weightKg: 42.5, reps: 10}, {kind: 'normal', weightKg: 62.5, reps: 8}, {kind: 'normal', weightKg: 60, reps: 8}]);
    expect(t.exercises[1]!.sets).toEqual([{kind: 'normal', seconds: 45}]);
    expect(t.exercises[2]!.sets).toEqual([{kind: 'normal', weightKg: 80, reps: 5}]);
    expect(t.keepWeights).toBe(true);
    // Undo: the routine as it was.
    expect(restoreRoutine(kept.workouts, kept.before).templates[0]).toEqual(w.templates[0]);
  });
  test('the same weights as before change nothing; turning it off removes the flag', () => {
    const w = setKeepWeights(base(), 'routine-a', true);
    const r = train(w, {'bench-press': [{weightKg: 40, reps: 10}, {weightKg: 60, reps: 8}, {weightKg: 60, reps: 8}]});
    expect(keepLastWeights(r.workouts, r.workout)).toBeNull();
    expect(setKeepWeights(w, 'routine-a', false).templates[0]).not.toHaveProperty('keepWeights');
  });
  test('the Showcase keeps one labelled example: Leg day keeps its weights', () => {
    expect(keepingRoutines(showcaseWorkouts(DAY)).map(t => t.name)).toEqual(['Leg day']);
  });
});
