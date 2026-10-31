import {describe, expect, test} from 'vitest';
import {addWarmups, categoryLookup, defaultPlates, leaveSuperset, muscleFreshness, plateLoad, platesFor, restAfter, restFor, savePlates, setExerciseRest, setRpe, supersetLabels, supersetWithNext, warmupRamp, weeklyMuscleVolume, workingWeightKg} from './depth';
import {addExercise, finishWorkout, inProgress, saveTemplate, startWorkout, updateSet} from './engine';
import {allExercises, EXERCISES} from './library';
import {emptyWorkouts, workoutsSchema, type Workouts} from './schema';

// Session AK (4.9): the workout log's depth. Fictional data.
const ex = (id: string) => EXERCISES.find(e => e.id === id)!;
const t = (iso: string) => new Date(iso);
const lookup = categoryLookup(allExercises([]));
function threeExercises(): Workouts {
  let w = startWorkout(emptyWorkouts(), {date: '2026-10-05', now: t('2026-10-05T08:00:00Z')});
  for (const id of ['bench-press', 'barbell-row', 'plank']) w = addExercise(w, ex(id));
  return w;
}
const entries = (w: Workouts) => inProgress(w)!.exercises;
function logged(w: Workouts, date: string, ids: [string, number][], end = `${date}T09:00:00Z`): Workouts {
  let x = startWorkout(w, {date, now: t(`${date}T08:00:00Z`)});
  for (const [id, sets] of ids) {
    x = addExercise(x, ex(id));
    const e = inProgress(x)!.exercises.at(-1)!;
    x = updateSet(x, e.id, e.sets[0]!.id, {weightKg: 50, reps: 10, seconds: 60, done: true});
    for (let i = 1; i < sets; i++) { x = {...x, workouts: x.workouts.map(y => y.endedAt ? y : {...y, exercises: y.exercises.map(z => z.id === e.id ? {...z, sets: [...z.sets, {id: `set-${i}-${z.id}`, kind: 'normal' as const, weightKg: 50, reps: 10, seconds: 60, done: true}]} : z)})}; }
  }
  return finishWorkout(x, t(end)).workouts;
}

describe('RPE per set', () => {
  test('6 to 10 in half steps, removable; anything else is refused', () => {
    let w = threeExercises(); const e = entries(w)[0]!, s = e.sets[0]!;
    w = setRpe(w, e.id, s.id, 8.5);
    expect(entries(w)[0]!.sets[0]!.rpe).toBe(8.5);
    expect(() => setRpe(w, e.id, s.id, 7.3)).toThrow(/half steps/);
    expect(() => setRpe(w, e.id, s.id, 11)).toThrow(/6 to 10/);
    w = setRpe(w, e.id, s.id, null);
    expect('rpe' in entries(w)[0]!.sets[0]!).toBe(false);
  });
  test('an unreadable RPE in a stored log is dropped, never a reason to refuse the log', () => {
    const w = threeExercises(), raw = JSON.parse(JSON.stringify(w));
    raw.workouts[0].exercises[0].sets[0].rpe = 'hard';
    raw.workouts[0].exercises[0].supersetId = 'bad id!';
    raw.workouts[0].exercises[0].restSeconds = -4;
    const parsed = workoutsSchema.parse(raw).workouts[0]!.exercises[0]!;
    expect(parsed.sets[0]!.rpe).toBeUndefined(); expect(parsed.supersetId).toBeUndefined(); expect(parsed.restSeconds).toBeUndefined();
  });
});

