import {describe, expect, test} from 'vitest';
import {categoryLookup, MUSCLE_GROUPS, muscleFreshness} from '../workouts/depth';
import {addExercise, finishWorkout, inProgress, startWorkout, updateSet} from '../workouts/engine';
import {allExercises, EXERCISES} from '../workouts/library';
import {emptyWorkouts, type Workouts} from '../workouts/schema';
import {bandOf, BODY_HEADS, BODY_VIEWS, freshToday, freshTodayLine, freshnessWithRecovery, muscleRecoverySchema, recoveryDaysOf, setRecoveryDays, MUSCLE_RECOVERY, MUSCLE_RECOVERY_KEY} from './model';

// Session AK (item 8). Fictional workouts.
const lookup = categoryLookup(allExercises([]));
const ex = (id: string) => EXERCISES.find(e => e.id === id)!;
function logged(w: Workouts, date: string, ids: [string, number][], end = `${date}T09:00:00Z`): Workouts {
  let x = startWorkout(w, {date, now: new Date(`${date}T08:00:00Z`)});
  for (const [id, sets] of ids) {
    x = addExercise(x, ex(id));
    const e = inProgress(x)!.exercises.at(-1)!;
    x = updateSet(x, e.id, e.sets[0]!.id, {weightKg: 50, reps: 10, seconds: 60, done: true});
    for (let i = 1; i < sets; i++) x = {...x, workouts: x.workouts.map(y => y.endedAt ? y : {...y, exercises: y.exercises.map(z => z.id === e.id ? {...z, sets: [...z.sets, {id: `set-${i}-${z.id}`, kind: 'normal' as const, weightKg: 50, reps: 10, done: true}]} : z)})};
  }
  return finishWorkout(x, new Date(end)).workouts;
}
const byMuscle = (rows: ReturnType<typeof freshnessWithRecovery>) => Object.fromEntries(rows.map(r => [r.muscle, r.freshness]));

describe('freshness with the person’s recovery days', () => {
  const w = logged(logged(emptyWorkouts(), '2026-10-26', [['squat', 4], ['bench-press', 3]]), '2026-10-29', [['barbell-row', 5], ['plank', 1]]);
  const now = new Date('2026-10-30T09:00:00Z'), today = '2026-10-30';
  test('with no record (every group at 6 days) it is exactly the depth model', () => {
    expect(freshnessWithRecovery(w, lookup, now, today)).toEqual(muscleFreshness(w, lookup, now, today));
    expect(freshnessWithRecovery(w, lookup, now, today, {version: 1})).toEqual(muscleFreshness(w, lookup, now, today));
  });
  test('100 % less sets × 12 points, recovering linearly over the group’s days; unknown when never trained', () => {
    // Back: 5 sets = 60 points, 1 day of 6 gone → 50 left → 50 %. Legs: 4 sets = 48 points, 4 days of 6 gone → 16 left → 84 %.
    expect(byMuscle(freshnessWithRecovery(w, lookup, now, today))).toEqual({Chest: 88, Back: 50, Legs: 84, Shoulders: null, Arms: null, Core: 90});
    // Legs at 3 days are fully back after 4 days; back at 2 days is half back after 1.
    expect(byMuscle(freshnessWithRecovery(w, lookup, now, today, {version: 1, days: {Legs: 3, Back: 2}}))).toMatchObject({Legs: 100, Back: 70});
    // Back at 12 days: 60 × 11/12 = 55 left → 45 %.
    expect(byMuscle(freshnessWithRecovery(w, lookup, now, today, {version: 1, days: {Back: 12}})).Back).toBe(45);
  });
  test('a full session caps at 100 points; warm-ups do not tire a muscle; a future workout is ignored', () => {
    const heavy = logged(emptyWorkouts(), '2026-10-30', [['squat', 12]], '2026-10-30T09:00:00Z');
    expect(byMuscle(freshnessWithRecovery(heavy, lookup, new Date('2026-10-30T09:00:00Z'), '2026-10-30')).Legs).toBe(0);
    expect(byMuscle(freshnessWithRecovery(heavy, lookup, new Date('2026-10-30T09:00:00Z'), '2026-10-29')).Legs).toBeNull();
  });
  test('fresh today: at 90 % or more, most rested first, in plain words', () => {
    const rows = freshnessWithRecovery(w, lookup, now, today);
    expect(freshToday(rows)).toEqual(['core']);
    expect(freshTodayLine(rows)).toBe('Fresh today: core');
    expect(freshTodayLine(freshnessWithRecovery(w, lookup, new Date('2026-11-10T09:00:00Z'), '2026-11-10'))).toBe('Fresh today: chest, back, legs, core');
    expect(freshTodayLine(freshnessWithRecovery(emptyWorkouts(), lookup, now, today))).toBeNull();
  });
  test('bands have words', () => {
    expect([bandOf(null), bandOf(0), bandOf(49), bandOf(50), bandOf(89), bandOf(90), bandOf(100)]).toEqual(['unknown', 'tired', 'tired', 'recovering', 'recovering', 'fresh', 'fresh']);
  });
});

