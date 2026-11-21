import {describe, expect, it} from 'vitest';
import {doneByDay, doneByWeek} from './done-chart';

/** Session AV (owner follow-up 1, F-TASKS-DONE): finished per day (14) and per week (4, Monday first), counts only. */
const day = (iso: string) => iso.slice(0, 10), TODAY = '2026-11-25'; // a Wednesday
describe('Session AV (F-TASKS-DONE)', () => {
  const log = [{at: '2026-11-25T08:00:00Z'}, {at: '2026-11-25T09:00:00Z'}, {at: '2026-11-23T12:00:00Z'}, {at: '2026-11-15T12:00:00Z'}, {at: '2026-11-11T12:00:00Z'}, {at: '2026-10-01T12:00:00Z'}];
  it('14 days ending today, a zero for a day with none', () => {
    const days = doneByDay(log, TODAY, day);
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({date: '2026-11-12', count: 0});
    expect(days.at(-1)).toEqual({date: '2026-11-25', count: 2});
    expect(days.find(d => d.date === '2026-11-23')!.count).toBe(1);
    expect(days.reduce((n, d) => n + d.count, 0)).toBe(4);
  });
  it('4 weeks from Monday, this week last', () => {
    expect(doneByWeek(log, TODAY, day)).toEqual([
      {start: '2026-11-02', end: '2026-11-08', count: 0}, {start: '2026-11-09', end: '2026-11-15', count: 2},
      {start: '2026-11-16', end: '2026-11-22', count: 0}, {start: '2026-11-23', end: '2026-11-29', count: 3},
    ]);
  });
});