describe('supersets', () => {
  test('join with the next, label A, leave; a superset of one ends', () => {
    let w = threeExercises(); const [a, b, c] = entries(w);
    w = supersetWithNext(w, a!.id);
    expect(entries(w)[0]!.supersetId).toBeTruthy();
    expect(entries(w)[1]!.supersetId).toBe(entries(w)[0]!.supersetId);
    expect([...supersetLabels(entries(w)).values()]).toEqual(['A', 'A']);
    w = supersetWithNext(w, b!.id); // the third joins the same group
    expect(new Set(entries(w).map(e => e.supersetId)).size).toBe(1);
    w = leaveSuperset(w, c!.id);
    expect(entries(w)[2]!.supersetId).toBeUndefined();
    w = leaveSuperset(w, a!.id);
    expect(entries(w).every(e => e.supersetId === undefined)).toBe(true);
    expect(() => supersetWithNext(w, c!.id)).toThrow(/another exercise after/);
  });
  test('in a superset the rest comes after the last exercise of the round', () => {
    let w = threeExercises(); const [a, b, c] = entries(w);
    w = setExerciseRest(w, b!.id, 150); w = supersetWithNext(w, a!.id);
    const x = inProgress(w)!;
    expect(restAfter(w, x, a!.id)).toBe(0);
    expect(restAfter(w, x, b!.id)).toBe(150);
    expect(restAfter(w, x, c!.id)).toBe(90);
  });
  test('supersets and rest times carry into a routine and back out', () => {
    let w = threeExercises(); const [a] = entries(w);
    w = supersetWithNext(w, a!.id); w = setExerciseRest(w, a!.id, 45);
    for (const e of entries(w)) w = updateSet(w, e.id, e.sets[0]!.id, {weightKg: 40, reps: 8, seconds: 30, done: true});
    const {workouts, workout} = finishWorkout(w, t('2026-10-05T09:00:00Z'));
    const saved = saveTemplate(workouts, workout, 'Pairs', t('2026-10-05T09:01:00Z'));
    expect(saved.templates[0]!.exercises[0]).toMatchObject({restSeconds: 45});
    expect(saved.templates[0]!.exercises[0]!.supersetId).toBe(saved.templates[0]!.exercises[1]!.supersetId);
    const again = startWorkout(saved, {date: '2026-10-07', now: t('2026-10-07T08:00:00Z'), template: saved.templates[0]});
    expect(entries(again)[0]).toMatchObject({restSeconds: 45});
    expect(entries(again)[0]!.supersetId).toBeTruthy();
  });
});

describe('rest per exercise', () => {
  test('its own time, or the workout-wide one; out of range refused', () => {
    let w = threeExercises(); const e = entries(w)[0]!;
    expect(restFor(w, e)).toBe(90);
    w = setExerciseRest(w, e.id, 0); expect(restFor(w, entries(w)[0]!)).toBe(0);
    w = setExerciseRest(w, e.id, null); expect(entries(w)[0]!.restSeconds).toBeUndefined();
    expect(() => setExerciseRest(w, e.id, 1000)).toThrow(/0 to 15 minutes/);
  });
});

describe('the plate calculator', () => {
  const kg = defaultPlates('kg'), lb = defaultPlates('lb');
  test('per side, fewest plates, exact when the plates allow', () => {
    expect(plateLoad(100, kg)).toEqual({perSide: [20, 20], total: 100, exact: true, belowBar: false});
    expect(plateLoad(62.5, kg)).toMatchObject({perSide: [20, 1.25], total: 62.5, exact: true});
    expect(plateLoad(225, lb)).toMatchObject({perSide: [45, 45], total: 225, exact: true});
    expect(plateLoad(20, kg)).toMatchObject({perSide: [], total: 20, exact: true, belowBar: false});
    expect(plateLoad(15, kg)).toMatchObject({perSide: [], total: 20, belowBar: true});
  });
  test('the nearest load when the target cannot be made; the lighter on a tie; limited plates respected', () => {
    expect(plateLoad(101, kg)).toMatchObject({total: 100, exact: false});
    expect(plateLoad(103, kg)).toMatchObject({total: 102.5, exact: false});
    const few = {unit: 'kg' as const, bar: 20, plates: [{size: 20, pairs: 1}, {size: 10, pairs: 1}]};
    expect(plateLoad(140, few)).toMatchObject({perSide: [20, 10], total: 80, exact: false});
    expect(plateLoad(40, {unit: 'kg', bar: 20, plates: []})).toMatchObject({total: 20, exact: false});
  });
  test('saving a bar and plates: kept in its unit, sorted; nonsense refused', () => {
    let w = savePlates(emptyWorkouts(), {unit: 'kg', bar: 15, plates: [{size: 5, pairs: 2}, {size: 10, pairs: 0}, {size: 20, pairs: 3}]});
    expect(w.plates).toEqual({unit: 'kg', bar: 15, plates: [{size: 20, pairs: 3}, {size: 5, pairs: 2}]});
    expect(platesFor(w, 'kg').bar).toBe(15); expect(platesFor(w, 'lb').bar).toBe(45);
    expect(() => savePlates(w, {unit: 'kg', bar: 150, plates: []})).toThrow(/bar weight/);
    w = {...w, plates: {unit: 'kg', bar: 'heavy' as never, plates: []}};
    expect(workoutsSchema.parse(w).plates).toBeUndefined();
  });
});

