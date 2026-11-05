import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData} from '../habits';
import {nextHabitDay} from './next-day';

describe('Session AL L5-4 (C-DVG-76): the next day a habit is due', () => {
  const now = new Date('2026-11-04T09:00:00Z'); // a Wednesday
  const make = (schedule: unknown) => createHabit(emptyHabitData(), {title: 'Morning run', category: 'Health', description: '', notes: '', schedule, target: 1, type: 'build', measurement: {kind: 'boolean'}, targetPeriod: 'day', endCondition: {kind: 'none'}, timeOfDay: 'anytime'} as never, now, '00000000-0000-4000-8000-000000000001').habits[0]!;
  it('a weekdays habit due Mon and Fri: next after Wednesday is Friday', () => {
    expect(nextHabitDay(make({kind: 'weekdays', days: [1, 5]}), '2026-11-04')).toBe('2026-11-06');
  });
  it('a daily habit: tomorrow', () => {
    expect(nextHabitDay(make({kind: 'daily'}), '2026-11-04')).toBe('2026-11-05');
  });
});
