import {describe, expect, it} from 'vitest';
import {shiftMonthKey, workoutMonth} from './calendar';
import {workoutsSchema} from './schema';

/** Session AV (owner follow-up 1, F-WORKOUT-CALENDAR; Hevy): a month of finished workouts as weeks, Monday first. */
const workout = (id: string, date: string, name: string, done = true) => ({id, name, date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, ...(done ? {endedAt: `${date}T09:00:00.000Z`} : {}), exercises: []});
const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: [workout('a', '2026-11-02', 'Fictional push'), workout('b', '2026-11-02', 'Fictional run'), workout('c', '2026-11-20', 'Fictional legs'), workout('d', '2026-11-23', 'Under way', false), workout('e', '2026-10-30', 'October')]});
describe('Session AV (F-WORKOUT-CALENDAR)', () => {
  it('lays November 2026 out from Monday 26 October, with the days trained and their words', () => {
    const m = workoutMonth(w, '2026-11', '2026-11-23');
    expect(m.weeks).toHaveLength(6); // 26 Oct to 6 Dec
    expect(m.weeks[0]![0]!.date).toBe('2026-10-26');
    expect(m.weeks[0]![4]!).toMatchObject({date: '2026-10-30', inMonth: false, names: []}); // October is not counted
    const nov2 = m.weeks.flat().find(d => d.date === '2026-11-02')!;
    expect(nov2.names).toEqual(['Fictional push', 'Fictional run']);
    expect(nov2.words).toBe('Mon, Nov 2: Fictional push, Fictional run');
    expect(m.weeks.flat().find(d => d.date === '2026-11-23')).toMatchObject({today: true, names: []}); // under way, not finished
    expect([m.days, m.sessions]).toEqual([2, 3]);
  });
  it('moves across a year', () => { expect([shiftMonthKey('2026-12', 1), shiftMonthKey('2026-01', -1)]).toEqual(['2027-01', '2025-12']); });
});
