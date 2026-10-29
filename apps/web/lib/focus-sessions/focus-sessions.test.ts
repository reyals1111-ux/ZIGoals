import {expect, test} from 'vitest';
import {addSession, finishTally, focusMinutesBetween, gardenOf, onVisibility, outcomeOf, startTally, tallyAt} from './engine';
import {emptyFocusSessions, focusSessionsSchema} from './schema';

// Session AJ (item 34, D13): a session grows when it ran its length with little time away; otherwise it withers and is kept.
const T0 = Date.parse('2026-10-29T09:00:00Z'), min = (m: number) => T0 + m * 60_000;
test('time away is counted from the page being hidden; a full session with little away grows', () => {
  let t = startTally(T0, 25);
  t = onVisibility(t, true, min(10)); t = onVisibility(t, false, min(12)); // 2 min away
  expect(tallyAt(t, min(25))).toEqual({elapsed: 1500, away: 120, focused: 1380});
  expect(outcomeOf(t, min(25), false)).toBe('grown');
  t = onVisibility(t, true, min(13)); t = onVisibility(t, false, min(15)); // 4 min away in all: over 2.5 (a tenth of 25)
  expect(outcomeOf(t, min(25), false)).toBe('withered');
});
test('ending early withers it, and it is kept; under a minute keeps nothing', () => {
  const t = startTally(T0, 50);
  const e = finishTally(t, min(20), true, '2026-10-29', 'focus_aaaaaaaa-1')!;
  expect(e).toMatchObject({outcome: 'withered', plannedMinutes: 50, focusedSeconds: 1200, awaySeconds: 0, day: '2026-10-29'});
  expect(finishTally(t, T0 + 30_000, true, '2026-10-29', 'focus_aaaaaaaa-2')).toBeNull();
  const r = addSession(emptyFocusSessions(), e);
  expect(addSession(r, e)).toBe(r);
  expect(gardenOf(r, '2026-10-29')).toEqual({grown: 0, withered: 1, weekMinutes: 20, weekSessions: 1});
});
test('the garden and the week: grown and withered counted, the last 7 days\' focused minutes', () => {
  let r = emptyFocusSessions();
  const done = (day: string, startMin: number, length: number, early = false) => { const t = startTally(Date.parse(`${day}T09:00:00Z`), length); return finishTally(t, Date.parse(`${day}T09:00:00Z`) + (early ? length / 2 : length) * 60_000, early, day, `focus_${day}-${startMin}aaaa`)!; };
  r = addSession(r, done('2026-10-20', 1, 25)); r = addSession(r, done('2026-10-27', 2, 25)); r = addSession(r, done('2026-10-29', 3, 50, true));
  expect(gardenOf(r, '2026-10-29')).toEqual({grown: 2, withered: 1, weekMinutes: 50, weekSessions: 2});
  expect(focusMinutesBetween(r, '2026-10-20', '2026-10-26')).toEqual({minutes: 25, sessions: 1});
  expect(focusSessionsSchema.parse({...r, later: true})).toMatchObject({later: true});
});
