import {describe, expect, it} from 'vitest';
import {workoutWeeks} from './weekly';
import {workoutsSchema} from './schema';

/** Session AV (owner follow-up 1, F-WORKOUT-WEEKS): 12 weeks of time, distance and weight lifted, Monday first. */
const workout = (id: string, date: string, minutes: number, exercises: unknown[], extra: Record<string, unknown> = {}) => ({id, name: 'Fictional', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T08:00:00.000Z`) + minutes * 60_000).toISOString(), exercises, ...extra});
const lift = {id: 'e1', exerciseId: 'bench', name: 'Bench press', measure: 'weight-reps', sets: [{id: 's1', kind: 'normal', reps: 5, weightKg: 60, done: true}, {id: 's2', kind: 'warmup', reps: 10, weightKg: 20, done: true}]};
const run = {id: 'e2', exerciseId: 'run', name: 'Run', measure: 'distance-time', sets: [{id: 's3', kind: 'normal', distanceKm: 5.2, seconds: 1800, done: true}]};
describe('Session AV (F-WORKOUT-WEEKS)', () => {
  const w = workoutsSchema.parse({version: 1, workouts: [workout('a', '2026-11-23', 45, [lift]), workout('b', '2026-11-24', 30, [run]), workout('c', '2026-11-17', 50, [], {imported: {source: 'gpx', importId: 'x1', sport: 'run', distanceKm: 10, durationSeconds: 3000}}), {...workout('d', '2026-11-25', 20, [lift]), endedAt: undefined}], templates: [], exercises: []});
  it('12 weeks, this week last; working sets only for weight; set and imported distance; unfinished left out', () => {
    const weeks = workoutWeeks(w, '2026-11-25');
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)).toEqual({start: '2026-11-23', end: '2026-11-29', workouts: 2, minutes: 75, distanceKm: 5.2, volumeKg: 300});
    expect(weeks.at(-2)).toEqual({start: '2026-11-16', end: '2026-11-22', workouts: 1, minutes: 50, distanceKm: 10, volumeKg: 0});
    expect(weeks[0]!.start).toBe('2026-09-07');
  });
});
