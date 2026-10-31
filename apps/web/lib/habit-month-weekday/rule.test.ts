import {afterEach, describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitDay, habitStats, logHabitCount, scheduleLabel, setHabitScheduleOverlay, type HabitData} from '../habits';
import {habitExtrasSchema} from '../habits-extras/schema';
import {fallbackSchedule, isMonthWeekday, monthWeekdayLabel, nextMonthWeekdays, occurrenceOf, overlayApplies, readMonthWeekdays, setMonthWeekday, type MonthWeekday} from './rule';

// Session AK F0 (5.1): "the first Monday of the month" — the occurrence rule, the stored format, and the habit engine.
describe('which occurrence of its weekday a day is', () => {
  it('counts 1–5 from the day of the month and knows the last one', () => {
    expect(occurrenceOf('2026-11-02')).toEqual({weekday: 1, nth: 1, last: false}); // November 2026 starts on a Sunday
    expect(occurrenceOf('2026-11-30')).toEqual({weekday: 1, nth: 5, last: true});
    expect(occurrenceOf('2026-11-23')).toEqual({weekday: 1, nth: 4, last: false});
    expect(occurrenceOf('2026-02-23')).toEqual({weekday: 1, nth: 4, last: true}); // February 2026: 28 days, four Mondays
    expect(occurrenceOf('2028-02-29')).toEqual({weekday: 2, nth: 5, last: true}); // a leap day
  });
  it('the first, fourth and last Monday across month and year ends', () => {
    const first = {weekday: 1, nth: 1} as const, last = {weekday: 1, nth: -1} as const, fourth = {weekday: 1, nth: 4} as const;
    expect(nextMonthWeekdays(first, '2026-10-01', 5)).toEqual(['2026-10-05', '2026-11-02', '2026-12-07', '2027-01-04', '2027-02-01']);
    expect(nextMonthWeekdays(last, '2026-11-01', 4)).toEqual(['2026-11-30', '2026-12-28', '2027-01-25', '2027-02-22']);
    // A month whose first day is the weekday: the 1st is the first one, the 29th the fifth (and the last).
    expect(isMonthWeekday(first, '2027-03-01')).toBe(true);
    expect(isMonthWeekday(last, '2027-03-29')).toBe(true);
    expect(isMonthWeekday(fourth, '2027-03-29')).toBe(false);
    expect(isMonthWeekday(fourth, '2027-03-22')).toBe(true);
    expect(isMonthWeekday(first, '2026-12-31')).toBe(false); // a Thursday
  });
  it('around daylight saving the calendar day decides, so the occurrence never moves', () => {
    // EU: last Sundays of March and October 2026 are the change days; US: second Sunday of March, first of November.
    expect(isMonthWeekday({weekday: 0, nth: -1}, '2026-03-29')).toBe(true);
    expect(isMonthWeekday({weekday: 0, nth: -1}, '2026-10-25')).toBe(true);
    expect(isMonthWeekday({weekday: 0, nth: 2}, '2026-03-08')).toBe(true);
    expect(isMonthWeekday({weekday: 0, nth: 1}, '2026-11-01')).toBe(true);
    expect(nextMonthWeekdays({weekday: 0, nth: -1}, '2026-03-01', 2)).toEqual(['2026-03-29', '2026-04-26']);
  });
  it('labels the schedule in words', () => {
    expect(monthWeekdayLabel({weekday: 1, nth: 1})).toBe('First Monday of the month');
    expect(monthWeekdayLabel({weekday: 5, nth: -1})).toBe('Last Friday of the month');
    expect(fallbackSchedule({weekday: 1})).toEqual({kind: 'weekdays', days: [1]});
  });
});

describe('the stored format (habit extras, loose)', () => {
  const rule: MonthWeekday = {weekday: 1, nth: 1, from: '2026-10-01'};
  it('sets and removes one habit\'s overlay and keeps every other field, a later build\'s included', () => {
    const extras = habitExtrasSchema.parse({version: 1, areas: {a: 'health'}, later: {kept: true}});
    const set = setMonthWeekday(extras, 'a', rule);
    expect(set).toEqual({version: 1, areas: {a: 'health'}, later: {kept: true}, monthWeekday: {a: rule}});
    // An older build reads the record with the same loose schema and keeps the field through its read-modify-write.
    expect(habitExtrasSchema.parse(set)).toEqual(set);
    expect(readMonthWeekdays(habitExtrasSchema.parse(JSON.parse(JSON.stringify(set))))).toEqual({a: rule});
    expect(setMonthWeekday(set, 'a', null)).toEqual({version: 1, areas: {a: 'health'}, later: {kept: true}});
  });
  it('reads only well-formed entries; prunes ids the journal no longer has; refuses more than 400', () => {
    expect(readMonthWeekdays({monthWeekday: {a: rule, b: {weekday: 9, nth: 1, from: '2026-10-01'}, c: {weekday: 1, nth: 5, from: '2026-10-01'}, d: 'x'}})).toEqual({a: rule});
    expect(readMonthWeekdays({monthWeekday: []})).toEqual({});
    expect(readMonthWeekdays(null)).toEqual({});
    expect(setMonthWeekday({version: 1, monthWeekday: {gone: rule}}, 'a', rule, new Set(['a']))).toEqual({version: 1, monthWeekday: {a: rule}});
    const many = {version: 1, monthWeekday: Object.fromEntries(Array.from({length: 400}, (_, i) => [`h${i}`, rule]))};
    expect(() => setMonthWeekday(many, 'one-more', rule)).toThrow('Too many');
  });
  it('speaks only while the rule is still exactly its weekday, and from its day on', () => {
    expect(overlayApplies(rule, {kind: 'weekdays', days: [1]}, '2026-10-05')).toBe(true);
    expect(overlayApplies(rule, {kind: 'weekdays', days: [1]}, '2026-09-28')).toBe(false);
    expect(overlayApplies(rule, {kind: 'weekdays', days: [1, 3]}, '2026-10-05')).toBe(false);
    expect(overlayApplies(rule, {kind: 'daily'}, '2026-10-05')).toBe(false);
  });
});

