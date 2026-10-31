import {describe, expect, test} from 'vitest';
import {addLiftWorkouts, guessCategory, liftWallClock, matchExercise, safeLine} from '../../workouts/import-lifts';
import {EXERCISES} from '../../workouts/library';
import {emptyWorkouts} from '../../workouts/schema';
import {isHevyHeader, readHevy} from './hevy';

// Session AK (A15): Hevy's workouts CSV. Fictional workouts.
const HEADER = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';
const row = (cells: (string | number)[]) => cells.map(c => typeof c === 'number' ? String(c) : `"${c.replace(/"/g, '""')}"`).join(',');
const CSV = [HEADER,
  row(['Upper', '1 Oct 2026, 18:03', '1 Oct 2026, 19:10', 'Good session', 'Bench Press (Barbell)', '', 'Grip wide', 0, 'warmup', 40, 10, '', '', '']),
  row(['Upper', '1 Oct 2026, 18:03', '1 Oct 2026, 19:10', 'Good session', 'Bench Press (Barbell)', '', 'Grip wide', 1, 'normal', 80, 6, '', '', 9]),
  row(['Upper', '1 Oct 2026, 18:03', '1 Oct 2026, 19:10', 'Good session', 'Bicep Curl (Dumbbell)', 0, '', 0, 'normal', 14, 10, '', '', '']),
  row(['Upper', '1 Oct 2026, 18:03', '1 Oct 2026, 19:10', 'Good session', 'Triceps Pushdown', 0, '', 0, 'dropset', 30, 12, '', '', 7.3]),
  row(['Upper', '1 Oct 2026, 18:03', '1 Oct 2026, 19:10', 'Good session', 'Triceps Pushdown', 0, '', 1, 'mystery', 25, 10, '', '', '']),
  row(['Cardio', '2 Oct 2026, 07:00', '2 Oct 2026, 07:30', '', 'Treadmill', '', '', 0, 'normal', '', '', 4.2, 1800, '']),
].join('\r\n');
const zone = 'UTC';

