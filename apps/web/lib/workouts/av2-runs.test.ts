import {describe, expect, test} from 'vitest';
import {addDistanceGoal, goalProgress, paceText, periodOf, removeDistanceGoal, runSummary, runWords, trainingLoad} from './runs';
import {workoutsSchema} from './schema';

/** Session AV lane 2 (body; LEDGER #110, #111): a run against the runs before it; distance goals; the training load. */
const run = (id: string, date: string, km: number, seconds: number, name = 'Fictional run') => ({id, name, date, type: 'cardio', startedAt: `${date}T18:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T18:00:00.000Z`) + seconds * 1000).toISOString(),
  exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds, done: true}]}]});
const ride = (id: string, date: string, km: number) => ({id, name: 'Fictional ride', date, type: 'cardio', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T10:00:00.000Z`, exercises: [{id: `${id}-e`, exerciseId: 'cycling', name: 'Cycling', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds: 7200, done: true}]}]});
const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [run('a', '2026-11-03', 5, 1800), run('b', '2026-11-08', 6, 2100), run('c', '2026-11-12', 8, 2720), ride('r', '2026-11-14', 40)]});
const splits = {version: 1 as const, workouts: {c: {source: 'gpx' as const, paceSecondsPerKm: 340, splits: Array.from({length: 8}, (_, i) => ({km: i + 1, meters: 1000, seconds: 330 + i * 3}))}}};

describe('a run\'s summary', () => {
  test('pace and distance beside the earlier runs, its fastest kilometre and the best it set', () => {
    const r = runSummary(w, splits, 'c')!;
    expect(r).toMatchObject({km: 8, pace: 340, earlier: 2, avgPace: 355, avgKm: 5.5, paceDelta: -15, kmDelta: 2.5, fastestKm: 330});
    expect(r.bests).toEqual(['1 km', '5 km', 'longest run']);
    expect(runWords(r)).toBe('8 km at 5:40 a km. Against your last 2 runs: 15 s a km faster, 2.5 km longer. Fastest kilometre 5:30. A running best: 1 km, 5 km, longest run.');
    expect(runWords(runSummary(w, null, 'a')!)).toBe('5 km at 6:00 a km. Your first run here: the next ones are compared with it.');
    expect(runSummary(w, null, 'r')).toBeNull(); // a ride is not a run
    expect(paceText(305)).toBe('5:05');
  });
});
describe('distance goals', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  test('periods: Monday to Sunday, the calendar month, the year', () => {
    expect(periodOf('week', '2026-11-14')).toEqual({from: '2026-11-09', to: '2026-11-15'});
    expect(periodOf('month', '2026-12-14')).toEqual({from: '2026-12-01', to: '2026-12-31'});
    expect(periodOf('year', '2026-02-01')).toEqual({from: '2026-01-01', to: '2026-12-31'});
  });
  test('running this month counts runs only; what is left, a day\'s pace, on pace or not', () => {
    const g = addDistanceGoal(w, {sport: 'run', period: 'month', km: 60}, now);
    const p = goalProgress(g, g.distanceGoals![0]!, '2026-11-14');
    expect(p).toMatchObject({km: 19, left: 41, daysLeft: 16, perDay: 2.6, done: false, onPace: false});
    const all = addDistanceGoal(g, {sport: 'any', period: 'week', km: 40}, now);
    expect(goalProgress(all, all.distanceGoals![1]!, '2026-11-14')).toMatchObject({km: 48, done: true});
    expect(() => addDistanceGoal(all, {sport: 'run', period: 'month', km: 10}, now)).toThrow('already a goal');
    expect(() => addDistanceGoal(all, {sport: 'run', period: 'year', km: 0}, now)).toThrow('from 1');
    expect(removeDistanceGoal(all, all.distanceGoals![0]!.id).distanceGoals).toHaveLength(1);
  });
});
describe('the training load (never calories)', () => {
  test('the last 7 days beside the 4 weeks before, in words; 12 weeks with their usual', () => {
    const t = trainingLoad(w, '2026-11-14');
    expect(t.last7).toBe(35 + 45 + 120); // 8 to 14 Nov: the 6 and 8 km runs (35, 45 min) and the ride (120); 3 Nov is outside
    expect(t.weeks).toHaveLength(12);
    const later = trainingLoad(w, '2026-12-10');
    expect(later.usual).not.toBeNull();
    expect(later.words).toBe('lighter');
    expect(trainingLoad(workoutsSchema.parse({...w, workouts: []}), '2026-11-14').words).toBe('none');
    expect(trainingLoad(w, '2026-11-14', 'km').last7).toBe(54);
  });
});
