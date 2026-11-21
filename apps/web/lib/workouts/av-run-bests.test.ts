import {describe, expect, it} from 'vitest';
import {clockOf, runBests} from './run-bests';
import {workoutsSchema} from './schema';
import {splitsRecordSchema} from './splits-schema';

/** Session AV (owner follow-up 1, F-RUN-BESTS): bests from whole kilometres in a row; the longest from any distance. */
const workout = (id: string, date: string, extra: Record<string, unknown> = {}) => ({id, name: `Fictional run ${id}`, date, type: 'cardio', startedAt: `${date}T07:00:00.000Z`, endedAt: `${date}T08:00:00.000Z`, exercises: [], ...extra});
const km = (n: number, seconds: number, meters = 1000) => ({km: n, meters, seconds});
describe('Session AV (F-RUN-BESTS)', () => {
  const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: [workout('a', '2026-11-02'), workout('b', '2026-11-09'), workout('c', '2026-11-16', {exercises: [{id: 'e', exerciseId: 'run', name: 'Run', measure: 'distance-time', sets: [{id: 's', kind: 'normal', distanceKm: 12.4, seconds: 4000, done: true}]}]})]});
  const splits = splitsRecordSchema.parse({version: 1, workouts: {
    a: {source: 'gpx', paceSecondsPerKm: 330, splits: [km(1, 340), km(2, 320), km(3, 330), km(4, 310), km(5, 335), km(6, 200, 500)]},
    b: {source: 'tcx', paceSecondsPerKm: 300, splits: [km(1, 300), km(2, 295), km(3, 305), km(4, 298), km(5, 302), km(6, 290), km(7, 310), km(8, 300), km(9, 299), km(10, 301)]},
  }});
  it('the fastest 1, 5 and 10 km from whole kilometres in a row, and the longest from any distance', () => {
    const r = runBests(w, splits);
    expect(r.timed).toEqual([
      {km: 1, seconds: 290, workoutId: 'b', date: '2026-11-09', name: 'Fictional run b'},
      {km: 5, seconds: 1490, workoutId: 'b', date: '2026-11-09', name: 'Fictional run b'},
      {km: 10, seconds: 3000, workoutId: 'b', date: '2026-11-09', name: 'Fictional run b'},
    ]);
    expect(r.longest).toEqual({km: 12.4, workoutId: 'c', date: '2026-11-16', name: 'Fictional run c'});
    expect(r.withSplits).toBe(2);
  });
  it('a short last split never counts as a whole kilometre; no splits, no timed bests', () => {
    expect(runBests(w, null).timed).toEqual([]);
    expect(clockOf(290)).toBe('4:50'); expect(clockOf(3725)).toBe('1:02:05');
  });
});