describe('Hevy CSV', () => {
  test('recognised by its header', () => {
    expect(isHevyHeader(HEADER)).toBe(true);
    expect(isHevyHeader('Date,Workout Name,Exercise Name,Set Order')).toBe(false);
  });
  test('workouts with set types, supersets, RPE (only 6–10 in half steps), notes and end times', async () => {
    const plan = await readHevy(CSV, {zone});
    expect(plan.workouts).toHaveLength(2);
    const [upper, cardio] = plan.workouts;
    expect(new Date(upper!.startMs).toISOString()).toBe('2026-10-01T18:03:00.000Z');
    expect((upper!.endMs! - upper!.startMs) / 60_000).toBe(67);
    expect(upper!.exercises.map(e => [e.name, e.supersetKey, e.sets.map(s => s.kind)])).toEqual([
      ['Bench Press (Barbell)', undefined, ['warmup', 'normal']], ['Bicep Curl (Dumbbell)', '0', ['normal']], ['Triceps Pushdown', '0', ['drop', 'normal']]]);
    expect(upper!.exercises[0]!.note).toBe('Grip wide');
    expect(upper!.exercises[0]!.sets[1]).toEqual({kind: 'normal', weightKg: 80, reps: 6, rpe: 9});
    expect(upper!.exercises[2]!.sets[0]!.rpe).toBeUndefined();
    expect(cardio!.exercises[0]!.sets[0]).toEqual({kind: 'normal', distanceKm: 4.2, seconds: 1800});
    expect(plan.warnings.join(' ')).toMatch(/1 set has a set type ZIGoals does not know/);
  });
  test('pounds and miles columns', async () => {
    const csv = [HEADER.replace('weight_kg', 'weight_lbs').replace('distance_km', 'distance_miles'),
      row(['A', '2026-10-01 08:00:00', '', '', 'Squat (Barbell)', '', '', 0, 'normal', 225, 5, '', '', '']),
      row(['A', '2026-10-01 08:00:00', '', '', 'Running', '', '', 0, 'normal', '', '', 1, 600, ''])].join('\n');
    const [a] = (await readHevy(csv, {zone})).workouts;
    expect(a!.exercises[0]!.sets[0]!.weightKg).toBeCloseTo(102.058, 3);
    expect(a!.exercises[1]!.sets[0]!.distanceKm).toBeCloseTo(1.609, 3);
    expect(a!.endMs).toBeNull();
  });
  test('refusals', async () => {
    await expect(readHevy('x,y\n1,2', {zone})).rejects.toThrow(/not a Hevy workouts export/);
    await expect(readHevy(`${HEADER}\n${row(['A', 'yesterday', '', '', 'Squat', '', '', 0, 'normal', 1, 1, '', '', ''])}`, {zone})).rejects.toThrow(/no sets/);
  });
  test('added with the superset kept as one group; an unmatched exercise gets a guessed muscle group', async () => {
    const plan = await readHevy(CSV, {zone});
    const r = addLiftWorkouts(emptyWorkouts(), plan, {now: new Date('2026-10-30T00:00:00Z'), dayOf: iso => iso.slice(0, 10)});
    const upper = r.added[0]!;
    expect(upper.exercises[0]!.exerciseId).toBe('bench-press');
    expect(upper.exercises[1]!.supersetId).toBeTruthy();
    expect(upper.exercises[1]!.supersetId).toBe(upper.exercises[2]!.supersetId);
    expect(upper.exercises[0]!.supersetId).toBeUndefined();
    expect(upper.exercises[2]!.exerciseId).toBe('triceps-pushdown');
    expect(r.workouts.exercises.find(e => e.name === 'Treadmill')).toMatchObject({category: 'Cardio', measure: 'distance-time'});
    expect(r.workouts.exercises.find(e => e.name === 'Bicep Curl (Dumbbell)')).toMatchObject({category: 'Arms'});
  });
  test('a workout already logged in ZIGoals within two minutes is a duplicate; a future one is left out', async () => {
    const plan = await readHevy(CSV, {zone});
    const mine = {...emptyWorkouts(), workouts: [{id: 'workout-mine', name: 'Upper', date: '2026-10-01', type: 'strength' as const, startedAt: '2026-10-01T18:04:30.000Z', endedAt: '2026-10-01T19:00:00.000Z', exercises: []}]};
    const r = addLiftWorkouts(mine, plan, {now: new Date('2026-10-01T23:00:00Z'), dayOf: iso => iso.slice(0, 10)});
    expect(r.duplicates).toBe(1); expect(r.future).toBe(1); expect(r.added).toHaveLength(0);
  });
});

describe('the shared pieces', () => {
  test('dates in both apps’ words; impossible dates refused', () => {
    expect(liftWallClock('1 Oct 2026, 18:03')).toEqual({date: '2026-10-01', clock: '18:03'});
    expect(liftWallClock('2026-10-01 7:05:09')).toEqual({date: '2026-10-01', clock: '07:05'});
    expect(liftWallClock('31 Feb 2026, 10:00')).toBeNull();
    expect(liftWallClock('2026-13-01 10:00')).toBeNull();
  });
  test('names: formula starts and control characters removed', () => {
    expect(safeLine('=cmd|calc\u0007 Row', 80)).toBe('cmd|calc Row');
    expect(safeLine('  +-@Bench', 80)).toBe('Bench');
    expect(safeLine('Leg press', 80)).toBe('Leg press');
  });
  test('exercise matching and category guesses', () => {
    expect(matchExercise('Squat (Barbell)', EXERCISES)?.id).toBe('squat');
    expect(matchExercise('Pull Up', EXERCISES)?.id).toBe('pull-up');
    expect(matchExercise('Bench Press (Dumbbell)', EXERCISES)).toBeNull();
    expect(['Hanging Knee Raise', 'Leg Curl (Machine)', 'Seated Row', 'Arnold Press', 'Incline Fly', 'Stair Climber', 'Mystery Move'].map(guessCategory))
      .toEqual(['Core', 'Legs', 'Back', 'Shoulders', 'Chest', 'Cardio', 'Full body']);
  });
});
