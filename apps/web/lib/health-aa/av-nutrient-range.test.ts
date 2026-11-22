import {describe, expect, it} from 'vitest';
import {MAX_RANGE_DAYS, rangeOf} from './nutrient-range';

/** Session AV (owner follow-up 1, F-NUTRIENT-RANGE; Cronometer): the days the nutrient report averages. */
describe('Session AV (F-NUTRIENT-RANGE)', () => {
  it('7, 30 and 90 days end on the day shown', () => {
    expect(rangeOf('week', '2026-11-21', '', '')).toEqual({start: '2026-11-15', end: '2026-11-21', days: 7, capped: false});
    expect(rangeOf(90, '2026-11-21', '', '').start).toBe('2026-08-24');
  });
  it('a chosen range is kept within a year and never past the day shown', () => {
    expect(rangeOf('custom', '2026-11-21', '2026-11-01', '2026-11-10')).toEqual({start: '2026-11-01', end: '2026-11-10', days: 10, capped: false});
    expect(rangeOf('custom', '2026-11-21', '2026-11-01', '2026-12-31').end).toBe('2026-11-21');
    const long = rangeOf('custom', '2026-11-21', '2024-01-01', '2026-11-21');
    expect([long.days, long.capped, long.end]).toEqual([MAX_RANGE_DAYS, true, '2026-11-21']);
    expect(rangeOf('custom', '2026-11-21', '2026-11-30', '2026-11-10').days).toBe(1); // From after To reads as the one day
  });
});
