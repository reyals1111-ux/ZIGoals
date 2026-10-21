import {describe, expect, test, vi} from 'vitest';
import {checklistStreak, mendableDays} from './streak';
import {tickFeedback, vibrationAvailable, TICK_VIBRATION_MS} from './feedback';
import {nudgeDue, nudgeText} from './nudges';
import {mendDay} from './day';
import type {ChecklistDays} from './schema';

const days = (map: Record<string, [number, number, boolean?]>): ChecklistDays => ({version: 1, days: Object.fromEntries(Object.entries(map).map(([d, [total, done, perfect]]) => [d, {total, done, ...(perfect ? {perfect} : {})}]))});

describe('the Checklist streak (P7.13)', () => {
  test('consecutive complete days, plus today once complete; an unfinished today never breaks it', () => {
    const d = days({'2026-10-15': [5, 5], '2026-10-16': [6, 6, true], '2026-10-17': [6, 6]});
    expect(checklistStreak(d, '2026-10-18', {total: 6, done: 2})).toMatchObject({current: 3, todayComplete: false});
    expect(checklistStreak(d, '2026-10-18', {total: 6, done: 6, perfect: true})).toMatchObject({current: 4, todayComplete: true, perfectDays: 2, completeDays: 4, best: 4});
  });
  test('the hour of the last tick does not matter (a day sealed complete is complete); a rest day is skipped, not broken', () => {
    const d = days({'2026-10-15': [4, 4], '2026-10-16': [0, 0], '2026-10-17': [4, 4]});
    expect(checklistStreak(d, '2026-10-18', null).current).toBe(2);
  });
  test('a missed day breaks it; an unsealed gap breaks it; the best run is remembered', () => {
    const d = days({'2026-10-10': [3, 3], '2026-10-11': [3, 3], '2026-10-12': [3, 3], '2026-10-13': [3, 1], '2026-10-16': [3, 3], '2026-10-17': [3, 3]});
    expect(checklistStreak(d, '2026-10-18', null)).toMatchObject({current: 2, best: 3});
    expect(checklistStreak(days({'2026-10-15': [3, 3]}), '2026-10-18', null).current).toBe(0);
  });
  test('a streak freeze mends a missed day: the repaired habits leave its count, and the run is whole again', () => {
    const d = days({'2026-10-16': [6, 6], '2026-10-17': [6, 5]});
    expect(checklistStreak(d, '2026-10-18', null).current).toBe(0);
    expect(mendableDays(d, '2026-10-18')).toEqual(['2026-10-17']);
    expect(checklistStreak(mendDay(d, '2026-10-17', 1), '2026-10-18', null).current).toBe(2);
  });
});

describe('a tick’s sound and vibration (P7.10)', () => {
  const quiet = {from: '22:00', to: '08:00'};
  test('the bell rings only with sounds on and outside the quiet hours', async () => {
    const ring = vi.fn(async () => true), env = {ring, vibrate: null, coarse: false};
    expect(await tickFeedback({sounds: false, haptics: true, now: new Date(2026, 9, 18, 12), quiet}, env)).toEqual({sound: false, vibrated: false});
    expect(await tickFeedback({sounds: true, haptics: true, now: new Date(2026, 9, 18, 23), quiet}, env)).toEqual({sound: false, vibrated: false});
    expect(await tickFeedback({sounds: true, haptics: true, now: new Date(2026, 9, 18, 12), quiet}, env)).toEqual({sound: true, vibrated: false});
    expect(ring).toHaveBeenCalledTimes(1); expect(ring).toHaveBeenCalledWith('soft', 45);
  });
  test('vibration only where the device has it and a touch screen, and the person left it on; never throws', async () => {
    const vibrate = vi.fn(() => true);
    expect(vibrationAvailable({vibrate, coarse: false})).toBe(false);
    expect(await tickFeedback({sounds: false, haptics: true, now: new Date(), quiet}, {vibrate, coarse: true})).toEqual({sound: false, vibrated: true});
    expect(vibrate).toHaveBeenCalledWith(TICK_VIBRATION_MS);
    expect(await tickFeedback({sounds: false, haptics: false, now: new Date(), quiet}, {vibrate, coarse: true})).toEqual({sound: false, vibrated: false});
    const broken = {vibrate: () => { throw new Error('denied'); }, coarse: true, ring: async () => { throw new Error('no audio'); }};
    await expect(tickFeedback({sounds: true, haptics: true, now: new Date(2026, 9, 18, 12), quiet}, broken)).resolves.toEqual({sound: false, vibrated: false});
  });
});

describe('gentle nudges (P7.14): three moments a day, never in quiet hours, nothing sent', () => {
  const opts = {on: true, waiting: 3, nudged: [] as string[], quiet: {from: '22:00', to: '08:00'}};
  test('the moment that has come and not yet shown', () => {
    expect(nudgeDue(new Date(2026, 9, 18, 9, 59), opts)).toBeNull();
    expect(nudgeDue(new Date(2026, 9, 18, 10, 5), opts)).toBe('10');
    expect(nudgeDue(new Date(2026, 9, 18, 16, 0), {...opts, nudged: ['10']})).toBe('15');
    expect(nudgeDue(new Date(2026, 9, 18, 16, 0), {...opts, nudged: ['15']})).toBeNull();
    expect(nudgeDue(new Date(2026, 9, 18, 19, 30), opts)).toBe('19');
  });
  test('none when off, when nothing waits, or in the quiet hours', () => {
    expect(nudgeDue(new Date(2026, 9, 18, 10, 5), {...opts, on: false})).toBeNull();
    expect(nudgeDue(new Date(2026, 9, 18, 10, 5), {...opts, waiting: 0})).toBeNull();
    expect(nudgeDue(new Date(2026, 9, 18, 19, 30), {...opts, quiet: {from: '19:00', to: '07:00'}})).toBeNull();
    expect(nudgeText(1)).toBe('1 planet still waiting on your path.');
    expect(nudgeText(4)).toBe('4 planets still waiting on your path.');
  });
});
