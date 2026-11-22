import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {formatMinutes} from '../zone-time';
import {emptySleep, type Sleep} from './schema';
import {saveNight} from './engine';
import {shiftWords, shiftWordsNl, sleepMiddle, sleepTiming} from './timing';
import {logNap, napClock, napEndsAt, napLeft} from './nap';
import {SLEEP_TIPS, sleepTipOf} from '../sleep-tips';
import {WATER_TIPS} from '../water-tips';

/** Session AV lane 2, round 4 (health; Pillow, LEDGER #333, #334, #335): your timing, a tip a day, the nap timer. */
const TODAY = '2026-11-20', AT = new Date('2026-12-01T00:00:00Z');
const weekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
/** 30 nights ending today: weekend nights 00:30–09:30 (middle 05:00), weekday nights 23:00–07:00 (middle 03:00). */
function nights(days = 30, {skipWeekends = false} = {}): Sleep {
  let s = emptySleep();
  for (let i = 0; i < days; i++) {
    const wake = addLocalDays(TODAY, -i), prev = addLocalDays(wake, -1), free = weekend(wake);
    if (free && skipWeekends) continue;
    const start = Date.parse(free ? `${wake}T00:30:00Z` : `${prev}T23:00:00Z`), end = Date.parse(free ? `${wake}T09:30:00Z` : `${wake}T07:00:00Z`);
    s = saveNight(s, {kind: 'night', start, end, timeZone: 'UTC'}, AT);
  }
  return s;
}

describe('your timing on free days (LEDGER #333)', () => {
  test('the middle of sleep, weekend beside weekday, and the word from the weekend middle', () => {
    const t = sleepTiming(nights(), TODAY)!;
    expect(t.free).toMatchObject({mid: 300}); expect(t.work).toMatchObject({mid: 180});
    expect(t.free.nights + t.work.nights).toBe(30);
    expect(t.shift).toBe(120);
    expect(t.word).toBe('middle');
    expect(shiftWords(t, formatMinutes)).toBe('On weekends you sleep about 2 h 00 min later than on weekdays.');
    expect(shiftWordsNl(t, formatMinutes)).toBe('In het weekend slaap je ongeveer 2 h 00 min later dan door de week.');
  });
  test('a night across midnight has its middle on the clock; before 3:00 reads earlier, after 5:00 later', () => {
    expect(sleepMiddle({id: 'health_sleep-aaaaaaaa', kind: 'night', start: '2026-11-19T22:00:00.000Z', end: '2026-11-20T06:00:00.000Z', timeZone: 'UTC', source: 'manual', createdAt: AT.toISOString(), updatedAt: AT.toISOString()})).toBe(120);
    let early = emptySleep(), late = emptySleep();
    for (let i = 0; i < 30; i++) {
      const wake = addLocalDays(TODAY, -i), prev = addLocalDays(wake, -1);
      early = saveNight(early, {kind: 'night', start: Date.parse(`${prev}T21:30:00Z`), end: Date.parse(`${wake}T05:30:00Z`), timeZone: 'UTC'}, AT);
      late = saveNight(late, {kind: 'night', start: Date.parse(`${wake}T02:00:00Z`), end: Date.parse(`${wake}T10:00:00Z`), timeZone: 'UTC'}, AT);
    }
    expect(sleepTiming(early, TODAY)).toMatchObject({word: 'earlier', shift: 0});
    expect(shiftWords(sleepTiming(early, TODAY)!, formatMinutes)).toBe('On weekends you sleep at about the same time as on weekdays.');
    expect(sleepTiming(late, TODAY)?.word).toBe('later');
  });
  test('too few weekend nights, and naps, leave it out', () => {
    expect(sleepTiming(nights(30, {skipWeekends: true}), TODAY)).toBeNull();
    expect(sleepTiming(emptySleep(), TODAY)).toBeNull();
    const s = saveNight(nights(), {kind: 'nap', start: Date.parse(`${TODAY}T13:00:00Z`), end: Date.parse(`${TODAY}T13:20:00Z`), timeZone: 'UTC'}, AT);
    expect(sleepTiming(s, TODAY)).toEqual(sleepTiming(nights(), TODAY));
  });
});

describe('a sleep tip a day (LEDGER #334)', () => {
  test('the same tip all day, another one place on, in English and Dutch', () => {
    expect(sleepTipOf(TODAY)).toBe(sleepTipOf(TODAY));
    expect(sleepTipOf(TODAY, 1)).not.toBe(sleepTipOf(TODAY));
    expect(new Set(SLEEP_TIPS.map(t => t.id)).size).toBe(SLEEP_TIPS.length);
    for (const t of SLEEP_TIPS) { expect(t.en.length).toBeGreaterThan(20); expect(t.nl.length).toBeGreaterThan(20); }
    expect(SLEEP_TIPS.length).toBeGreaterThanOrEqual(WATER_TIPS.length - 2);
  });
  test('practical habits only: no health claims, no pills, no amounts the body needs', () => {
    const banned = /\b(health(y)?|insomnia|apnea|apnoea|melatonin|pills?|supplements?|medic\w*|cure|prevent\w*|disease|risk|brain|hormones?|immune|weight|metabolism|hours a night|should sleep|must sleep|gezond\w*|slapeloosheid|pil(len)?|medicij\w*|ziekte|risico|hormo\w*|gewicht|moet slapen)\b/i;
    for (const t of SLEEP_TIPS) { expect(t.en).not.toMatch(banned); expect(t.nl).not.toMatch(banned); }
  });
});

describe('the nap timer (LEDGER #335)', () => {
  const run = {startedAt: Date.parse(`${TODAY}T13:00:00Z`), minutes: 20};
  test('counts down to its end and never below zero', () => {
    expect(napEndsAt(run)).toBe(Date.parse(`${TODAY}T13:20:00Z`));
    expect(napLeft(run, run.startedAt + 65_000)).toBe(1135);
    expect(napLeft(run, run.startedAt + 30 * 60_000)).toBe(0);
    expect(napClock(1135)).toBe('18:55'); expect(napClock(5400)).toBe('1:30:00');
  });
  test('logs the nap as an ordinary nap record, up to its end at most; under ten minutes logs nothing', () => {
    const s = logNap(emptySleep(), run, run.startedAt + 45 * 60_000, 'Europe/Amsterdam', AT)!;
    expect(s.nights).toHaveLength(1);
    expect(s.nights[0]).toMatchObject({kind: 'nap', start: `${TODAY}T13:00:00.000Z`, end: `${TODAY}T13:20:00.000Z`, timeZone: 'Europe/Amsterdam', source: 'manual'});
    expect(logNap(emptySleep(), run, run.startedAt + 12 * 60_000, 'UTC', AT)!.nights[0]!.end).toBe(`${TODAY}T13:12:00.000Z`);
    expect(logNap(emptySleep(), run, run.startedAt + 9 * 60_000, 'UTC', AT)).toBeNull();
    // A nap over a logged night is refused, as every other sleep record is.
    expect(() => logNap(s, run, napEndsAt(run), 'UTC', AT)).toThrow(/overlaps the nap/);
  });
});
