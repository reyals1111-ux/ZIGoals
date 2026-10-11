import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData} from '../habits';
import {allDoneNoteId, checkInFacts} from './zigi-facts';

// Session X-Local Part 4: the facts behind ZIGi's calm celebrations come from the habit engine, never from words.
const A = '59a35604-3696-4a78-b455-4015acb66885', B = '6b2d1c0e-1b2f-4c3d-8e4f-5a6b7c8d9e0f', TODAY = '2026-09-20';
const base = (): HabitData => {
  let d = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), A);
  d = createHabit(d, {title: 'Read', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), B);
  return {...d, timeZone: 'UTC'} as HabitData;
};
const done = (d: HabitData, id: string, dates: string[]) => dates.reduce((x, date) => logHabitValue(x, id, date, 1, {}, new Date(`${date}T20:00:00Z`)), d);
test('a check-in that completes a habit is a small success; one that is not complete yet is nothing', () => {
  const before = base(), after = done(before, A, [TODAY]);
  expect(checkInFacts(before, after, A, TODAY)).toEqual({completed: true, streakMilestone: null, allDone: false});
  expect(checkInFacts(after, after, A, TODAY)).toEqual({completed: false, streakMilestone: null, allDone: false});
  expect(checkInFacts(before, after, 'missing', TODAY)).toEqual({completed: false, streakMilestone: null, allDone: false});
});
test('a streak milestone is counted by the engine (7 days) and only when the streak grew onto it', () => {
  const six = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'];
  const before = done(base(), A, six), after = done(before, A, [TODAY]);
  expect(checkInFacts(before, after, A, TODAY).streakMilestone).toBe(7);
  const five = done(base(), A, six.slice(1)), six2 = done(five, A, [TODAY]);
  expect(checkInFacts(five, six2, A, TODAY).streakMilestone).toBeNull();
});
test('all done only when every habit scheduled today is complete, after the check-in that finished the last one', () => {
  const before = done(base(), B, [TODAY]), after = done(before, A, [TODAY]);
  expect(checkInFacts(before, after, A, TODAY).allDone).toBe(true);
  expect(checkInFacts(base(), done(base(), A, [TODAY]), A, TODAY).allDone).toBe(false);
  expect(allDoneNoteId(TODAY)).toBe('all-done:2026-09-20');
});
