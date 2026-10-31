import {describe, expect, test} from 'vitest';
import type {Habit} from '../habits';
import {addLocalDays} from '../local-date';
import {createHabit, emptyHabitData, habitDataSchema} from '../habits';
import {showcaseUsualTime} from './showcase';
import {checkInMinutes, clockDistance, clockOf, suggestHabitTime, usualTime} from './suggest';

const TODAY = '2026-10-31', ZONE = 'Europe/Brussels';
type Entry = Habit['entries'][number];
// Brussels is UTC+1 on 31 Oct 2026 (after the clock change on 25 Oct) and UTC+2 before.
const entry = (offset: number, utc: string, extra: Partial<Entry> = {}): Entry => ({date: addLocalDays(TODAY, offset), count: 1, disposition: 'logged', note: '', updatedAt: `${addLocalDays(TODAY, offset)}T${utc}:00.000Z`, ...extra});
const habit = (entries: Entry[], type: 'build' | 'quit' = 'build', state: 'active' | 'archived' = 'active') => ({entries, rules: [{type, state}]}) as unknown as Pick<Habit, 'entries' | 'rules'>;

describe('smart time suggestions (learned on the device, offered only)', () => {
  test('only same-day manual check-ins inside the window count, in the journal zone', () => {
    const list = [entry(-1, '06:40'), entry(-2, '05:40'), entry(-3, '06:00', {source: 'health'}), entry(-4, '06:00', {disposition: 'skipped', count: 0}), entry(-60, '06:00'), {...entry(-5, '06:00'), updatedAt: `${addLocalDays(TODAY, -3)}T06:00:00.000Z`}];
    // −1: 06:40 UTC = 07:40 (UTC+1); −2: 29 Oct 05:40 UTC = 06:40 (UTC+1)
    expect(checkInMinutes(list, ZONE, TODAY)).toEqual([7 * 60 + 40, 6 * 60 + 40]);
  });
  test('the usual time: median rounded to five minutes, null when scattered or too few', () => {
    expect(usualTime([460, 455, 470, 462, 458])).toEqual({time: '07:40', samples: 5, spreadMinutes: 4});
    expect(usualTime([460, 455, 470, 462])).toBeNull();
    expect(usualTime([360, 600, 900, 1200, 480, 700])).toBeNull();
    expect(usualTime([])).toBeNull();
  });
  test('across midnight 23:50 and 00:10 sit together', () => {
    expect(usualTime([1430, 10, 1435, 5, 0])?.time).toBe('00:00');
    expect(clockOf(1445)).toBe('00:05'); expect(clockOf(-5)).toBe('23:55');
    expect(clockDistance('23:55', '00:05')).toBe(10); expect(clockDistance('07:00', '19:00')).toBe(720);
  });
  test('a build habit gets an offer unless its reminder is already close; quit and archived habits never', () => {
    const list = [-1, -2, -3, -4, -5, -6].map(n => entry(n, n >= -6 && addLocalDays(TODAY, n) >= '2026-10-25' ? '06:40' : '05:40'));
    expect(suggestHabitTime(habit(list), ZONE, TODAY)?.time).toBe('07:40');
    expect(suggestHabitTime(habit(list), ZONE, TODAY, '07:30')).toBeNull();
    expect(suggestHabitTime(habit(list), ZONE, TODAY, '09:00')?.time).toBe('07:40');
    expect(suggestHabitTime(habit(list, 'quit'), ZONE, TODAY)).toBeNull();
    expect(suggestHabitTime(habit(list, 'build', 'archived'), ZONE, TODAY)).toBeNull();
    expect(suggestHabitTime(habit([]), ZONE, TODAY)).toBeNull();
  });
  test('the optional Showcase helper gives Read a usual time and leaves today and other habits alone', () => {
    const base = createHabit(emptyHabitData(), {title: 'Read', category: 'Learning', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, new Date('2026-10-01T00:00:00Z'), '11111111-1111-4111-8111-111111111111');
    const scattered = Array.from({length: 20}, (_, n) => { const d = addLocalDays(TODAY, -n); return {date: d, count: 1, disposition: 'logged' as const, note: '', updatedAt: `${d}T${String(6 + n % 4).padStart(2, '0')}:10:00.000Z`}; }).reverse();
    const habits = habitDataSchema.parse({...base, habits: [{...base.habits[0]!, entries: scattered}]});
    expect(suggestHabitTime(habits.habits[0]!, ZONE, TODAY)).toBeNull();
    const moved = showcaseUsualTime(habits, TODAY, ZONE);
    expect(suggestHabitTime(moved.habits[0]!, ZONE, TODAY)?.time).toBe('07:40');
    expect(moved.habits[0]!.entries.at(-1)).toEqual(habits.habits[0]!.entries.at(-1));
    expect(showcaseUsualTime(habits, TODAY, ZONE, 'Walk')).toEqual(habits);
  });
});
