import {describe, expect, it} from 'vitest';
import {groupSleep, rangeAverage} from './longer';
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
});
