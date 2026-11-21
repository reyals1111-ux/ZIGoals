import {describe, expect, it} from 'vitest';
import {bestLabel, clockOf, HALF_MARATHON_KM, runBests} from './run-bests';
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
  it('q3 #13: a ride, a swim or a cycling set never becomes the longest run; a file counts when its sport is a run', () => {
    const ride = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: [
      workout('ride', '2026-11-10', {name: 'Evening ride', imported: {source: 'gpx', importId: 'ride-1', sport: 'Biking', distanceKm: 42, durationSeconds: 5400}}),
      workout('bike', '2026-11-11', {name: 'Indoor bike', exercises: [{id: 'e', exerciseId: 'cycling', name: 'Cycling', measure: 'distance-time', sets: [{id: 's', kind: 'normal', distanceKm: 30, seconds: 3600, done: true}]}]}),
      workout('run', '2026-11-12', {name: 'Easy run', fileImport: {source: 'fit', importId: 'run-1', sport: 'running', distanceKm: 10}}),
    ]});
    expect(runBests(ride, null).longest).toEqual({km: 10, workoutId: 'run', date: '2026-11-12', name: 'Easy run'});
  });
  it('q3 #13: the half marathon from 21 whole kilometres in a row and the next 97.5 m at that split’s pace', () => {
    const long = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: [workout('h', '2026-11-20')]});
    const s = splitsRecordSchema.parse({version: 1, workouts: {h: {source: 'gpx', paceSecondsPerKm: 300, splits: [...Array.from({length: 21}, (_, i) => km(i + 1, 300)), km(22, 150, 500)]}}});
    const half = runBests(long, s).timed.find(b => b.km === HALF_MARATHON_KM)!;
    expect(half.seconds).toBe(21 * 300 + Math.round(150 * 97.5 / 500)); // 6,300 s and 29 s for the last 97.5 m
    expect(bestLabel(half.km)).toBe('Half marathon');
    // 21 kilometres and nothing after them: no half marathon, never a guess.
    const short = splitsRecordSchema.parse({version: 1, workouts: {h: {source: 'gpx', paceSecondsPerKm: 300, splits: Array.from({length: 21}, (_, i) => km(i + 1, 300))}}});
    expect(runBests(long, short).timed.some(b => b.km === HALF_MARATHON_KM)).toBe(false);
  });
});
