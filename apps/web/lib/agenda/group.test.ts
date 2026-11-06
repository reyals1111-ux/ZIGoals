import {describe, expect, it} from 'vitest';
import {daySummary, foldAnytimeHabits} from './group';

/** Session AL (DV-193, DV-194, P-DV-125): the week's habits folded into one row; a month cell says what it holds. */
describe('Agenda grouping', () => {
  const items = [
    {id: 'h1', source: 'habit', time: null}, {id: 't1', source: 'task', time: '09:30'}, {id: 'h2', source: 'habit', time: null},
    {id: 'h3', source: 'habit', time: '07:00'}, {id: 'b1', source: 'bill', time: null},
  ];
  it('habits with no time fold into one row when there are two or more; timed habits and everything else stay, in order', () => {
    const {habits, rest} = foldAnytimeHabits(items);
    expect(habits.map(i => i.id)).toEqual(['h1', 'h2']);
    expect(rest.map(i => i.id)).toEqual(['t1', 'h3', 'b1']);
    expect(foldAnytimeHabits(items.filter(i => i.id !== 'h2')).habits).toEqual([]);
  });
  it('a day in words, tasks first', () => {
    expect(daySummary(items)).toBe('1 task · 3 habits · 1 bill');
    expect(daySummary([])).toBe('');
  });
});
