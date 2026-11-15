import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitDay, habitStats, logHabitCount, setHabitEntryStatus, setHabitState, type HabitData, type HabitInput} from '../../habits';
import {habitsHud} from '../holo/habits';
import {cellWords, habitWeek, streakNote, weekCell} from './habit-week';

const A = '59a35604-3696-4a78-b455-4015acb66885', B = '59a35604-3696-4a78-b455-4015acb66886', C = '59a35604-3696-4a78-b455-4015acb66887';
const input: HabitInput = {title: 'Fictional walk', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const at = (day: string) => new Date(`${day}T12:00:00`);
/** 2026-11-11 is a Wednesday. */
const TODAY = '2026-11-11';

describe('Habits this week: the Habits page\'s own engine, a row per active habit', () => {
  it('no habits: nothing to show, nothing counted', () => {
    const week = habitWeek([], TODAY);
    expect(week).toMatchObject({count: 0, active: 0, due: 0, done: 0, rows: [], more: 0, weekDue: 0, weekDone: 0, longest: null});
    expect(week.days).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']);
  });

  it('a daily habit: done, not done, and today still to come (never "missed" while it is today)', () => {
    let data: HabitData = createHabit(emptyHabitData(), input, at('2026-11-01'), A);
    for (const day of ['2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-10']) data = logHabitCount(data, A, day, 1, '', at(TODAY));
    const week = habitWeek(data.habits, TODAY);
    expect(week.rows[0]).toMatchObject({title: 'Fictional walk', cells: ['done', 'done', 'missed', 'done', 'done', 'done', 'ahead'], streak: 3, unit: 'days'});
    expect([week.due, week.done]).toEqual([1, 0]);
    expect([week.weekDue, week.weekDone]).toEqual([7, 5]);
    expect(week.longest).toEqual({title: 'Fictional walk', streak: 3, unit: 'days'});
    // Done today: the cell lights and today counts.
    data = logHabitCount(data, A, TODAY, 1, '', at(TODAY));
    const after = habitWeek(data.habits, TODAY);
    expect(after.rows[0]!.cells.at(-1)).toBe('done');
    expect([after.due, after.done]).toEqual([1, 1]);
    expect(after.rows[0]!.streak).toBe(habitStats(data.habits[0]!, TODAY).currentStreak);
  });

  it('today\'s count is the Habits HUD\'s (a skipped day is not due), and each cell is the engine\'s own day', () => {
    let data: HabitData = createHabit(emptyHabitData(), input, at('2026-11-01'), A);
    data = createHabit(data, {...input, title: 'Fictional read'}, at('2026-11-01'), B);
    data = createHabit(data, {...input, title: 'Fictional stretch'}, at('2026-11-01'), C);
    data = logHabitCount(data, A, TODAY, 1, '', at(TODAY));
    data = setHabitEntryStatus(data, B, TODAY, 'skipped', '', at(TODAY));
    data = setHabitEntryStatus(data, C, TODAY, 'failed', '', at(TODAY));
    const week = habitWeek(data.habits, TODAY), hud = habitsHud(data.habits, TODAY);
    expect([week.due, week.done]).toEqual([hud.due, hud.done]);
    expect([week.due, week.done]).toEqual([2, 1]);
    expect(week.rows.map(r => r.cells.at(-1))).toEqual(['done', 'rest', 'missed']);
    for (const row of week.rows) row.cells.forEach((cell, i) => expect(cell).toBe(weekCell(habitDay(data.habits.find(h => h.id === row.id)!, week.days[i]!, TODAY).status)));
  });

  it('days before a habit began and days it is not scheduled are rest, not missed', () => {
    let data: HabitData = createHabit(emptyHabitData(), input, at('2026-11-09'), A);
    // Monday, Wednesday and Friday only (0 = Sunday).
    data = createHabit(data, {...input, title: 'Fictional gym', schedule: {kind: 'weekdays', days: [1, 3, 5]}}, at('2026-10-01'), B);
    const week = habitWeek(data.habits, TODAY);
    expect(week.rows[0]!.cells).toEqual(['rest', 'rest', 'rest', 'rest', 'missed', 'missed', 'ahead']);
    expect(week.rows[1]!.cells).toEqual(['rest', 'missed', 'rest', 'rest', 'missed', 'rest', 'ahead']);
    expect(week.weekDue).toBe(6);
  });

  it('paused habits are counted but not rows; rows are capped and the rest is "more"', () => {
    let data: HabitData = emptyHabitData();
    const ids = Array.from({length: 6}, (_, i) => `59a35604-3696-4a78-b455-4015acb6689${i}`);
    ids.forEach((id, i) => { data = createHabit(data, {...input, title: `Fictional habit ${i + 1}`}, at('2026-11-01'), id); });
    data = setHabitState(data, ids[5]!, 'paused', at(TODAY));
    const m = habitWeek(data.habits, TODAY, 4), l = habitWeek(data.habits, TODAY, 8);
    expect([m.count, m.active, m.rows.length, m.more]).toEqual([6, 5, 4, 1]);
    expect(m.rows.map(r => r.title)).toEqual(['Fictional habit 1', 'Fictional habit 2', 'Fictional habit 3', 'Fictional habit 4']);
    expect([l.rows.length, l.more]).toEqual([5, 0]);
    // The week's totals cover every active habit, not only the rows shown.
    expect(m.weekDue).toBe(l.weekDue);
    // Every habit paused: nothing active, and the widget says so instead of drawing an empty lattice.
    for (const id of ids.slice(0, 5)) data = setHabitState(data, id, 'paused', at(TODAY));
    expect(habitWeek(data.habits, TODAY)).toMatchObject({count: 6, active: 0, rows: [], due: 0});
  });

  it('the seven days cross a month and a year without a gap', () => {
    expect(habitWeek([], '2026-11-02').days).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(habitWeek([], '2027-01-02').days).toEqual(['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(habitWeek([], '2028-03-02').days).toEqual(['2028-02-25', '2028-02-26', '2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02']);
    const data = createHabit(emptyHabitData(), input, at('2026-12-30'), A);
    expect(habitWeek(data.habits, '2027-01-02').rows[0]!.cells).toEqual(['rest', 'rest', 'rest', 'missed', 'missed', 'missed', 'ahead']);
  });

  it('cells and streaks in words', () => {
    expect(['complete', 'partial', 'failed', 'due', 'skipped', 'not-scheduled', 'paused', 'archived', 'not-started', 'planned-skip'].map(s => weekCell(s as Parameters<typeof weekCell>[0])))
      .toEqual(['done', 'part', 'missed', 'ahead', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']);
    expect([streakNote(12, 'days'), streakNote(3, 'weeks'), streakNote(2, 'months'), streakNote(1, 'years'), streakNote(0, 'days')]).toEqual(['12 d', '3 wk', '2 mo', '1 yr', '']);
    expect(cellWords('ahead')).toBe('still to come');
    expect(cellWords('missed')).toBe('not done');
  });
});
