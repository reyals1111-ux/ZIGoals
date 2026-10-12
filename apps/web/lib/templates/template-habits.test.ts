import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData} from '../habits';
import {GOAL_LIBRARY} from './goal-library';
import {templateHabitInput} from './template-habits';

describe('template habits are valid Habits input (Session AA-Cloud Part 2)', () => {
  it('every suggested habit in the library makes a habit through Habits’ own createHabit', () => {
    let data = emptyHabitData();
    let n = 0;
    for (const t of GOAL_LIBRARY) for (const h of t.habits ?? []) { data = createHabit(data, templateHabitInput(h, t.area), new Date('2026-10-11T09:00:00.000Z'), `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`); }
    expect(data.habits).toHaveLength(n);
    expect(n).toBeGreaterThan(20);
    expect(data.habits.find(h => h.title === 'Easy run')!.rules[0]!.schedule).toEqual({kind: 'frequency', times: 3, period: 'week'});
    expect(data.habits.find(h => h.title === 'Study 30 minutes')!.rules[0]!.schedule).toEqual({kind: 'weekdays', days: [1, 2, 3, 4, 5]});
    expect(data.habits.find(h => h.title === 'Read 20 pages')!.category).toBe('Learning');
  });
});
