import {describe, expect, it} from 'vitest';
import {groupSleep, lastMonths, rangeAverage} from './longer';
import type {DayPoint} from './engine';

/** Session AV (owner follow-up 1, F-SLEEP-LONG; Sleep Cycle): weeks and months of nights, averaged. */
const p = (date: string, asleep: number | null, quality: number | null = null): DayPoint => ({date, asleep, estimated: false, inBed: asleep, bed: null, wake: null, quality, nights: asleep === null ? 0 : 1});
describe('Session AV (F-SLEEP-LONG)', () => {
  const points = [p('2026-10-31', 400, 3), p('2026-11-01', null), p('2026-11-02', 420, 4), p('2026-11-03', 480, 5), p('2026-11-09', null)];
  it('groups by week from Monday, and by month, averaging only the logged nights', () => {
    expect(groupSleep(points, 'week').map(g => [g.key, g.nights, g.asleep, g.quality, g.days])).toEqual([['2026-10-26', 1, 400, 3, 2], ['2026-11-02', 2, 450, 4.5, 2], ['2026-11-09', 0, null, null, 1]]);
    expect(groupSleep(points, 'month').map(g => [g.key, g.nights, g.asleep])).toEqual([['2026-10', 1, 400], ['2026-11', 2, 450]]);
  });
  it('says the whole range in one number, or nothing', () => {
    expect(rangeAverage(points)).toEqual({asleep: 433, nights: 3});
    expect(rangeAverage([p('2026-11-01', null)])).toBeNull();
  });
  it('q3 #46: a year is the last 12 calendar months, and each group has its average bedtime and wake time', () => {
    const days = Array.from({length: 365}, (_, i) => new Date(Date.parse('2026-11-21T12:00:00Z') - (364 - i) * 86_400_000).toISOString().slice(0, 10));
    const year = days.map(d => p(d, null));
    const months = groupSleep(lastMonths(year), 'month');
    expect(months).toHaveLength(12);
    expect(months[0]!.key).toBe('2025-12');
    expect(months[0]!.days).toBe(31); // a whole month, not the 9 days of November 2025
    expect(months.at(-1)!.key).toBe('2026-11');
    const bedWake = (date: string, bed: number, wake: number): DayPoint => ({...p(date, 420), bed, wake});
    // 23:00 and 01:00 average to midnight (minutes from noon: 660 and 780), never to noon.
    const [week] = groupSleep([bedWake('2026-11-02', 660, 420), bedWake('2026-11-03', 780, 480)], 'week');
    expect([week!.bed, week!.wake]).toEqual(['00:00', '07:30']);
    expect(groupSleep([p('2026-11-02', null)], 'week')[0]!.bed).toBeNull();
  });
});
