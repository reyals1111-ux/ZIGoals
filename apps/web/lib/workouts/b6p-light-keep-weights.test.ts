import {describe, expect, test} from 'vitest';
import {addExercise, finishWorkout, inProgress, startWorkout} from './engine';
import {keepLastWeights} from './keep-weights';
import {setLight} from './r6-gym';
import {EXERCISES} from './library';
import {emptyWorkouts, workoutsSchema, type Workouts} from './schema';

/**
 * Review B6P-6 (Session AV lane 2, r6-body; LEDGER #421, #373): a light week can be marked while the workout is in
 * progress, and a routine that keeps your last weights then leaves the light week's weights out.
 */
const ROUTINE: Workouts = workoutsSchema.parse({...emptyWorkouts(), templates: [{id: 'r1', name: 'Legs', type: 'strength', createdAt: '2026-10-01T00:00:00.000Z', keepWeights: true,
  exercises: [{exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{kind: 'normal', reps: 5, weightKg: 100}]}]}]});
const started = () => startWorkout(ROUTINE, {date: '2026-11-22', now: new Date('2026-11-22T17:00:00.000Z'), template: ROUTINE.templates[0]!});
const lighter = (w: Workouts) => { const x = inProgress(w)!, e = x.exercises[0]!; return workoutsSchema.parse({...w, workouts: w.workouts.map(y => y.id !== x.id ? y : {...y, exercises: [{...e, sets: e.sets.map(s => ({...s, weightKg: 70, done: true}))}]})}); };
describe('B6P-6: Light week before finishing, and Keep my last weights', () => {
  test('a workout in progress can be marked a light week, and unmarked', () => {
    const w = started(), id = inProgress(w)!.id;
    expect(inProgress(setLight(w, id, true))!.light).toBe(true);
    expect(inProgress(setLight(setLight(w, id, true), id, false))!.light).toBeUndefined();
  });
  test('finishing a light week leaves the routine’s weights as they were; an ordinary week still keeps them', () => {
    const w = lighter(started()), id = inProgress(w)!.id;
    const light = finishWorkout(setLight(w, id, true), new Date('2026-11-22T18:00:00.000Z'));
    expect(keepLastWeights(light.workouts, light.workout)).toBeNull();
    const plain = finishWorkout(w, new Date('2026-11-22T18:00:00.000Z'));
    expect(keepLastWeights(plain.workouts, plain.workout)?.workouts.templates[0]!.exercises[0]!.sets[0]!.weightKg).toBe(70);
  });
  test('an exercise added to a light week is still a light week', () => {
    const w = started(), id = inProgress(w)!.id;
    expect(inProgress(addExercise(setLight(w, id, true), EXERCISES.find(e => e.id === 'squat')!))!.light).toBe(true);
  });
});
