import {describe, expect, test} from 'vitest';
import {addExercise, exerciseHistory, finishWorkout, personalBests, saveTemplate, startWorkout, updateSet, volumeKg} from './engine';
import {setExerciseUnit, setLoad, unitFor} from './bodyweight';
import {setBest, withEarlier} from './set-best';
import {emptyWorkouts, workoutsSchema} from './schema';
import {setText} from '../../components/health/workouts/units';

/** Session AV lane 2 (body; LEDGER #201, #202; Strong): a unit per exercise; assisted and weighted bodyweight, read the right way round. */
const set = (id: string, reps: number, extra: {addedKg?: number; assistKg?: number}) => ({id, kind: 'normal', reps, done: true, ...extra});
const session = (id: string, date: string, load: 'weighted' | 'assisted', sets: ReturnType<typeof set>[]) => ({id, name: 'Fictional', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T09:00:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: load === 'weighted' ? 'dip' : 'pull-up', name: load === 'weighted' ? 'Dip' : 'Pull-up', measure: 'reps', load, sets}]});
describe('assisted and weighted bodyweight', () => {
  const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [
    session('a', '2026-11-01', 'assisted', [set('a1', 8, {assistKg: 30}), set('a2', 8, {assistKg: 25})]), session('b', '2026-11-08', 'assisted', [set('b1', 8, {assistKg: 20})]),
    session('c', '2026-11-01', 'weighted', [set('c1', 6, {addedKg: 10})]), session('d', '2026-11-08', 'weighted', [set('d1', 6, {addedKg: 15}), set('d2', 6, {addedKg: 15})])]});
  test('less help is the best; more added weight is the best; volume counts added weight only', () => {
    expect(exerciseHistory(w, 'pull-up')).toMatchObject({leastAssistKg: 20, bestAddedKg: null, load: 'assisted'});
    expect(exerciseHistory(w, 'dip')).toMatchObject({bestAddedKg: 15, leastAssistKg: null, load: 'weighted'});
    expect(personalBests(w, w.workouts.find(x => x.id === 'b')!).map(b => [b.what, b.value])).toEqual([['least help', 20]]);
    expect(personalBests(w, w.workouts.find(x => x.id === 'd')!).map(b => [b.what, b.value])).toEqual([['added weight', 15]]);
    expect(volumeKg(w.workouts.find(x => x.id === 'd')!.exercises[0]!)).toBe(180);
    expect(volumeKg(w.workouts.find(x => x.id === 'b')!.exercises[0]!)).toBe(0);
  });
  test('the set-row star: less help or more added weight than before, once per best', () => {
    const before = exerciseHistory(w, 'pull-up');
    expect(setBest('reps', {id: 'x', kind: 'normal', reps: 8, assistKg: 15, done: true}, before)).toBe('least help');
    expect(setBest('reps', {id: 'x', kind: 'normal', reps: 8, assistKg: 25, done: true}, before)).toBeNull();
    const earlier = [{id: 'y', kind: 'normal' as const, reps: 8, assistKg: 15, done: true}];
    expect(setBest('reps', {id: 'x', kind: 'normal', reps: 8, assistKg: 15, done: true}, withEarlier(before, earlier))).toBeNull();
    expect(setBest('reps', {id: 'x', kind: 'normal', reps: 6, addedKg: 20, done: true}, exerciseHistory(w, 'dip'))).toBe('added weight');
  });
  test('setLoad switches the kind and clears the other kind\'s values; routines and the next session keep the load', () => {
    let x = startWorkout(emptyWorkouts(), {date: '2026-11-20', now: new Date('2026-11-20T08:00:00Z')});
    x = addExercise(x, {id: 'pull-up', name: 'Pull-up', measure: 'reps'});
    const entry = x.workouts[0]!.exercises[0]!;
    x = setLoad(x, entry.id, 'assisted');
    x = updateSet(x, entry.id, entry.sets[0]!.id, {reps: 6, assistKg: 25, done: true});
    expect(x.workouts[0]!.exercises[0]).toMatchObject({load: 'assisted', sets: [{assistKg: 25}]});
    const switched = setLoad(x, entry.id, 'weighted');
    expect(switched.workouts[0]!.exercises[0]!.sets[0]!.assistKg).toBeUndefined();
    const done = finishWorkout(x, new Date('2026-11-20T09:00:00Z'));
    const routine = saveTemplate(done.workouts, done.workout, 'Pulls', new Date('2026-11-20T09:00:00Z')).templates[0]!;
    expect(routine.exercises[0]).toMatchObject({load: 'assisted', sets: [{assistKg: 25}]});
    const next = addExercise(startWorkout(done.workouts, {date: '2026-11-21', now: new Date('2026-11-21T08:00:00Z')}), {id: 'pull-up', name: 'Pull-up', measure: 'reps'});
    expect(next.workouts.at(-1)!.exercises[0]).toMatchObject({load: 'assisted', sets: [{reps: 6, assistKg: 25}]});
    expect(() => setLoad(next, next.workouts.at(-1)!.exercises[0]!.id.replace(/./, 'z'), 'weighted')).toThrow('no longer in the workout');
  });
  test('the set in words', () => {
    expect(setText('reps', {reps: 8, addedKg: 10}, 'kg')).toBe('8 reps +10 kg');
    expect(setText('reps', {reps: 8, assistKg: 20}, 'kg')).toBe('8 reps, 20 kg help');
    expect(setText('reps', {reps: 8}, 'kg')).toBe('8 reps');
  });
});
describe('a unit per exercise', () => {
  test('an exercise keeps its own unit; the rest follow Health; null goes back', () => {
    const w = setExerciseUnit(emptyWorkouts(), 'leg-press', 'lb');
    expect(unitFor(w, 'leg-press', 'kg')).toBe('lb');
    expect(unitFor(w, 'squat', 'kg')).toBe('kg');
    expect(setExerciseUnit(w, 'leg-press', null).exerciseUnits).toBeUndefined();
  });
});
