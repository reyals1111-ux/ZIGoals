import {describe, expect, it} from 'vitest';
import {setBest, withEarlier} from './set-best';
import type {WorkoutSet} from './schema';

/** Session AV (owner follow-up 1, F-SET-BEST; Hevy): a ticked set against the bests of every earlier workout. */
const before = {bestWeightKg: 80, bestOneRepMaxKg: 96, mostReps: 20, longestSeconds: 60, farthestKm: 5};
const s = (patch: Partial<WorkoutSet>): WorkoutSet => ({id: 'set_1', kind: 'normal', done: true, ...patch});
describe('Session AV (F-SET-BEST)', () => {
  it('names the heaviest weight first, then a better estimated one-rep max', () => {
    expect(setBest('weight-reps', s({weightKg: 82.5, reps: 3}), before)).toBe('weight');
    expect(setBest('weight-reps', s({weightKg: 80, reps: 8}), before)).toBe('one-rep max'); // 80 × (1 + 8/30) ≈ 101
    expect(setBest('weight-reps', s({weightKg: 80, reps: 6}), before)).toBeNull(); // 96, equal is not a best
  });
  it('reps, time and distance; never for a warm-up, an unticked set or a first time', () => {
    expect(setBest('reps', s({reps: 21}), before)).toBe('reps');
    expect(setBest('time', s({seconds: 75}), before)).toBe('time');
    expect(setBest('distance-time', s({distanceKm: 5.2, seconds: 1500}), before)).toBe('distance');
    expect(setBest('weight-reps', s({weightKg: 90, reps: 5, kind: 'warmup'}), before)).toBeNull();
    expect(setBest('weight-reps', s({weightKg: 90, reps: 5, done: false}), before)).toBeNull();
    expect(setBest('weight-reps', s({weightKg: 90, reps: 5}), null)).toBeNull();
  });
  it('q3 #40: a second set equal to this workout\'s new best is not a second star', () => {
    const first = s({id: 'set_a', weightKg: 85, reps: 8}), second = s({id: 'set_b', weightKg: 85, reps: 8});
    expect(setBest('weight-reps', first, withEarlier(before, []))).toBe('weight');
    expect(setBest('weight-reps', second, withEarlier(before, [first]))).toBeNull();
    expect(setBest('weight-reps', s({id: 'set_c', weightKg: 87.5, reps: 5}), withEarlier(before, [first, second]))).toBe('weight');
    // A warm-up or an unticked set before it does not raise the bar.
    expect(setBest('weight-reps', second, withEarlier(before, [{...first, kind: 'warmup'}, {...first, done: false}]))).toBe('weight');
  });
});
