import {describe, expect, test} from 'vitest';
import {addLiftWorkouts} from '../../workouts/import-lifts';
import {emptyWorkouts} from '../../workouts/schema';
import {isStrongHeader, readStrong, strongDuration} from './strong';

// Session AK (A15): Strong's workout CSV. Fictional workouts.
const HEADER = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE';
const CSV = [HEADER,
  '2026-10-01 07:30:00,"Push day",1h 5m,"Bench Press (Barbell)",W,40,10,0,0,"","Felt good",',
  '2026-10-01 07:30:00,"Push day",1h 5m,"Bench Press (Barbell)",1,80,5,0,0,"","Felt good",8',
  '2026-10-01 07:30:00,"Push day",1h 5m,"Bench Press (Barbell)",2,"82,5",5,0,0,"","Felt good",8.5',
  '2026-10-01 07:30:00,"Push day",1h 5m,"Bench Press (Barbell)",Rest Timer,0,0,0,120,"","",',
  '2026-10-01 07:30:00,"Push day",1h 5m,"Push Up",1,0,20,0,0,"","",',
  '2026-10-01 07:30:00,"Push day",1h 5m,"=HYPERLINK(""x"") Cable Fly",1,15,12,0,0,"","",',
  '2026-10-03 18:00:00,"Run",30m,"Running",1,0,0,5,1800,"","",',
  '2026-10-03 18:00:00,"Run",30m,"Plank",1,0,0,0,60,"","",',
].join('\n');
const zone = 'Europe/Amsterdam';

describe('Strong CSV', () => {
  test('recognised by its header; durations in Strong’s words', () => {
    expect(isStrongHeader(HEADER)).toBe(true);
    expect(isStrongHeader('title,start_time,exercise_title')).toBe(false);
    expect([strongDuration('1h 5m'), strongDuration('45m'), strongDuration('50s'), strongDuration('1:05:00'), strongDuration('3600'), strongDuration('soon')]).toEqual([3900, 2700, 50, 3900, 3600, null]);
  });
  test('workouts, exercises and sets: warm-ups, decimal commas, RPE, rest-timer rows skipped, local time', async () => {
    const plan = await readStrong(CSV, {zone, weightUnit: 'kg'});
    expect(plan.workouts).toHaveLength(2);
    const [push, run] = plan.workouts;
    expect(new Date(push!.startMs).toISOString()).toBe('2026-10-01T05:30:00.000Z');
    expect(push!.endMs! - push!.startMs).toBe(3900_000);
    expect(push!.notes).toBe('Felt good');
    expect(push!.exercises.map(e => e.name)).toEqual(['Bench Press (Barbell)', 'Push Up', 'HYPERLINK("x") Cable Fly']);
    expect(push!.exercises[0]!.sets).toEqual([{kind: 'warmup', weightKg: 40, reps: 10}, {kind: 'normal', weightKg: 80, reps: 5, rpe: 8}, {kind: 'normal', weightKg: 82.5, reps: 5, rpe: 8.5}]);
    expect(run!.exercises[0]!.sets[0]).toEqual({kind: 'normal', distanceKm: 5, seconds: 1800});
    expect(plan.warnings.join(' ')).toMatch(/1 row is not a set/);
    expect(plan.warnings.join(' ')).toMatch(/read as kg/);
  });
  test('pounds from the header or the setting; semicolons; a unit column per row', async () => {
    const lb = await readStrong(CSV, {zone, weightUnit: 'lb'});
    expect(lb.workouts[0]!.exercises[0]!.sets[1]!.weightKg).toBeCloseTo(36.287, 3);
    const semi = ['Date;Workout Name;Duration;Exercise Name;Set Order;Weight (kg);Reps;Distance (meters);Seconds;Notes;Workout Notes;RPE',
      '2026-10-01 07:30:00;Legs;45m;Squat (Barbell);1;100,5;5;0;0;;;', '2026-10-02 07:30:00;Walk;45m;Walking;1;0;0;3000;2700;;;'].join('\n');
    const p = await readStrong(semi, {zone, weightUnit: 'lb'});
    expect(p.workouts[0]!.exercises[0]!.sets[0]).toEqual({kind: 'normal', weightKg: 100.5, reps: 5});
    expect(p.workouts[1]!.exercises[0]!.sets[0]).toEqual({kind: 'normal', distanceKm: 3, seconds: 2700});
    expect(p.warnings.join(' ')).not.toMatch(/read as/);
    const unitCol = [HEADER + ',Weight Unit', '2026-10-01 07:30:00,A,1h,Deadlift (Barbell),1,225,3,0,0,,,,lbs'].join('\n');
    expect((await readStrong(unitCol, {zone, weightUnit: 'kg'})).workouts[0]!.exercises[0]!.sets[0]!.weightKg).toBeCloseTo(102.058, 3);
  });
  test('refusals and skipped rows in plain words', async () => {
    await expect(readStrong('', {zone, weightUnit: 'kg'})).rejects.toThrow(/empty/);
    await expect(readStrong('a,b,c\n1,2,3', {zone, weightUnit: 'kg'})).rejects.toThrow(/not a Strong export/);
    await expect(readStrong(`${HEADER}\nnot a date,X,1h,Bench,1,1,1,0,0,,,`, {zone, weightUnit: 'kg'})).rejects.toThrow(/no sets/);
    await expect(readStrong('PK\u0003\u0004binary', {zone, weightUnit: 'kg'})).rejects.toThrow(/not CSV text/);
    const bad = await readStrong(`${CSV}\n2026-10-04 10:00:00,X,1h,Bench Press (Barbell),1,heavy,5,0,0,,,`, {zone, weightUnit: 'kg'});
    expect(bad.warnings.join(' ')).toMatch(/1 set has a number ZIGoals cannot read/);
  });
  test('added as finished strength workouts: library matches, new exercises, duplicates skipped on a second import', async () => {
    const plan = await readStrong(CSV, {zone, weightUnit: 'kg'});
    const dayOf = (iso: string) => iso.slice(0, 10);
    const first = addLiftWorkouts(emptyWorkouts(), plan, {now: new Date('2026-10-30T00:00:00Z'), dayOf});
    expect(first.added).toHaveLength(2);
    const push = first.added[0]!;
    expect(push).toMatchObject({name: 'Push day', type: 'strength', date: '2026-10-01', startedAt: '2026-10-01T05:30:00.000Z', endedAt: '2026-10-01T06:35:00.000Z'});
    expect(push.fileImport).toMatchObject({source: 'strong', durationSeconds: 3900});
    expect(push.exercises.map(e => [e.exerciseId, e.measure])).toEqual([['bench-press', 'weight-reps'], ['push-up', 'reps'], [expect.stringMatching(/^custom-/), 'weight-reps']]);
    expect(first.newExercises).toEqual(['HYPERLINK("x") Cable Fly']);
    expect(first.workouts.exercises[0]).toMatchObject({category: 'Chest'});
    expect(push.exercises[0]!.sets.every(s => s.done)).toBe(true);
    const again = addLiftWorkouts(first.workouts, plan, {now: new Date('2026-10-30T00:00:00Z'), dayOf});
    expect(again.added).toHaveLength(0); expect(again.duplicates).toBe(2);
    expect(again.workouts.exercises).toHaveLength(1);
  });
});
