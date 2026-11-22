import {describe, expect, test} from 'vitest';
import {monthFigures, trainingYear} from './analytics';
import {setBestsFrom} from './r6-gym';
import {emptyWorkouts, workoutsSchema, type Workouts} from './schema';

/**
 * Review B6P-5 (Session AV lane 2, r6-body; LEDGER #422): "Count bests from today" starts the bests and the "new best"
 * marks again, while the history's counts of bests (a month's report, the year in training) stay as they were.
 */
const lift = (id: string, date: string, kg: number, extra: Record<string, unknown> = {}) => ({id, name: 'Legs', date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `${id}-s1`, kind: 'normal', reps: 5, weightKg: kg, done: true}]}], ...extra});
const W: Workouts = workoutsSchema.parse({...emptyWorkouts(), workouts: [lift('w1', '2026-10-05', 100), lift('w2', '2026-10-12', 105), lift('w3', '2026-10-19', 110, {light: true}), lift('w4', '2026-11-02', 107.5)]});
const lookup = () => null;
describe('B6P-5: past bests keep their counts after a fresh start', () => {
  test('October’s new bests and the year’s bests are the same before and after “Count bests from today for all exercises”', () => {
    const fresh = setBestsFrom(W, '*', '2026-11-22');
    expect(monthFigures(W, '2026-10', lookup, '2026-11-22').bests).toBe(2); // 12 Oct: heaviest and one-rep max; the light week sets none
    expect(monthFigures(fresh, '2026-10', lookup, '2026-11-22').bests).toBe(2);
    expect(monthFigures(fresh, '2026-11', lookup, '2026-11-22').bests).toBe(monthFigures(W, '2026-11', lookup, '2026-11-22').bests);
    expect(trainingYear(fresh, '2026-01-01', '2026-12-31').bests).toBe(trainingYear(W, '2026-01-01', '2026-12-31').bests);
    expect(trainingYear(W, '2026-01-01', '2026-12-31').bests).toBe(4); // and 2 Nov beats 105 (the light 110 is not one to beat)
  });
});
