import {describe, expect, test} from 'vitest';
import {todayFocus, type HabitSection} from './sections';
import type {Habit} from '../habits';

const h = (title: string) => ({id: title, title} as unknown as Habit);
const section = (id: HabitSection['id'], titles: string[]): HabitSection => ({id, label: id, habits: titles.map(h), due: titles.length, done: 0});
const all = [section('morning', ['Read', 'Stretch']), section('afternoon', ['Walk']), section('evening', ['Meditate', 'Snacks']), section('anytime', ['Contribute', 'Water'])];

describe('todayFocus (ADR-022 B49: Today lists at most five due habits, the clock\'s part of the day first)', () => {
  test('starts at the clock\'s section and wraps past Anytime', () => {
    const r = todayFocus(all, 20); // evening
    expect(r.sections.map(s => s.id)).toEqual(['evening', 'anytime', 'morning']);
    expect(r.sections.flatMap(s => s.habits.map(x => x.title))).toEqual(['Meditate', 'Snacks', 'Contribute', 'Water', 'Read']);
    expect(r.hidden).toBe(2);
  });
  test('under the cap nothing is hidden and empty sections stay away', () => {
    const r = todayFocus([section('morning', ['Read']), section('afternoon', []), section('evening', ['Meditate'])], 9);
    expect(r.sections.map(s => s.id)).toEqual(['morning', 'evening']); expect(r.hidden).toBe(0);
  });
  test('a custom cap and a cap of zero', () => {
    expect(todayFocus(all, 9, 2)).toMatchObject({hidden: 5}); expect(todayFocus(all, 9, 0)).toMatchObject({sections: [], hidden: 7});
  });
});
