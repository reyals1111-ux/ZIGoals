import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, setHabitEntryStatus, type HabitInput} from '../habits';
import {habitsOnDay} from '../numbers/counts';
import {groupByTimeOfDay, sectionCountText} from './sections';

// Session AK (FU, rule TR6): a section's "X / Y" agrees with the page's own count: a habit skipped today is not due.
// Fictional data.
const today = '2026-09-23', WALK = '59a35604-3696-4a78-b455-4015acb66885', READ = '6e0f3f52-1d2b-4a5e-9a51-1f2f1d7c8a01';
const input = (title: string, timeOfDay: HabitInput['timeOfDay']): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1, timeOfDay});
const at = new Date('2026-09-01T12:00:00'), morning = new Date(`${today}T08:00:00`);
const section = (habits: ReturnType<typeof emptyHabitData>['habits'], id: string) => groupByTimeOfDay(habits, today).find(s => s.id === id)!;

test('a morning habit reads "0 / 1" while due, and "none due" once it is skipped today, as the page counts it', () => {
  let h = createHabit(emptyHabitData(), input('Fictional walk', 'morning'), at, WALK);
  const before = section(h.habits, 'morning');
  expect([before.habits.length, before.due, before.done]).toEqual([1, 1, 0]);
  expect(sectionCountText(before)).toEqual({count: '0 / 1', spoken: '0 of 1 due habits complete'});
  h = setHabitEntryStatus(h, WALK, today, 'skipped', '', morning); // a rest day
  const after = section(h.habits, 'morning');
  expect(after.habits.map(x => x.id)).toEqual([WALK]); // still listed in its section
  expect([after.due, after.done]).toEqual([0, 0]);
  expect(sectionCountText(after)).toEqual({count: 'none due', spoken: 'none due today'});
  expect(habitsOnDay(h.habits, today, today)).toEqual({due: after.due, done: after.done});
});

test('every section together adds up to the page count, with a skip, a done and an open habit', () => {
  let h = createHabit(emptyHabitData(), input('Fictional walk', 'morning'), at, WALK);
  h = createHabit(h, input('Fictional read', 'morning'), at, READ);
  h = createHabit(h, input('Fictional stretch', 'evening'), at, '7a1e4c3b-2f0d-4e6a-8b9c-0d1e2f3a4b5c');
  h = logHabitCount(h, READ, today, 1, '', morning);
  h = setHabitEntryStatus(h, WALK, today, 'skipped', '', morning);
  const sections = groupByTimeOfDay(h.habits, today);
  expect(sectionCountText(sections.find(s => s.id === 'morning')!).count).toBe('1 / 1');
  expect(sectionCountText(sections.find(s => s.id === 'evening')!).count).toBe('0 / 1');
  expect(sectionCountText(sections.find(s => s.id === 'afternoon')!)).toEqual({count: 'empty', spoken: 'no habits here'});
  const total = sections.reduce((sum, s) => ({due: sum.due + s.due, done: sum.done + s.done}), {due: 0, done: 0});
  expect(total).toEqual(habitsOnDay(h.habits, today, today));
});
