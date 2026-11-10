import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, type HabitInput} from '../habits';
import {instantAt} from '../zone-time';
import {showcaseHabitsAa} from './showcase';

/** Session AL second pass (L3; PR-047): the Showcase Read timer never starts after the clock, even at 03:15. Fictional. */
test('PR-047: the Showcase Read timer starts at the day\'s start, before 03:15, and is the same bytes for the same day', () => {
  const read: HabitInput = {title: 'Read', category: 'Learning', description: '', notes: '', type: 'build', measurement: {kind: 'duration', unit: 'minutes'}, schedule: {kind: 'daily'}, target: 30, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
  const zone = 'Europe/Brussels', day = '2026-11-04';
  const base = createHabit(emptyHabitData(), read, new Date('2026-10-01T08:00:00Z'), '92000000-0000-4000-8000-000000000001');
  const out = showcaseHabitsAa(base, day, zone), timer = out.habits.find(h => h.title === 'Read')!.timer!;
  expect(Date.parse(timer.startedAt)).toBeLessThanOrEqual(instantAt(day, '03:15', zone));
  expect(timer.state).toBe('paused');
  expect(timer.elapsedMs).toBe(25 * 60_000);
  expect(JSON.stringify(showcaseHabitsAa(base, day, zone))).toBe(JSON.stringify(out));
});