describe('the habit engine with the overlay', () => {
  const ID = '7a000000-0000-4000-8000-0000000000d1';
  afterEach(() => setHabitScheduleOverlay(null));
  const install = (map: Record<string, MonthWeekday>) => setHabitScheduleOverlay({
    allows: (id, schedule, date) => { const r = map[id]; return !r || !overlayApplies(r, schedule, date) || isMonthWeekday(r, date); },
    label: (id, schedule) => map[id] && overlayApplies(map[id]!, schedule, '2199-12-31') ? monthWeekdayLabel(map[id]!) : null,
  });
  function journal(): HabitData {
    return createHabit(emptyHabitData(), {title: 'Budget review', category: 'Finance', description: '', notes: '', schedule: {kind: 'weekdays', days: [1]}, target: 1}, new Date('2026-08-01T09:00:00Z'), ID);
  }
  it('without the overlay (the server, tests, older builds) every Monday is due, as stored', () => {
    const habit = journal().habits[0]!;
    expect(habitDay(habit, '2026-11-02', '2026-11-30').status).toBe('failed'); // scheduled, nothing logged
    expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('failed');
    expect(habitDay(habit, '2026-11-30', '2026-11-30').status).toBe('due');
  });
  it('with it, only the first Monday is due; the other Mondays are not scheduled; a streak runs across months', () => {
    install({[ID]: {weekday: 1, nth: 1, from: '2026-08-01'}});
    let data = journal();
    for (const day of ['2026-09-07', '2026-10-05', '2026-11-02']) data = logHabitCount(data, ID, day, 1, '', new Date(`${day}T10:00:00Z`));
    const habit = data.habits[0]!;
    expect(habitDay(habit, '2026-11-02', '2026-11-30').status).toBe('complete');
    expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('not-scheduled');
    expect(habitDay(habit, '2026-11-30', '2026-11-30').status).toBe('not-scheduled');
    expect(habitDay(habit, '2026-12-07', '2026-12-07').status).toBe('due');
    expect(habitStats(habit, '2026-11-30')).toMatchObject({currentStreak: 3, streakUnit: 'days'});
    expect(() => logHabitCount(data, ID, '2026-11-09', 1, '', new Date('2026-11-09T10:00:00Z'))).toThrow('scheduled');
    expect(scheduleLabel(habit.rules[0]!.schedule, ID)).toBe('First Monday of the month');
    expect(scheduleLabel(habit.rules[0]!.schedule)).toBe('Mon'); // without the habit, the stored schedule's words
  });
  it('before its day, and once the schedule is no longer that one weekday, the stored schedule is read as it is', () => {
    install({[ID]: {weekday: 1, nth: -1, from: '2026-11-01'}});
    const habit = journal().habits[0]!;
    expect(habitDay(habit, '2026-10-05', '2026-11-30').status).toBe('failed'); // October: every Monday, as stored then
    expect(habitDay(habit, '2026-11-23', '2026-11-30').status).toBe('not-scheduled');
    expect(habitDay(habit, '2026-11-30', '2026-11-30').status).toBe('due'); // the last Monday of November
    const other = createHabit(emptyHabitData(), {title: 'Gym', category: 'Health', description: '', notes: '', schedule: {kind: 'weekdays', days: [1, 3]}, target: 1}, new Date('2026-08-01T09:00:00Z'), ID).habits[0]!;
    expect(habitDay(other, '2026-11-23', '2026-11-30').status).toBe('failed');
  });
  it('a changed overlay is read again: remembered results do not hide it', () => {
    let map: Record<string, MonthWeekday> = {[ID]: {weekday: 1, nth: 1, from: '2026-08-01'}}, version = 1;
    setHabitScheduleOverlay({allows: (id, schedule, date) => { const r = map[id]; return !r || !overlayApplies(r, schedule, date) || isMonthWeekday(r, date); }, version: () => version});
    const habit = journal().habits[0]!;
    expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('not-scheduled');
    map = {}; version = 2;
    expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('failed');
  });
});
