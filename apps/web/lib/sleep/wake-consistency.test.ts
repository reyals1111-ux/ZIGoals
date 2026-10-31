import {describe, expect, test} from 'vitest';
import {addDays, instantAt} from '../zone-time';
import {emptySleep, type Sleep} from './schema';
import {consistency, saveNight, wakeConsistency} from './engine';

// Session AK (4.9): wake-time consistency beside the bedtime one. Fictional nights.
const Z = 'Europe/Brussels';
const night = (s: Sleep, date: string, bed: string, wakeDate: string, wake: string) =>
  saveNight(s, {kind: 'night', start: instantAt(date, bed, Z), end: instantAt(wakeDate, wake, Z), timeZone: Z}, new Date('2026-12-01T00:00:00Z'));

describe('wake-time consistency', () => {
  test('the standard deviation of wake times over 14 days, only from 4 nights on', () => {
    let s = emptySleep();
    const wakes = ['07:00', '07:30', '06:30', '08:00'];
    wakes.slice(0, 3).forEach((w, i) => { const d = addDays('2026-10-01', i); s = night(s, d, '23:00', addDays(d, 1), w); });
    expect(wakeConsistency(s, '2026-10-07')).toBeNull();
    s = night(s, '2026-10-04', '23:00', '2026-10-05', wakes[3]!);
    // Offsets from the mean (07:15): −15, +15, −45, +45 → √(1125) ≈ 33.5 minutes.
    expect(wakeConsistency(s, '2026-10-07')).toEqual({minutes: 34, nights: 4});
    expect(consistency(s, '2026-10-07')).toEqual({minutes: 0, nights: 4});
  });
  test('wake times either side of midnight are minutes apart, not hours', () => {
    let s = emptySleep();
    const pairs: [string, string, string, string][] = [['2026-10-01', '15:00', '2026-10-01', '23:50'], ['2026-10-02', '15:10', '2026-10-03', '00:10'],
      ['2026-10-04', '15:00', '2026-10-04', '23:50'], ['2026-10-05', '15:20', '2026-10-06', '00:10']];
    for (const [d, b, wd, w] of pairs) s = night(s, d, b, wd, w);
    expect(wakeConsistency(s, '2026-10-07')).toEqual({minutes: 10, nights: 4});
  });
  test('nights outside the 14 days do not count', () => {
    let s = emptySleep();
    for (let i = 0; i < 4; i++) { const d = addDays('2026-09-01', i); s = night(s, d, '23:00', addDays(d, 1), '07:00'); }
    expect(wakeConsistency(s, '2026-10-07')).toBeNull();
  });
});
