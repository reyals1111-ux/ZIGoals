import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import {weekDays, weekGrid} from './week-grid';

/** Session AV (owner follow-up 1, F-WEEK-GRID): one week, Monday to Sunday, every habit a row. */
const START = new Date('2026-11-01T09:00:00Z'), NOW = new Date('2026-11-25T09:00:00Z');
describe('Session AV (F-WEEK-GRID)', () => {
  it('Monday to Sunday, this week and the one before', () => {
    expect(weekDays('2026-11-25')).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(weekDays('2026-11-29', -1)[0]).toBe('2026-11-16');
    expect(weekDays('2026-11-23')[0]).toBe('2026-11-23');
  });
  it('done, missed and open days; later days never tappable', () => {
    let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, 'aaaaaaaa-0000-4000-8000-000000000001');
    d = logHabitValue(d, 'aaaaaaaa-0000-4000-8000-000000000001', '2026-11-23', 1, {}, NOW);
    const row = weekGrid(d.habits, '2026-11-25').rows[0]!;
    expect(row.cells.map(c => [c.status, c.tappable])).toEqual([['complete', true], ['failed', true], ['due', true], ['future', false], ['future', false], ['future', false], ['future', false]]);
  });
});
