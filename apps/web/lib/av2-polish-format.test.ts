import {describe, expect, test} from 'vitest';
import {isDayStart} from './visual-format';

// Session AV lane 2 (polish P-14): a moment kept at its day's start reads as a day, not "12:00 AM".
describe('isDayStart', () => {
  test('the exact start of the day where it is read', () => {
    expect(isDayStart('2026-11-21T23:00:00.000Z', 'Europe/Amsterdam')).toBe(true);
    expect(isDayStart('2026-11-22T00:00:00.000Z', 'UTC')).toBe(true);
  });
  test('any other moment, an unreadable one, or a second past midnight is a time', () => {
    expect(isDayStart('2026-11-22T00:00:00.000Z', 'Europe/Amsterdam')).toBe(false);
    expect(isDayStart('2026-11-21T23:00:01.000Z', 'Europe/Amsterdam')).toBe(false);
    expect(isDayStart('2026-11-21T23:00:00.001Z', 'Europe/Amsterdam')).toBe(false);
    expect(isDayStart('2026-11-22T07:30:00.000Z', 'UTC')).toBe(false);
    expect(isDayStart('not a date')).toBe(false);
  });
});
