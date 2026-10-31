import {expect, test} from 'vitest';
import {readStrong} from '../import/switch/strong';
import {addLiftWorkouts, type LiftWorkout, type LiftsPlan} from './import-lifts';
import {emptyWorkouts} from './schema';

/**
 * Session AK Part 15 (F4): a crafted export with tens of thousands of workouts used to take half a minute (every start
 * compared with every start, and the 3,000-workout limit checked only at the end). Now it is refused at the 3,001st.
 */
const T0 = Date.UTC(2000, 0, 1), dayOf = (iso: string) => iso.slice(0, 10), now = new Date('2026-10-30T00:00:00Z');
const workout = (i: number, startMs = T0 + i * 3 * 3_600_000): LiftWorkout => ({name: `W${i}`, startMs, endMs: null, exercises: [{name: 'Bench Press (Barbell)', sets: [{kind: 'normal', weightKg: 10, reps: 5}]}]});
const plan = (workouts: LiftWorkout[]): LiftsPlan => ({source: 'strong', label: 'Strong', workouts, warnings: []});

test('60,000 workouts are refused quickly, at the limit, and nothing is imported', () => {
  const started = performance.now();
  expect(() => addLiftWorkouts(emptyWorkouts(), plan(Array.from({length: 60_000}, (_, i) => workout(i))), {now, dayOf})).toThrow('ZIGoals keeps up to 3,000 workouts; you have 0 and this export adds more than 3000. Nothing was imported.');
  expect(performance.now() - started).toBeLessThan(1500);
});

test('the same from a crafted 60,000-row Strong CSV (the security review\'s input)', async () => {
  const rows = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE'];
  for (let i = 0; i < 60_000; i++) { const d = new Date(T0 + i * 3_600_000 * 3).toISOString(); rows.push(`${d.slice(0, 10)} ${d.slice(11, 19)},W${i},1h,Bench Press (Barbell),1,10,5,,,,,`); }
  const read = await readStrong(rows.join('\n'), {zone: 'UTC', weightUnit: 'kg'});
  const started = performance.now();
  expect(() => addLiftWorkouts(emptyWorkouts(), read, {now, dayOf})).toThrow(/up to 3,000 workouts.*Nothing was imported/);
  expect(performance.now() - started).toBeLessThan(1500);
}, 30_000);

test('exactly up to the limit is imported; workouts with nothing in them do not count toward it', () => {
  const empty: LiftWorkout = {name: 'Empty', startMs: T0 - 86_400_000, endMs: null, exercises: []};
  const r = addLiftWorkouts(emptyWorkouts(), plan([empty, ...Array.from({length: 3000}, (_, i) => workout(i))]), {now, dayOf});
  expect(r.added).toHaveLength(3000);
  expect(() => addLiftWorkouts(r.workouts, plan([workout(5000)]), {now, dayOf})).toThrow('ZIGoals keeps up to 3,000 workouts; you have 3000 and this export adds more than 0. Nothing was imported.');
});

test('a workout within two minutes of a strength workout already there is a duplicate, across bucket edges, and not beyond', () => {
  const base = addLiftWorkouts(emptyWorkouts(), plan([workout(0, T0 + 119_000)]), {now, dayOf});
  const r = addLiftWorkouts(base.workouts, plan([workout(1, T0 + 119_000 + 120_000), workout(2, T0 - 1_000), workout(3, T0 + 119_000 + 120_001), workout(4, T0 + 119_000 - 120_001)]), {now, dayOf});
  expect(r.duplicates).toBe(2);
  expect(r.added.map(w => w.name)).toEqual(['W3', 'W4']);
  // Within the same import too.
  const same = addLiftWorkouts(emptyWorkouts(), plan([workout(5, T0), workout(6, T0 + 60_000)]), {now, dayOf});
  expect([same.added.length, same.duplicates]).toEqual([1, 1]);
});
