import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData} from './habits';
import {yesterdaysOpen} from './habits-yesterday';

/** Session AV (owner follow-up 1, F-YESTERDAY): yesterday's open daily habits, to tick late in one go. */
const START = new Date('2026-11-01T09:00:00Z'), NOW = new Date('2026-11-23T09:00:00Z'), TODAY = '2026-11-23', YESTERDAY = '2026-11-22';
describe('Session AV (F-YESTERDAY)', () => {
  it('lists yesterday\'s open and part-done build habits with what is missing; done, skipped and quit habits are left out', () => {
    const base = {category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}} as const;
    let d: HabitData = emptyHabitData();
    d = createHabit(d, {...base, title: 'Fictional walk', measurement: {kind: 'boolean'}, target: 1}, START);
    d = createHabit(d, {...base, title: 'Water glasses', measurement: {kind: 'count', unit: 'glasses'}, target: 8}, START);
    d = createHabit(d, {...base, title: 'Stretch', measurement: {kind: 'boolean'}, target: 1}, START);
    d = createHabit(d, {...base, title: 'Read', measurement: {kind: 'boolean'}, target: 1}, START);
    d = createHabit(d, {...base, title: 'No sweets', type: 'quit', measurement: {kind: 'boolean'}, target: 0}, START);
    const id = (t: string) => d.habits.find(h => h.title === t)!.id;
    d = logHabitValue(d, id('Water glasses'), YESTERDAY, 3, {}, NOW);
    d = logHabitValue(d, id('Stretch'), YESTERDAY, 1, {}, NOW);
    d = setHabitEntryStatus(d, id('Read'), YESTERDAY, 'skipped', '', NOW);
    const r = yesterdaysOpen(d, TODAY);
    expect(r.day).toBe(YESTERDAY);
    expect(r.open.map(o => [o.title, o.count, o.target, o.missing])).toEqual([['Fictional walk', 0, 1, 1], ['Water glasses', 3, 8, 5]]);
    expect(r.loggedToday).toBe(false);
    expect(yesterdaysOpen(logHabitValue(d, id('Stretch'), TODAY, 1, {}, NOW), TODAY).loggedToday).toBe(true);
  });
});
