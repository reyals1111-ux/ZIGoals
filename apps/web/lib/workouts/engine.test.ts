import {describe, expect, test} from 'vitest';
import {addExercise, addSet, discardWorkout, exerciseHistory, finishWorkout, inProgress, lastEntryFor, oneRepMax, personalBests, removeSet, saveTemplate, startWorkout, updateSet, weekSummary} from './engine';
import {EXERCISES, searchExercises} from './library';
import {emptyWorkouts, workoutsSchema, type Workouts} from './schema';

// Session AH Part 6 (DE8): the workout log. Fictional data.
const bench = EXERCISES.find(e => e.id === 'bench-press')!, plank = EXERCISES.find(e => e.id === 'plank')!;
const t = (iso: string) => new Date(iso);
function session(w: Workouts, date: string, weight: number, reps: number): Workouts {
  let x = startWorkout(w, {name: 'Push day', date, now: t(`${date}T08:00:00Z`)});
  x = addExercise(x, bench);
  const entry = inProgress(x)!.exercises[0]!, set = entry.sets[0]!;
  x = updateSet(x, entry.id, set.id, {weightKg: weight, reps, done: true});
  return finishWorkout(x, t(`${date}T08:45:00Z`)).workouts;
}
describe('the workout log', () => {
  test('start, log a set, finish: unticked sets are left out, minutes counted, one workout at a time', () => {
    let w = startWorkout(emptyWorkouts(), {date: '2026-10-01', now: t('2026-10-01T08:00:00Z')});
    expect(() => startWorkout(w, {date: '2026-10-01', now: t('2026-10-01T08:01:00Z')})).toThrow(/already in progress/);
    w = addExercise(w, bench); const e = inProgress(w)!.exercises[0]!;
    expect(() => finishWorkout(w, t('2026-10-01T08:30:00Z'))).toThrow(/Tick at least one/);
    w = updateSet(w, e.id, e.sets[0]!.id, {weightKg: 60, reps: 8, done: true}); w = addSet(w, e.id);
    const {workout} = finishWorkout(w, t('2026-10-01T08:40:00Z'));
    expect(workout.exercises[0]!.sets).toHaveLength(1); expect(workout.endedAt).toBe('2026-10-01T08:40:00.000Z');
    expect(workoutsSchema.safeParse(finishWorkout(w, t('2026-10-01T08:40:00Z')).workouts).success).toBe(true);
    expect(inProgress(discardWorkout(w))).toBeUndefined();
  });
  test('the previous sets prefill the next time; repeat and routines copy exercises and planned sets', () => {
    const w = session(emptyWorkouts(), '2026-10-01', 60, 8);
    expect(lastEntryFor(w, 'bench-press')!.sets[0]).toMatchObject({weightKg: 60, reps: 8});
    const next = addExercise(startWorkout(w, {date: '2026-10-03', now: t('2026-10-03T08:00:00Z')}), bench);
    expect(inProgress(next)!.exercises[0]!.sets[0]).toMatchObject({weightKg: 60, reps: 8, done: false});
    const routine = saveTemplate(w, w.workouts[0]!, 'Push', t('2026-10-01T09:00:00Z'));
    const fromRoutine = startWorkout(routine, {date: '2026-10-05', now: t('2026-10-05T08:00:00Z'), template: routine.templates[0]!});
    expect(inProgress(fromRoutine)!.exercises.map(e => [e.name, e.sets.length, e.sets[0]!.done])).toEqual([['Bench press', 1, false]]);
    const repeated = startWorkout(w, {date: '2026-10-05', now: t('2026-10-05T08:00:00Z'), repeat: w.workouts[0]!});
    expect(inProgress(repeated)!.name).toBe('Push day');
  });
  test('personal bests against earlier workouts; history keeps best set, estimated one-rep max and volume', () => {
    let w = session(emptyWorkouts(), '2026-10-01', 60, 8);
    w = session(w, '2026-10-03', 65, 6);
    const latest = w.workouts.find(x => x.date === '2026-10-03')!;
    expect(personalBests(w, latest).map(b => b.what)).toEqual(['weight', 'one-rep max']);
    const h = exerciseHistory(w, 'bench-press')!;
    expect(h.sessions).toHaveLength(2); expect(h.bestWeightKg).toBe(65); expect(h.bestOneRepMaxKg).toBeCloseTo(78, 0);
    expect(h.sessions[0]!.volumeKg).toBe(390);
    expect(oneRepMax(100, 1)).toBe(100); expect(oneRepMax(100, 20)).toBeNull();
    expect(personalBests(w, w.workouts.find(x => x.date === '2026-10-01')!)).toEqual([]);
  });
  test('timed exercises, removing a set, the week summary, search', () => {
    let w = startWorkout(emptyWorkouts(), {date: '2026-10-01', now: t('2026-10-01T08:00:00Z')});
    w = addExercise(w, plank); const e = inProgress(w)!.exercises[0]!;
    expect(e.sets[0]).not.toHaveProperty('weightKg');
    w = addSet(w, e.id); w = removeSet(w, e.id, inProgress(w)!.exercises[0]!.sets[1]!.id);
    w = updateSet(w, e.id, e.sets[0]!.id, {seconds: 60, done: true});
    w = finishWorkout(w, t('2026-10-01T08:10:00Z')).workouts;
    expect(weekSummary(w, '2026-10-01')).toMatchObject({workouts: 1, minutes: 10, sets: 1, volumeKg: 0});
    expect(searchExercises(EXERCISES, 'dumbbell incline').map(x => x.id)).toEqual(['incline-db-press']);
    expect(searchExercises(EXERCISES, 'legs').length).toBeGreaterThan(5);
  });
});
