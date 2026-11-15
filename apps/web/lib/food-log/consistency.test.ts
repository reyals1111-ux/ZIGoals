import {describe, expect, test} from 'vitest';
import {foodLoggingMonth, foodMonthWords} from './consistency';

// Session AP (feature 7): days with food logged this month, derived from the diary. Fictional days.
const entry = (date: string) => ({date}) as never;
describe('food-logging consistency this month', () => {
  test('counts each day with at least one entry once, from the 1st to today only', () => {
    const f = foodLoggingMonth({diary: ['2026-11-01', '2026-11-01', '2026-11-03', '2026-11-14', '2026-11-20', '2026-10-31'].map(entry)}, '2026-11-14');
    expect(f).toEqual({month: '2026-11', daysSoFar: 14, logged: 3, loggedDays: ['2026-11-01', '2026-11-03', '2026-11-14'], daysInMonth: 30});
    expect(foodMonthWords(f)).toBe('3 of 14 days so far this month');
  });
  test('nothing logged is zero days, never a guess; the 1st reads "1 day"', () => {
    expect(foodMonthWords(foodLoggingMonth({diary: []}, '2026-12-01'))).toBe('0 of 1 day so far this month');
    expect(foodLoggingMonth({diary: []}, '2028-02-10').daysInMonth).toBe(29);
  });
});
