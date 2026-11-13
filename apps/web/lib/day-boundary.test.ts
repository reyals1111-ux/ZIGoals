import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest';
import {activityDay, chooseDayEnd, dayEndsSchema, dayUnder, emptyDayEnds, type DayEnds} from './day-boundary';

const at = (iso: string) => new Date(iso);
const BXL = 'Europe/Brussels', TOKYO = 'Asia/Tokyo', NY = 'America/New_York';

describe('My day ends at (C-DVG-22): the wall clock in the day\'s zone decides', () => {
  test('midnight is exactly the calendar day (the default and a missing record)', () => {
    for (const iso of ['2026-11-13T22:59:00Z', '2026-11-13T23:00:00Z', '2026-11-14T01:30:00Z']) expect(dayUnder(0, at(iso), BXL)).toBe(new Intl.DateTimeFormat('en-CA', {timeZone: BXL}).format(at(iso)));
    expect(activityDay(emptyDayEnds(), at('2026-11-14T01:30:00Z'), BXL)).toBe('2026-11-14');
  });
  test('ending at 03:00: 02:59 local is still yesterday, 03:00 is today (Brussels, Tokyo, New York)', () => {
    expect(dayUnder(180, at('2026-11-14T01:59:00Z'), BXL)).toBe('2026-11-13'); // 02:59 CET
    expect(dayUnder(180, at('2026-11-14T02:00:00Z'), BXL)).toBe('2026-11-14'); // 03:00 CET
    expect(dayUnder(180, at('2026-11-13T17:59:00Z'), TOKYO)).toBe('2026-11-13'); // 02:59 JST on the 14th
    expect(dayUnder(180, at('2026-11-13T18:00:00Z'), TOKYO)).toBe('2026-11-14');
    expect(dayUnder(180, at('2026-11-14T07:59:00Z'), NY)).toBe('2026-11-13'); // 02:59 EST
  });
  test('a daylight-saving night: 03:00 is the local 03:00 on both changes (Brussels)', () => {
    // 29 Mar 2026: 02:00 CET jumps to 03:00 CEST (01:00Z). 01:59Z is 03:59 CEST.
    expect(dayUnder(180, at('2026-03-29T00:59:00Z'), BXL)).toBe('2026-03-28'); // 01:59 CET
    expect(dayUnder(180, at('2026-03-29T01:00:00Z'), BXL)).toBe('2026-03-29'); // 03:00 CEST
    // 25 Oct 2026: 03:00 CEST falls back to 02:00 CET (01:00Z); 02:30 happens twice, both before 03:00.
    expect(dayUnder(180, at('2026-10-25T00:30:00Z'), BXL)).toBe('2026-10-24'); // 02:30 CEST
    expect(dayUnder(180, at('2026-10-25T01:30:00Z'), BXL)).toBe('2026-10-24'); // 02:30 CET
    expect(dayUnder(180, at('2026-10-25T02:00:00Z'), BXL)).toBe('2026-10-25'); // 03:00 CET
  });
  test('only the hour or half hour, up to 06:00, is stored', () => {
    expect(dayEndsSchema.safeParse({version: 1, endsAt: 45}).success).toBe(false);
    expect(dayEndsSchema.safeParse({version: 1, endsAt: 420}).success).toBe(false);
    expect(dayEndsSchema.safeParse({version: 1, endsAt: 210}).success).toBe(true);
    expect(dayEndsSchema.safeParse({version: 1, endsAt: 0, extra: 1}).success).toBe(false);
  });
});

