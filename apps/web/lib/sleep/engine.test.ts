import {describe, expect, test} from 'vitest';
import {addDays, formatMinutes, instantAt, wallClock, zoneOffsetMinutes} from '../zone-time';
import {emptySleep, type Sleep} from './schema';
import {asleep, bedClock, clockFromNoon, consistency, dailySeries, deleteNight, endNight, inBedMinutes, nightDay, runningNights, saveNight, setSleepGoal, shortNights, sleepDebt, startNight, summary} from './engine';

const BXL = 'Europe/Brussels', NY = 'America/New_York';
const at = (iso: string) => new Date(iso);
const night = (s: Sleep, date: string, bed: string, wake: string, extra: Partial<Parameters<typeof saveNight>[1]> = {}, zone = BXL) => {
  const start = instantAt(date, bed, zone), wakeDate = bed > wake ? addDays(date, 1) : date;
  return saveNight(s, {kind: 'night', start, end: instantAt(wakeDate, wake, zone), timeZone: zone, ...extra}, at('2026-12-01T00:00:00Z'));
};

describe('wall-clock time across daylight-saving changes (Session W Part 4)', () => {
  test('Brussels, 25 October 2026: 02:30 happens twice (the first is kept); the night through it lasts exactly 9 hours', () => {
    expect(new Date(instantAt('2026-10-25', '02:30', BXL)).toISOString()).toBe('2026-10-25T00:30:00.000Z');
    const start = instantAt('2026-10-24', '23:00', BXL), end = instantAt('2026-10-25', '07:00', BXL);
    expect((end - start) / 60_000).toBe(9 * 60);
    expect(zoneOffsetMinutes(start, BXL)).toBe(120);
    expect(zoneOffsetMinutes(end, BXL)).toBe(60);
  });
  test('New York, 1 November 2026: 01:30 happens twice; a 23:00–07:00 night lasts 9 hours', () => {
    expect(new Date(instantAt('2026-11-01', '01:30', NY)).toISOString()).toBe('2026-11-01T05:30:00.000Z');
    expect((instantAt('2026-11-01', '07:00', NY) - instantAt('2026-10-31', '23:00', NY)) / 60_000).toBe(9 * 60);
  });
  test('spring forward: a skipped time moves forward by the gap; the 23:00–07:00 night lasts 7 hours', () => {
    expect(wallClock(instantAt('2026-03-29', '02:30', BXL), BXL).clock).toBe('03:30');
    expect((instantAt('2026-03-29', '07:00', BXL) - instantAt('2026-03-28', '23:00', BXL)) / 60_000).toBe(7 * 60);
    expect(wallClock(instantAt('2026-03-08', '02:15', NY), NY).clock).toBe('03:15');
  });
  test('formats and days', () => {
    expect(formatMinutes(425)).toBe('7 h 05 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('the sleep engine', () => {
  test('a night\'s day is its wake date in its own zone; asleep is estimated until both latency and awake time are known', () => {
    let s = night(emptySleep(), '2026-10-24', '23:00', '07:00', {latencyMin: 20});
    const n = s.nights[0]!;
    expect(nightDay(n)).toBe('2026-10-25');
    expect(inBedMinutes(n)).toBe(540);
    expect(asleep(n)).toEqual({minutes: 520, estimated: true});
    s = saveNight(s, {id: n.id, kind: 'night', start: Date.parse(n.start), end: Date.parse(n.end!), timeZone: BXL, latencyMin: 20, awakeMin: 30}, at('2026-12-01T00:00:00Z'));
    expect(asleep(s.nights[0]!)).toEqual({minutes: 490, estimated: false});
    // An imported night with all three stages counts the stages.
    const staged = {...s.nights[0]!, stages: {deepMin: 80, remMin: 100, coreMin: 250}};
    expect(asleep(staged)).toEqual({minutes: 430, estimated: false});
  });
  test('"I\'m going to bed" then "I woke up": one running night (end null), ended now; a second start is refused while one runs', () => {
    let s = startNight(emptySleep(), at('2026-10-06T21:30:00Z'), BXL, 'health_sleep-aaaaaaaa-0001');
    expect(runningNights(s).map(n => n.id)).toEqual(['health_sleep-aaaaaaaa-0001']);
    expect(s.nights[0]).toMatchObject({end: null, source: 'timer', timeZone: BXL});
    expect(() => startNight(s, at('2026-10-06T22:00:00Z'), BXL)).toThrow('A night is already running. End it first.');
    s = endNight(s, 'health_sleep-aaaaaaaa-0001', at('2026-10-07T05:15:00Z'));
    expect(runningNights(s)).toEqual([]);
    expect(nightDay(s.nights[0]!)).toBe('2026-10-07');
    expect(inBedMinutes(s.nights[0]!)).toBe(465);
  });
  test('a running night older than 24 hours asks for the real end time; nothing is invented', () => {
    const s = startNight(emptySleep(), at('2026-10-06T21:30:00Z'), BXL, 'health_sleep-aaaaaaaa-0002');
    expect(() => endNight(s, 'health_sleep-aaaaaaaa-0002', at('2026-10-08T05:00:00Z'))).toThrow('Enter when you woke up.');
  });
  test('overlapping nights are refused; naps may sit inside a day; deleting removes one', () => {
    let s = night(emptySleep(), '2026-10-01', '23:00', '07:00');
    expect(() => night(s, '2026-10-02', '03:00', '09:00')).toThrow('This overlaps the night that ended on 2026-10-02.');
    s = saveNight(s, {kind: 'nap', start: instantAt('2026-10-02', '14:00', BXL), end: instantAt('2026-10-02', '14:30', BXL), timeZone: BXL}, at('2026-12-01T00:00:00Z'));
    expect(s.nights).toHaveLength(2);
    s = deleteNight(s, s.nights[1]!.id);
    expect(s.nights).toHaveLength(1);
    expect(() => saveNight(s, {kind: 'night', start: Date.parse('2026-12-02T00:00:00Z'), end: Date.parse('2026-12-02T07:00:00Z'), timeZone: BXL}, at('2026-12-01T00:00:00Z'))).toThrow('A night cannot end in the future.');
  });
  test('the series leaves days without a night empty (never zero); averages count logged nights only', () => {
    let s = emptySleep();
    s = night(s, '2026-10-01', '23:00', '07:00', {latencyMin: 0, awakeMin: 0, quality: 4});
    // Bed after midnight: the bedtime's own date (wakes the same day).
    s = night(s, '2026-10-04', '00:30', '07:30', {latencyMin: 0, awakeMin: 0, quality: 2});
    const points = dailySeries(s, '2026-10-04', 4);
    expect(points.map(p => p.asleep)).toEqual([null, 480, null, 420]);
    expect(points[1]!.bed).toBe(bedClock(s.nights[0]!));
    const week = summary(points)!;
    expect(week).toMatchObject({nights: 2, asleep: 450, quality: 3, estimated: false});
    expect(clockFromNoon(week.bed)).toBe('23:45');
  });
  test('sleep debt: Σ (goal − asleep) over the logged nights of the last 7 days, with n; negative when ahead', () => {
    let s = setSleepGoal(emptySleep(), {minutes: 480}, at('2026-10-01T08:00:00Z'));
    expect(sleepDebt(s, '2026-10-07')).toBeNull();
    s = night(s, '2026-10-03', '23:00', '06:00', {latencyMin: 0, awakeMin: 0});
    s = night(s, '2026-10-05', '23:00', '06:30', {latencyMin: 0, awakeMin: 0});
    expect(sleepDebt(s, '2026-10-07')).toEqual({minutes: 60 + 30, nights: 2, goal: 480});
    s = night(s, '2026-10-06', '21:00', '08:00', {latencyMin: 0, awakeMin: 0});
    expect(sleepDebt(s, '2026-10-07')!.minutes).toBe(90 - 180);
    expect(setSleepGoal(s, null, at('2026-10-07T08:00:00Z')).goal).toBeUndefined();
    expect(() => setSleepGoal(s, {minutes: 480, bedFrom: '22:30'}, at('2026-10-07T08:00:00Z'))).toThrow();
  });
  test('consistency: the standard deviation of bedtimes over 14 days, only from 4 nights on', () => {
    let s = emptySleep();
    for (const [date, bed] of [['2026-10-01', '22:00'], ['2026-10-02', '23:00'], ['2026-10-03', '22:30']] as const) s = night(s, date, bed, '07:00');
    expect(consistency(s, '2026-10-07')).toBeNull();
    s = night(s, '2026-10-05', '00:00', '07:00');
    // Bedtimes after noon: 600, 660, 630, 720 → mean 652.5, population SD ≈ 44.4.
    expect(consistency(s, '2026-10-07')).toEqual({minutes: 44, nights: 4});
  });
  test('the gentle note appears only when most recent nights are short', () => {
    let s = emptySleep();
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-03']) s = night(s, date, '01:00', '06:00', {latencyMin: 0, awakeMin: 0});
    expect(shortNights(s, '2026-10-04')).toBe(false);
    s = night(s, '2026-10-04', '01:00', '06:00', {latencyMin: 0, awakeMin: 0});
    expect(shortNights(s, '2026-10-04')).toBe(true);
  });
});
