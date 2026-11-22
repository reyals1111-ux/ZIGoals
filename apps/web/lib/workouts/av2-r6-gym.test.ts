import {describe, expect, test} from 'vitest';
import {addExercise, exerciseHistory, inProgress, personalBests, startWorkout, volumeKg, weekSummary} from './engine';
import {targetFor} from './progression';
import {defaultsWords, favouritesFirst, setBestsFrom, setExerciseDefaults, setFavouriteExercise, setLight} from './r6-gym';
import {EXERCISES} from './library';
import {emptyWorkouts, workoutsSchema, type Workouts} from './schema';

/** Session AV lane 2, round 6 (r6-body; Caliber, LEDGER #420, #421, #422, #424): favourites, a light week, bests with their days, defaults. */
const lift = (id: string, date: string, kg: number, reps = 5, extra: Record<string, unknown> = {}) => ({id, name: 'Legs', date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`, templateId: 'r1',
  exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `${id}-s1`, kind: 'normal', reps, weightKg: kg, done: true}, {id: `${id}-s2`, kind: 'normal', reps, weightKg: kg, done: true}]}], ...extra});
const log = (...workouts: ReturnType<typeof lift>[]): Workouts => workoutsSchema.parse({...emptyWorkouts(), workouts,
  templates: [{id: 'r1', name: 'Legs', type: 'strength', createdAt: '2026-10-01T00:00:00.000Z', progression: {kind: 'linear', stepKg: 2.5}, exercises: [{exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{kind: 'normal', reps: 5, weightKg: 100}, {kind: 'normal', reps: 5, weightKg: 100}]}]}]});
const W = log(lift('w1', '2026-10-12', 100), lift('w2', '2026-10-19', 105), lift('w3', '2026-11-16', 80, 5, {light: true}));

describe('#421: a light week is left out of the bests, never the history or the volume', () => {
  test('the bests, their days and the light weeks left out', () => {
    const h = exerciseHistory(W, 'squat')!;
    expect(h.sessions).toHaveLength(3);
    expect(h.sessions.map(s => s.counts)).toEqual([false, true, true]);
    expect(h).toMatchObject({bestWeightKg: 105, bestDays: {bestWeightKg: '2026-10-19'}, lightLeftOut: 1, before: null, from: null});
    expect(weekSummary(W, '2026-11-22').volumeKg).toBe(800);
    expect(volumeKg(W.workouts[2]!.exercises[0]!)).toBe(800);
  });
  test('no "new best" in a light week, and a light week is not one to beat', () => {
    const heavyAfterLight = log(lift('w1', '2026-10-12', 100), lift('w2', '2026-11-16', 120, 5, {light: true}), lift('w3', '2026-11-20', 110));
    expect(personalBests(heavyAfterLight, heavyAfterLight.workouts[1]!)).toEqual([]);
    expect(personalBests(heavyAfterLight, heavyAfterLight.workouts[2]!).map(b => b.what)).toEqual(['weight', 'one-rep max']);
  });
  test('the progression and a new exercise’s first sets build on the last workout that counts', () => {
    expect(targetFor(W, W.templates[0]!, 'squat')?.sets[0]).toEqual({weightKg: 107.5, reps: 5});
    const started = addExercise(startWorkout(W, {date: '2026-11-22', now: new Date('2026-11-22T17:00:00.000Z')}), EXERCISES.find(e => e.id === 'squat')!);
    expect(inProgress(started)!.exercises[0]!.sets.map(s => s.weightKg)).toEqual([105, 105]);
  });
  test('a workout can be a light week (in progress too, review B6P-6); turning it off counts it again', () => {
    expect(exerciseHistory(setLight(W, 'w3', false), 'squat')!.lightLeftOut).toBe(0);
    expect(setLight(W, 'w1', true).workouts[0]!.light).toBe(true);
    expect(() => setLight(W, 'nope', true)).toThrow('This workout is no longer here.');
  });
});

describe('#422: bests with their days, and a fresh start', () => {
  test('"Count bests from today" for one exercise: earlier bests kept as before; the history kept', () => {
    const w = setBestsFrom(log(lift('w1', '2026-10-12', 120), lift('w2', '2026-11-20', 90)), 'squat', '2026-11-01');
    const h = exerciseHistory(w, 'squat')!;
    expect(h).toMatchObject({bestWeightKg: 90, bestDays: {bestWeightKg: '2026-11-20'}, from: '2026-11-01', before: {bestWeightKg: 120}});
    expect(h.sessions).toHaveLength(2);
    expect(personalBests(w, w.workouts[1]!)).toEqual([]); // the first workout after a fresh start sets the first best
    const later = workoutsSchema.parse({...w, workouts: [...w.workouts, lift('w3', '2026-11-22', 95)]});
    expect(personalBests(later, later.workouts[2]!).map(b => b.what)).toContain('weight');
  });
  test('for every exercise, and back to every workout', () => {
    const w = setBestsFrom(log(lift('w1', '2026-10-12', 120)), '*', '2026-11-01');
    expect(exerciseHistory(w, 'squat')).toMatchObject({bestWeightKg: null, from: '2026-11-01', before: {bestWeightKg: 120}});
    expect('bestsFrom' in setBestsFrom(w, '*', null)).toBe(false);
  });
  test('a tie keeps the day the best was first set', () => {
    expect(exerciseHistory(log(lift('w1', '2026-10-12', 100), lift('w2', '2026-10-19', 100)), 'squat')!.bestDays.bestWeightKg).toBe('2026-10-12');
  });
});

describe('#420: favourite exercises', () => {
  test('starred ones come first, in the order starred', () => {
    let w = setFavouriteExercise(setFavouriteExercise(emptyWorkouts(), 'deadlift', true), 'bench-press', true);
    const {favourites, rest} = favouritesFirst(EXERCISES.slice(0, 8), w);
    expect(favourites.map(x => x.id)).toEqual(['deadlift', 'bench-press']);
    expect(rest).toHaveLength(6);
    w = setFavouriteExercise(w, 'deadlift', false);
    expect(w.favouriteExercises).toEqual(['bench-press']);
    expect('favouriteExercises' in setFavouriteExercise(w, 'bench-press', false)).toBe(false);
  });
});

describe('#424: an exercise’s own defaults', () => {
  test('used when it has no earlier sets; earlier values still win', () => {
    const w = setExerciseDefaults(setExerciseDefaults(emptyWorkouts(), 'squat', {sets: 3, reps: 8, restSeconds: 120}), 'plank', {sets: 3, seconds: 45});
    expect(defaultsWords(w.exerciseDefaults!.squat!)).toBe('3 × 8, 2 min rest');
    expect(defaultsWords(w.exerciseDefaults!.plank!)).toBe('3 × 45 s');
    let started = startWorkout(w, {date: '2026-11-22', now: new Date('2026-11-22T17:00:00.000Z')});
    started = addExercise(addExercise(started, EXERCISES.find(e => e.id === 'squat')!), EXERCISES.find(e => e.id === 'plank')!);
    const [squat, plank] = inProgress(started)!.exercises;
    expect(squat!.sets.map(s => s.reps)).toEqual([8, 8, 8]); expect(squat!.restSeconds).toBe(120);
    expect(plank!.sets.map(s => s.seconds)).toEqual([45, 45, 45]); expect(plank!.restSeconds).toBeUndefined();
    const withHistory = workoutsSchema.parse({...log(lift('w1', '2026-10-12', 100)), exerciseDefaults: w.exerciseDefaults});
    const again = addExercise(startWorkout(withHistory, {date: '2026-11-22', now: new Date('2026-11-22T17:00:00.000Z')}), EXERCISES.find(e => e.id === 'squat')!);
    expect(inProgress(again)!.exercises[0]!.sets.map(s => [s.reps, s.weightKg])).toEqual([[5, 100], [5, 100]]);
  });
  test('says a sentence for values out of range; null removes them', () => {
    expect(() => setExerciseDefaults(emptyWorkouts(), 'squat', {sets: 0})).toThrow('Choose 1 to 20 sets');
    expect(() => setExerciseDefaults(emptyWorkouts(), 'squat', {sets: 3, reps: 500})).toThrow('Choose 1 to 20 sets');
    expect('exerciseDefaults' in setExerciseDefaults(setExerciseDefaults(emptyWorkouts(), 'squat', {sets: 3}), 'squat', null)).toBe(false);
  });
});
