import {describe, expect, test} from 'vitest';
import {weekStreak, workoutYear} from './calendar';
import {workoutsSchema} from './schema';

/** Session AV lane 2 (body; LEDGER #118, Hevy's yearly calendar and consistency streak). */
const workout = (id: string, date: string) => ({id, name: `Fictional ${id}`, date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T09:00:00.000Z`, exercises: []});
const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: ['2026-01-05', '2026-01-05', '2026-03-03', '2026-10-26', '2026-11-02', '2026-11-04', '2026-11-12', '2025-12-30'].map((d, i) => workout(`w${i}`, d))});
describe('the year and the week streak', () => {
  test('twelve months, the days trained and the workouts', () => {
    const y = workoutYear(w, 2026, '2026-11-20');
    expect(y.months.map(m => m.month)).toEqual(Array.from({length: 12}, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`));
    expect([y.days, y.sessions]).toEqual([6, 7]);
    expect(y.months[0]!.days).toBe(1);
    expect(workoutYear(w, 2025, '2026-11-20').days).toBe(1);
  });
  test('weeks in a row: an open week never breaks the streak; the longest run', () => {
    // Weeks of 26 Oct, 2 Nov and 9 Nov trained; the week of 16 Nov has none yet.
    expect(weekStreak(w, '2026-11-20')).toEqual({current: 3, best: 3, thisWeek: false});
    expect(weekStreak(w, '2026-11-12')).toEqual({current: 3, best: 3, thisWeek: true});
    // A whole week missed ends it; the longest stays.
    expect(weekStreak(w, '2026-11-27')).toEqual({current: 0, best: 3, thisWeek: false});
    // 30 Dec 2025 and 5 Jan 2026 are two weeks in a row across the new year.
    expect(weekStreak(workoutsSchema.parse({...w, workouts: w.workouts.filter(x => x.date < '2026-02-01')}), '2026-01-07')).toMatchObject({current: 2, best: 2});
  });
});