describe('owner rule 1: a change never re-dates the past and never breaks a streak by itself', () => {
  // The walks below are dated after this file was written; the clock is set after them (a change in the future is ignored).
  beforeAll(() => { vi.useFakeTimers({toFake: ['Date']}); vi.setSystemTime(new Date('2027-01-01T00:00:00Z')); });
  afterAll(() => { vi.useRealTimers(); });
  const walk = (s: DayEnds, zone: string, from: string, hours: number) => Array.from({length: hours * 2 + 1}, (_, i) => activityDay(s, new Date(Date.parse(from) + i * 1_800_000), zone));
  const monotonic = (days: string[]) => days.every((d, i) => i === 0 || d >= days[i - 1]!);
  const distinct = (days: string[]) => [...new Set(days)];
  for (const zone of [BXL, TOKYO]) {
    test(`midnight → 03:00 at 01:00 local (${zone}): today stays today (no step back), then 03:00 rules from the next night`, () => {
      const change = zone === BXL ? '2026-11-14T00:00:00Z' : '2026-11-13T16:00:00Z'; // 01:00 local on the 14th
      const s = chooseDayEnd(emptyDayEnds(), 180, at(change));
      const days = walk(s, zone, change, 50); // to 03:00 local on the 16th
      expect(monotonic(days)).toBe(true);
      expect(days[0]).toBe('2026-11-14'); // was the 14th before the change, still the 14th
      expect(distinct(days)).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']); // each day once, none skipped
      const next = zone === BXL ? '2026-11-15T01:30:00Z' : '2026-11-14T17:30:00Z'; // 02:30 local on the 15th: still the 14th now
      expect(activityDay(s, at(next), zone)).toBe('2026-11-14');
      expect(activityDay(s, at(change), zone)).toBe(dayUnder(0, at(change), zone));
    });
    test(`03:00 → midnight at 02:00 local (${zone}): the day in progress keeps its later end, then midnight rules`, () => {
      const start = chooseDayEnd(emptyDayEnds(), 180, at('2026-11-01T12:00:00Z'));
      const change = zone === BXL ? '2026-11-14T01:00:00Z' : '2026-11-13T17:00:00Z'; // 02:00 local on the 14th
      const s = chooseDayEnd(start, 0, at(change));
      expect(activityDay(s, at(change), zone)).toBe('2026-11-13'); // still the 13th, as before the change
      const half = zone === BXL ? '2026-11-14T01:59:00Z' : '2026-11-13T17:59:00Z'; // 02:59 local: the 13th can still be done
      expect(activityDay(s, at(half), zone)).toBe('2026-11-13');
      const three = zone === BXL ? '2026-11-14T02:00:00Z' : '2026-11-13T18:00:00Z';
      expect(activityDay(s, at(three), zone)).toBe('2026-11-14');
      const days = walk(s, zone, change, 48);
      expect(monotonic(days)).toBe(true);
      expect(distinct(days)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'].slice(0, distinct(days).length));
      const nextNight = zone === BXL ? '2026-11-15T00:30:00Z' : '2026-11-14T16:30:00Z'; // 01:30 local on the 15th: midnight rules
      expect(activityDay(s, at(nextNight), zone)).toBe('2026-11-15');
    });
    test(`midnight → 03:00 → midnight (${zone}): every instant before a change keeps the day it had then`, () => {
      const a = chooseDayEnd(emptyDayEnds(), 180, at('2026-11-10T12:00:00Z'));
      const b = chooseDayEnd(a, 0, at('2026-11-12T12:00:00Z'));
      const before = at('2026-11-12T08:00:00Z');
      expect(activityDay(b, before, zone)).toBe(dayUnder(180, before, zone));
      expect(monotonic(walk(b, zone, '2026-11-09T00:00:00Z', 24 * 6))).toBe(true);
    });
  }
  test('a change over a daylight-saving night (Brussels, 25 Oct 2026): no step back, no day skipped', () => {
    const s = chooseDayEnd(emptyDayEnds(), 180, at('2026-10-24T23:30:00Z')); // 01:30 CEST on the 25th
    const days = walk(s, BXL, '2026-10-24T23:30:00Z', 30);
    expect(monotonic(days)).toBe(true);
    expect(days[0]).toBe('2026-10-25');
    expect(distinct(days)).toEqual(['2026-10-25', '2026-10-26']);
  });
  test('a change dated in the future is ignored: the chosen end applies (security delta, Low)', () => {
    const s = {version: 1 as const, endsAt: 0, change: {at: '9999-01-01T00:00:00.000Z', from: 360}};
    expect(activityDay(s, at('2026-11-14T04:00:00Z'), BXL)).toBe('2026-11-14'); // 05:00 CET: midnight rules, not 06:00
  });
  test('choosing the same end changes nothing', () => {
    const s = emptyDayEnds();
    expect(chooseDayEnd(s, 0)).toBe(s);
  });
});