describe('the recovery days record', () => {
  test('a new loose, versioned key; bounded 1 to 14 days; 6 is the default and not stored', () => {
    expect(MUSCLE_RECOVERY_KEY).toBe('zigoals:muscle-recovery:v1'); expect(MUSCLE_RECOVERY.empty()).toEqual({version: 1});
    let r = setRecoveryDays({version: 1}, 'Legs', 8);
    expect(r).toEqual({version: 1, days: {Legs: 8}}); expect(recoveryDaysOf(r, 'Legs')).toBe(8); expect(recoveryDaysOf(r, 'Back')).toBe(6);
    r = setRecoveryDays(r, 'Legs', 6); expect(r).toEqual({version: 1});
    r = setRecoveryDays(setRecoveryDays(r, 'Arms', 3), 'Arms', null); expect(r).toEqual({version: 1});
    expect(() => setRecoveryDays({version: 1}, 'Legs', 0)).toThrow(/1 to 14/);
    expect(() => setRecoveryDays({version: 1}, 'Legs', 15)).toThrow(/1 to 14/);
    expect(() => setRecoveryDays({version: 1}, 'Legs', 2.5)).toThrow(/1 to 14/);
    expect(() => setRecoveryDays({version: 1}, 'Neck' as never, 3)).toThrow(/muscle group/);
  });
  test('unknown fields from a later build are kept; a bad value makes the record unreadable, never silently changed', () => {
    expect(muscleRecoverySchema.parse({version: 1, later: true, days: {Legs: 4, Glutes: 3}})).toEqual({version: 1, later: true, days: {Legs: 4, Glutes: 3}});
    expect(muscleRecoverySchema.safeParse({version: 1, days: {Legs: 40}}).success).toBe(false);
    expect(muscleRecoverySchema.safeParse({version: 2}).success).toBe(false);
  });
});

describe('the body diagram', () => {
  test('front and back show every group, each named once per view, inside the canvas', () => {
    const front = BODY_VIEWS[0]!, back = BODY_VIEWS[1]!;
    expect(new Set([...front.shapes, ...back.shapes].map(s => s.muscle))).toEqual(new Set(MUSCLE_GROUPS));
    for (const v of BODY_VIEWS) {
      expect(new Set(v.labels.map(l => l.muscle))).toEqual(new Set(v.shapes.map(s => s.muscle)));
      expect(v.labels.length).toBe(new Set(v.labels.map(l => l.muscle)).size);
      for (const s of v.shapes) { const [x0, x1, y1] = s.kind === 'rect' ? [s.x, s.x + s.w, s.y + s.h] : [s.cx - s.rx, s.cx + s.rx, s.cy + s.ry]; expect(x0).toBeGreaterThanOrEqual(0); expect(x1).toBeLessThanOrEqual(340); expect(y1).toBeLessThanOrEqual(230); }
      for (const l of v.labels) { expect(l.x).toBeGreaterThanOrEqual(0); expect(l.x).toBeLessThanOrEqual(340); expect(l.y + 12).toBeLessThanOrEqual(230); }
    }
    expect(BODY_HEADS).toHaveLength(2);
  });
});