describe('the warm-up calculator', () => {
  const kg = defaultPlates('kg');
  test('bar × 10, 40 % × 5, 60 % × 3, 80 % × 1, rounded to the plates', () => {
    expect(warmupRamp(100, kg)).toEqual([{weight: 20, reps: 10}, {weight: 40, reps: 5}, {weight: 60, reps: 3}, {weight: 80, reps: 1}]);
    expect(warmupRamp(83, kg)).toEqual([{weight: 20, reps: 10}, {weight: 32.5, reps: 5}, {weight: 50, reps: 3}, {weight: 67.5, reps: 1}]);
  });
  test('light working weights drop steps that round to the bar or repeat; at or under the bar, none', () => {
    expect(warmupRamp(40, kg)).toEqual([{weight: 20, reps: 10}, {weight: 25, reps: 3}, {weight: 32.5, reps: 1}]);
    expect(warmupRamp(20, kg)).toEqual([]); expect(warmupRamp(Number.NaN, kg)).toEqual([]);
  });
  test('inserted before the working sets, replacing unticked warm-ups; only for weight and reps', () => {
    let w = threeExercises(); const e = entries(w)[0]!;
    w = updateSet(w, e.id, e.sets[0]!.id, {weightKg: 100, reps: 5});
    expect(workingWeightKg(entries(w)[0]!)).toBe(100);
    w = addWarmups(w, e.id, warmupRamp(100, kg).map(s => ({weightKg: s.weight, reps: s.reps})));
    expect(entries(w)[0]!.sets.map(s => [s.kind, s.weightKg, s.reps])).toEqual([['warmup', 20, 10], ['warmup', 40, 5], ['warmup', 60, 3], ['warmup', 80, 1], ['normal', 100, 5]]);
    w = addWarmups(w, e.id, [{weightKg: 50, reps: 5}]);
    expect(entries(w)[0]!.sets.map(s => s.kind)).toEqual(['warmup', 'normal']);
    expect(() => addWarmups(w, entries(w)[2]!.id, [{weightKg: 20, reps: 10}])).toThrow(/weight and reps/);
  });
});

describe('weekly volume per muscle group', () => {
  test('Monday to today; a full-body set counts for each group, its volume shared; warm-ups and cardio left out', () => {
    let w = logged(emptyWorkouts(), '2026-10-04', [['bench-press', 5]]); // Sunday: last week
    w = logged(w, '2026-10-06', [['bench-press', 3], ['squat', 2], ['kettlebell-swing', 1], ['running', 1]]);
    const {from, rows, unmapped} = weeklyMuscleVolume(w, lookup, '2026-10-08');
    expect(from).toBe('2026-10-05'); expect(unmapped).toBe(0);
    const row = (m: string) => rows.find(r => r.muscle === m)!;
    expect(row('Chest')).toEqual({muscle: 'Chest', sets: 3, volumeKg: 1500});
    expect(row('Legs')).toEqual({muscle: 'Legs', sets: 3, volumeKg: 1000 + 125});
    expect(row('Core')).toEqual({muscle: 'Core', sets: 1, volumeKg: 125});
    expect(row('Arms')).toEqual({muscle: 'Arms', sets: 0, volumeKg: 0});
  });
  test('an exercise with no known group is counted apart', () => {
    let w = logged(emptyWorkouts(), '2026-10-06', [['bench-press', 1]]);
    w = {...w, workouts: w.workouts.map(x => ({...x, exercises: x.exercises.map(e => ({...e, exerciseId: 'custom-gone'}))}))};
    expect(weeklyMuscleVolume(w, lookup, '2026-10-06').unmapped).toBe(1);
  });
});

describe('muscle freshness (an estimate)', () => {
  test('tired after training, recovering in a straight line over 6 days; never trained is unknown, not fresh', () => {
    const w = logged(emptyWorkouts(), '2026-10-06', [['squat', 5]], '2026-10-06T09:00:00Z');
    const at = (iso: string, today: string) => muscleFreshness(w, lookup, t(iso), today);
    expect(at('2026-10-06T09:00:00Z', '2026-10-06').find(r => r.muscle === 'Legs')).toEqual({muscle: 'Legs', lastDate: '2026-10-06', daysSince: 0, freshness: 40});
    expect(at('2026-10-09T09:00:00Z', '2026-10-09').find(r => r.muscle === 'Legs')).toMatchObject({daysSince: 3, freshness: 70});
    expect(at('2026-10-13T09:00:00Z', '2026-10-13').find(r => r.muscle === 'Legs')).toMatchObject({daysSince: 7, freshness: 100});
    expect(at('2026-10-06T09:00:00Z', '2026-10-06').find(r => r.muscle === 'Chest')).toEqual({muscle: 'Chest', lastDate: null, daysSince: null, freshness: null});
  });
  test('a session tires a group at most fully; two sessions add up, never below 0', () => {
    let w = logged(emptyWorkouts(), '2026-10-05', [['squat', 12]], '2026-10-05T09:00:00Z');
    w = logged(w, '2026-10-06', [['squat', 12]], '2026-10-06T09:00:00Z');
    expect(muscleFreshness(w, lookup, t('2026-10-06T09:00:00Z'), '2026-10-06').find(r => r.muscle === 'Legs')!.freshness).toBe(0);
  });
});
