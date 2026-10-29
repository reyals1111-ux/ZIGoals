import {expect, test} from 'vitest';
import {addDays, instantAt} from '../zone-time';
import {emptySleep, type Sleep} from './schema';
import {saveNight, setSleepGoal} from './engine';
import {focusWhy, focusWindow} from './focus-window';

// Session AJ (item 28): the focus window from the night that ended today; an estimate, never advice.
const Z = 'Europe/Brussels';
const night = (s: Sleep, date: string, bed: string, wake: string) => saveNight(s, {kind: 'night', start: instantAt(date, bed, Z), end: instantAt(bed > wake ? addDays(date, 1) : date, wake, Z), timeZone: Z, latencyMin: 0, awakeMin: 0}, new Date('2026-12-01T00:00:00Z'));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

test('two to four hours after waking, from the night that ended today', () => {
  const s = night(setSleepGoal(emptySleep(), {minutes: 480}, new Date('2026-10-01T08:00:00Z')), '2026-10-28', '23:00', '07:00');
  const w = focusWindow(s, '2026-10-29')!;
  expect([clock(w.from), clock(w.to), w.short]).toEqual(['09:00', '11:00', false]);
  expect(focusWhy(w, clock)).toContain('You woke at 07:00.');
  expect(focusWhy(w, clock)).toContain('not medical advice');
  expect(focusWindow(s, '2026-10-30')).toBeNull(); // no night ended that day
});
test('after a short night the window is an hour shorter and says so; never past 22:00', () => {
  const s = night(setSleepGoal(emptySleep(), {minutes: 480}, new Date('2026-10-01T08:00:00Z')), '2026-10-29', '02:00', '08:00'); // 6 h, 2 h under the goal
  const w = focusWindow(s, '2026-10-29')!;
  expect([clock(w.from), clock(w.to), w.short]).toEqual(['10:30', '11:30', true]);
  expect(focusWhy(w, clock)).toContain('After a shorter night the window is an hour shorter.');
  const late = focusWindow(night(emptySleep(), '2026-10-29', '10:00', '19:00'), '2026-10-29')!;
  expect([clock(late.from), clock(late.to)]).toEqual(['21:00', '22:00']); // capped at 22:00
  expect(focusWindow(night(emptySleep(), '2026-10-29', '11:30', '20:30'), '2026-10-29')).toBeNull(); // nothing before 22:00
});
