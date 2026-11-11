import {describe, expect, it} from 'vitest';
import {dayLeftWords, daysLeftWords, msToNextMinute, timeRings} from './time';

/** A local wall-clock time (months from 1), as this device's clock would read it. */
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s);

describe('Time: how much of today, this week and this year has passed', () => {
  it('a Wednesday afternoon: the day, the week from Monday, the year', () => {
    const r = timeRings(local(2026, 11, 11, 14, 20));
    expect(r.day.minutesLeft).toBe(9 * 60 + 40);
    expect(r.day.share).toBeCloseTo((14 * 60 + 20) / 1440, 2);
    // Monday and Tuesday whole, and Wednesday up to 14:20.
    expect(r.week.share).toBeCloseTo((2 + (14 * 60 + 20) / 1440) / 7, 2);
    expect(r.week.daysLeft).toBe(4);
    expect(r.year).toMatchObject({dayOfYear: 315, days: 365, daysLeft: 50});
    expect(r.year.share).toBeCloseTo((314 + (14 * 60 + 20) / 1440) / 365, 2);
    expect(r.monthDaysLeft).toBe(19);
  });

  it('midnight starts everything at its beginning; the last minute is almost full, never past it', () => {
    const start = timeRings(local(2026, 1, 1));
    expect(start.day).toEqual({share: 0, minutesLeft: 1440});
    expect(start.year).toMatchObject({share: 0, dayOfYear: 1, days: 365, daysLeft: 364});
    const end = timeRings(local(2026, 12, 31, 23, 59, 30));
    expect(end.day.minutesLeft).toBe(0);
    expect(end.day.share).toBeGreaterThan(0.999);
    expect(end.day.share).toBeLessThanOrEqual(1);
    expect(end.year).toMatchObject({dayOfYear: 365, daysLeft: 0});
    expect(end.year.share).toBeGreaterThan(0.9999);
    expect(end.year.share).toBeLessThanOrEqual(1);
    expect(end.monthDaysLeft).toBe(0);
  });

  it('the week runs Monday to Sunday', () => {
    // 2026-11-09 is a Monday, 2026-11-15 a Sunday.
    expect(timeRings(local(2026, 11, 9))).toMatchObject({week: {share: 0, daysLeft: 6}});
    const sunday = timeRings(local(2026, 11, 15, 12));
    expect(sunday.week.daysLeft).toBe(0);
    expect(sunday.week.share).toBeCloseTo(6.5 / 7, 2);
    // The next minute after Sunday is a new week.
    expect(timeRings(local(2026, 11, 16)).week).toEqual({share: 0, daysLeft: 6});
    // A week that crosses the year: Thursday 2026-12-31 and Friday 2027-01-01 are the same week.
    expect(timeRings(local(2026, 12, 31, 12)).week.daysLeft).toBe(3);
    expect(timeRings(local(2027, 1, 1, 12)).week.daysLeft).toBe(2);
    expect(timeRings(local(2027, 1, 1, 12)).week.share).toBeCloseTo(4.5 / 7, 2);
  });

  it('a leap year is 366 days long', () => {
    const feb29 = timeRings(local(2028, 2, 29, 12));
    expect(feb29.year).toMatchObject({dayOfYear: 60, days: 366, daysLeft: 306});
    expect(feb29.year.share).toBeCloseTo(59.5 / 366, 3);
    expect(feb29.monthDaysLeft).toBe(0);
    expect(timeRings(local(2028, 12, 31, 12)).year).toMatchObject({dayOfYear: 366, days: 366, daysLeft: 0});
    expect(timeRings(local(2027, 2, 28, 12)).year).toMatchObject({dayOfYear: 59, days: 365});
    expect(timeRings(local(2027, 2, 28, 12)).monthDaysLeft).toBe(0);
    // 1900-style century rule: 2100 is not a leap year.
    expect(timeRings(local(2100, 3, 1)).year).toMatchObject({dayOfYear: 60, days: 365});
  });

  it('month ends: 30 and 31 days, and December into the next year', () => {
    expect(timeRings(local(2026, 11, 30, 8)).monthDaysLeft).toBe(0);
    expect(timeRings(local(2026, 10, 1, 8)).monthDaysLeft).toBe(30);
    expect(timeRings(local(2026, 12, 1, 8)).monthDaysLeft).toBe(30);
  });

  it('what is left, in words', () => {
    expect([dayLeftWords(580), dayLeftWords(60), dayLeftWords(59), dayLeftWords(1), dayLeftWords(0)]).toEqual(['9 h left', '1 h left', '59 min left', '1 min left', 'Under a minute left']);
    expect([daysLeftWords(50), daysLeftWords(1), daysLeftWords(0)]).toEqual(['50 days left', '1 day left', 'Last day']);
  });

  it('the next reading is at the next whole minute: once a minute, never sooner than due, never zero', () => {
    const minute = Date.UTC(2026, 10, 11, 14, 20);
    expect(msToNextMinute(minute)).toBe(60_000);
    expect(msToNextMinute(minute + 1)).toBe(59_999);
    expect(msToNextMinute(minute + 59_999)).toBe(1);
    expect(msToNextMinute(minute + 30_500)).toBe(29_500);
  });
});
