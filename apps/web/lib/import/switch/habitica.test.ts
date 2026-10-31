import {describe, expect, test} from 'vitest';
import {emptyHabitData} from '../../habits';
import {habiticaSchedule, readHabitica} from './habitica';
import {previewHabits} from './loop';

// Session AK (A15): Habitica's userdata.json. Fictional tasks.
const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const EXPORT = {
  profile: {name: 'Fictional'},
  tasks: {
    dailys: [
      {id: 'd-1', text: 'Stretch', notes: 'Five minutes', type: 'daily', frequency: 'weekly', everyX: 1, startDate: '2026-09-01T00:00:00.000Z', repeat: {m: true, t: false, w: true, th: false, f: true, s: false, su: false},
        history: [{date: day('2026-10-05'), value: 1, completed: true, isDue: true}, {date: day('2026-10-07'), value: 0, completed: false, isDue: true}, {date: day('2026-08-01'), value: 3}]},
      {id: 'd-2', text: 'Water plants', type: 'daily', frequency: 'daily', everyX: 3, startDate: '2026-10-01T00:00:00.000Z', history: []},
      {id: 'd-3', text: 'Pay rent', type: 'daily', frequency: 'monthly', everyX: 1, daysOfMonth: [1], startDate: '2026-01-01T00:00:00.000Z'},
      {id: 'd-4', text: '', type: 'daily'},
    ],
    habits: [
      {id: 'h-1', text: 'Drink water', type: 'habit', up: true, down: false, createdAt: '2026-10-01T00:00:00.000Z',
        history: [{date: day('2026-10-02'), value: 1, scoredUp: 2, scoredDown: 0}, {date: day('2026-10-02') + 3600_000, value: 2, scoredUp: 1, scoredDown: 0}, {date: day('2040-01-01'), scoredUp: 1}]},
      {id: 'h-2', text: 'Snacking', type: 'habit', up: false, down: true, createdAt: '2026-10-01T00:00:00.000Z', history: [{date: day('2026-10-03'), scoredUp: 0, scoredDown: 1}]},
    ],
    todos: [{id: 't-1', text: 'Buy milk'}], rewards: [{id: 'r-1', text: 'Cake'}],
  },
};
const ctx = {now: Date.parse('2026-10-31T12:00:00Z'), zone: 'UTC'};

describe('Habitica userdata.json', () => {
  test('schedules: weekdays, every few days, dates of the month, and what is only approximate', () => {
    expect(habiticaSchedule({frequency: 'weekly', repeat: {m: true, w: true, f: true}}, '2026-10-01')).toEqual({schedule: {kind: 'weekdays', days: [1, 3, 5]}, exact: true});
    expect(habiticaSchedule({frequency: 'weekly', everyX: 2, repeat: {m: true}}, '2026-10-01')).toEqual({schedule: {kind: 'weekdays', days: [1]}, exact: false});
    expect(habiticaSchedule({frequency: 'daily', everyX: 3}, '2026-10-01')).toEqual({schedule: {kind: 'interval', every: 3, anchor: '2026-10-01'}, exact: true});
    expect(habiticaSchedule({frequency: 'monthly', daysOfMonth: [15, 1]}, '2026-10-01')).toEqual({schedule: {kind: 'month-dates', days: [1, 15]}, exact: true});
    expect(habiticaSchedule({frequency: 'monthly', weeksOfMonth: [0]}, '2026-10-01').exact).toBe(false);
  });
  test('dailies and habits become habits; only day-by-day history is checked in; to-dos and rewards left out', () => {
    const plan = readHabitica(JSON.stringify(EXPORT), ctx);
    expect(plan.habits.map(h => h.title)).toEqual(['Stretch', 'Water plants', 'Pay rent', 'Drink water', 'Snacking']);
    const [stretch, plants, rent, water, snack] = plan.habits;
    expect(stretch!.rules[0]).toMatchObject({schedule: {kind: 'weekdays', days: [1, 3, 5]}, measurement: {kind: 'boolean'}, target: 1});
    expect(stretch!.description).toBe('Five minutes');
    expect(stretch!.entries.map(e => [e.date, e.count])).toEqual([['2026-10-05', 1]]);
    expect(plants!.rules[0]!.schedule).toEqual({kind: 'interval', every: 3, anchor: '2026-10-01'});
    expect(rent!.rules[0]!.schedule).toEqual({kind: 'month-dates', days: [1]});
    expect(water!.rules[0]).toMatchObject({type: 'build', measurement: {kind: 'count', unit: 'times'}});
    expect(water!.entries.map(e => [e.date, e.count])).toEqual([['2026-10-02', 3]]);
    expect(snack!.rules[0]).toMatchObject({type: 'quit', target: 0});
    expect(snack!.entries.map(e => [e.date, e.count])).toEqual([['2026-10-03', 1]]);
    expect(plan.warnings.join(' ')).toMatch(/2 to-dos and rewards/);
    expect(plan.warnings.join(' ')).toMatch(/only as averages/);
    expect(plan.warnings.join(' ')).toMatch(/1 task could not be read/);
  });
  test('applied like Loop’s: the same export twice adds nothing new', () => {
    const plan = readHabitica(JSON.stringify(EXPORT), ctx);
    const first = previewHabits(emptyHabitData(), plan.habits);
    expect(first.created).toHaveLength(5);
    const second = previewHabits(first.next, plan.habits);
    expect(second.created).toHaveLength(0); expect(second.entries).toHaveLength(0);
  });
  test('refusals', () => {
    expect(() => readHabitica('', ctx)).toThrow(/empty/);
    expect(() => readHabitica('{not json', ctx)).toThrow(/not JSON/);
    expect(() => readHabitica(JSON.stringify({tasks: {todos: []}}), ctx)).toThrow(/not Habitica’s userdata.json/);
    expect(() => readHabitica(JSON.stringify({tasks: {habits: [{text: ''}]}}), ctx)).toThrow(/no habits or dailies ZIGoals can read/);
  });
});
