import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData, type HabitInput} from '../habits';
import {firstHabitDay, habitOnDayWords, habitsOnDay, perfectDay, perfectDayWords, perfectMonth, perfectRun, shiftMonth} from './perfect-days';

// Session AO (C-DVG-19): perfect days from Habits' own records; nothing stored, nothing written.
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
const ID = {a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222', c: '33333333-3333-4333-8333-333333333333'};
const START = '2026-11-02'; // a Monday
const at = (date: string) => new Date(`${date}T10:00:00Z`);
const TODAY = '2026-11-12';
const log = (d: HabitData, id: string, date: string, value = 1) => logHabitValue(d, id, date, value, {}, at(TODAY));

function journal(): HabitData {
  let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
  d = createHabit(d, input('Stretch'), at(START), ID.a);
  // Weekdays only (Mon–Fri): weekends have it not due.
  d = createHabit(d, input('Read', {schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}), at(START), ID.b);
  return d;
}

describe('perfect days (C-DVG-19)', () => {
  test('a day is perfect when every due habit is done, partly with k of m, no record when nothing was logged', () => {
    let d = journal();
    d = log(log(d, ID.a, '2026-11-02'), ID.b, '2026-11-02'); // Mon: both
    d = log(d, ID.a, '2026-11-03'); // Tue: 1 of 2
    // Wed: nothing logged at all
    const h = d.habits;
    expect(perfectDay(h, '2026-11-02', TODAY)).toMatchObject({kind: 'perfect', done: 2, due: 2});
    expect(perfectDay(h, '2026-11-03', TODAY)).toMatchObject({kind: 'partly', done: 1, due: 2});
    expect(perfectDay(h, '2026-11-04', TODAY)).toMatchObject({kind: 'no-record', done: 0, due: 2});
    expect(perfectDayWords(perfectDay(h, '2026-11-03', TODAY))).toEqual({mark: '1/2', text: '1 of 2 due habits done'});
    expect(perfectDayWords(perfectDay(h, '2026-11-04', TODAY)).mark).toBe('None');
  });

  test('a day marked missed has a record: "partly" 0 of m, never "no record"', () => {
    const d = setHabitEntryStatus(journal(), ID.a, '2026-11-04', 'failed', '', at(TODAY));
    expect(perfectDay(d.habits, '2026-11-04', TODAY)).toMatchObject({kind: 'partly', done: 0, due: 2});
  });

  test('days before a habit started, days with nothing due and days ahead are never counted as missed', () => {
    let d = journal();
    d = log(d, ID.a, '2026-11-07'); // Sat: only Stretch is due, and it is done
    const h = d.habits;
    expect(perfectDay(h, '2026-11-01', TODAY).kind).toBe('nothing-due'); // before the start
    expect(perfectDay(h, '2026-11-07', TODAY)).toMatchObject({kind: 'perfect', done: 1, due: 1});
    expect(perfectDay(h, '2026-11-13', TODAY).kind).toBe('ahead');
    expect(habitsOnDay(h, '2026-11-01', TODAY)).toEqual([]);
    expect(firstHabitDay(h)).toBe(START);
    expect(firstHabitDay([])).toBeNull();
  });

  test('a skipped day is a rest (the Checklist rule): it leaves the count, so the rest of the day can still be perfect', () => {
    let d = journal();
    d = setHabitEntryStatus(d, ID.b, '2026-11-05', 'skipped', '', at(TODAY));
    d = log(d, ID.a, '2026-11-05');
    const day = perfectDay(d.habits, '2026-11-05', TODAY);
    expect(day).toMatchObject({kind: 'perfect', done: 1, due: 1});
    const read = habitsOnDay(d.habits, '2026-11-05', TODAY).find(x => x.id === ID.b)!;
    expect(read.state).toBe('rest');
    expect(habitOnDayWords(read, false)).toBe('Skipped: a rest day');
  });

  test('an "X times a week" habit is done on a day it was checked in, and is not due on a past day without one', () => {
    let d = journal();
    d = createHabit(d, input('Gym', {schedule: {kind: 'frequency', times: 3, period: 'week'}}), at(START), ID.c);
    d = log(log(d, ID.a, '2026-11-09'), ID.b, '2026-11-09');
    d = log(d, ID.c, '2026-11-09');
    expect(perfectDay(d.habits, '2026-11-09', TODAY)).toMatchObject({kind: 'perfect', done: 3, due: 3});
    d = log(log(d, ID.a, '2026-11-10'), ID.b, '2026-11-10');
    expect(perfectDay(d.habits, '2026-11-10', TODAY)).toMatchObject({kind: 'perfect', done: 2, due: 2});
    expect(habitsOnDay(d.habits, '2026-11-10', TODAY).find(x => x.id === ID.c)?.state).toBe('rest');
  });

  test('today: "so far", and an unfinished today never breaks the run; a nothing-due day neither counts nor breaks it', () => {
    let d = journal();
    // Fri 6 and Sat 7 and Sun 8 perfect (Sat/Sun only Stretch due), Mon 9 to Wed 11 perfect, today (Thu 12) 1 of 2.
    for (const day of ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']) {
      d = log(d, ID.a, day);
      if (!['2026-11-07', '2026-11-08'].includes(day)) d = log(d, ID.b, day);
    }
    d = log(d, ID.a, TODAY);
    const today = perfectDay(d.habits, TODAY, TODAY);
    expect(today).toMatchObject({kind: 'partly', done: 1, due: 2, isToday: true});
    expect(perfectDayWords(today).text).toBe('1 of 2 due habits done so far');
    expect(perfectRun(d.habits, TODAY)).toBe(6); // 6–11 Nov; Thu 5 had nothing logged, so the run starts on the 6th
    d = log(d, ID.b, TODAY);
    expect(perfectRun(d.habits, TODAY)).toBe(7);
    // The days before the first habit started end the walk back; they are not a break.
    let e = journal();
    for (const day of ['2026-11-02', '2026-11-03']) e = log(log(e, ID.a, day), ID.b, day);
    expect(perfectRun(e.habits, '2026-11-03')).toBe(2);
    expect(perfectRun([], TODAY)).toBe(0);
  });

  test('a month: weeks of seven, Monday first, a perfect-day count, and nothing written', () => {
    let d = journal();
    d = log(log(d, ID.a, '2026-11-02'), ID.b, '2026-11-02');
    const before = JSON.stringify(d);
    const m = perfectMonth(d.habits, '2026-11', TODAY);
    expect(m.weeks[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]); // 1 Nov 2026 is a Sunday
    expect(m.weeks[0]![6]!.date).toBe('2026-11-01');
    expect(m.weeks.every(w => w.length === 7)).toBe(true);
    expect(m.weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(m.perfect).toBe(1);
    expect(m.dueDays).toBe(11); // 2–12 Nov
    expect(JSON.stringify(d)).toBe(before);
    expect(perfectMonth(d.habits, '2026-10', TODAY).perfect).toBe(0);
  });

  test('months move across a year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });
});
