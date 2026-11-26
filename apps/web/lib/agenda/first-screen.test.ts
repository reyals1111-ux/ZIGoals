import {describe, expect, it} from 'vitest';
import {agendaAddDay, quietRangeWords} from './first-screen';

describe('Session AW (simplicity-b): the Agenda add field and its empty line', () => {
  const week = {from: '2026-11-23', to: '2026-11-29'};
  it('adds to the chosen day when it is today or later', () => {
    expect(agendaAddDay({at: '2026-11-25', today: '2026-11-25', ...week})).toBe('2026-11-25');
    expect(agendaAddDay({at: '2026-12-02', today: '2026-11-25', from: '2026-11-30', to: '2026-12-06'})).toBe('2026-12-02');
  });
  it('falls back to today when the range shows it, and offers nothing for a range in the past', () => {
    expect(agendaAddDay({at: '2026-11-23', today: '2026-11-25', ...week})).toBe('2026-11-25');
    expect(agendaAddDay({at: '2026-11-18', today: '2026-11-25', from: '2026-11-16', to: '2026-11-22'})).toBeNull();
    expect(agendaAddDay({at: '2026-11-24', today: '2026-11-25', from: '2026-11-24', to: '2026-11-24'})).toBeNull();
  });
  it('says one line for an empty day or week, inviting a task only where one can be added', () => {
    expect(quietRangeWords('week', true)).toBe('Nothing planned this week yet. Add a task above, or a habit, a bill or a meal plan: each one shows here on its day.');
    expect(quietRangeWords('day', true)).toMatch(/^Nothing planned on this day yet\. Add a task above/);
    expect(quietRangeWords('day', false)).toBe('Nothing was planned on this day.');
    expect(quietRangeWords('week', false)).toBe('Nothing was planned in this week.');
  });
});
