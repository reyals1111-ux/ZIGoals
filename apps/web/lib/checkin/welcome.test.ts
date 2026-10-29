import {expect, test} from 'vitest';
import {welcomeBack} from './checkin';
// Session AJ (item 10; P4 moment 7).
test('welcome back after 7 days or more; never on a first visit or a later day the same week', () => {
  expect(welcomeBack(undefined, '2026-10-29')).toBe(false);
  expect(welcomeBack('2026-10-22', '2026-10-29')).toBe(true);
  expect(welcomeBack('2026-10-23', '2026-10-29')).toBe(false);
  expect(welcomeBack('2026-10-29', '2026-10-29')).toBe(false);
});
test('the last entry day comes from the records (habits, food, activity, weights, water), never a later day', async () => {
  const {lastEntryDay} = await import('./checkin');
  const habits = {habits: [{entries: [{date: '2026-10-10'}, {date: '2026-10-20'}]}]};
  const health = {diary: [{date: '2026-10-18'}], activity: [], weights: [{date: '2026-10-21'}], daily: {water: [{date: '2026-11-02'}]}};
  expect(lastEntryDay(habits, health, '2026-10-29')).toBe('2026-10-21');
  expect(lastEntryDay(habits, health, '2026-11-02')).toBe('2026-11-02');
  expect(lastEntryDay({habits: []}, {diary: [], activity: [], weights: []}, '2026-10-29')).toBeUndefined();
});
