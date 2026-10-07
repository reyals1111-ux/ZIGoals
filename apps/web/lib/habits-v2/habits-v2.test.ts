import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, latestHabitRule, logHabitValue, saveHabitTimezone, setHabitEntryStatus, type HabitData} from '../habits';
import {CHALLENGE_DAYS, challengeNoteId, challengeOf, finishedWords, keepGoing, startChallenge} from './challenge';
import {chainedDue, dismissChained, setChained, stacksOf} from './stacks';
import {byWeek, byWeekday, usualSaveTime} from './stats';
import {emptyWReminders} from '../reminders/w-schema';

// Session W Part 10: challenges on the habit's own end date, stacks shown together with their chained reminder, and a
// habit's patterns from its own entries. Fictional habits in UTC.
const ids = {walk: '11111111-1111-4111-8111-111111111111', water: '22222222-2222-4222-8222-222222222222', stretch: '33333333-3333-4333-8333-333333333333', read: '44444444-4444-4444-8444-444444444444'};
const at = (day: string, clock = '08:00') => new Date(`${day}T${clock}:00.000Z`);
function base(): HabitData { return saveHabitTimezone(emptyHabitData(), 'UTC'); }
function habit(data: HabitData, id: string, title: string, day = '2026-09-01', extra: Record<string, unknown> = {}): HabitData {
  return createHabit(data, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}, ...extra} as never, at(day), id);
}
const done = (data: HabitData, id: string, day: string, clock = '08:00') => logHabitValue(data, id, day, 1, {mode: 'set'}, at(day, clock));

describe('challenges', () => {
  test('a 30-day challenge from today: day numbers, days done of scheduled days, rest days neutral, today open until done', () => {
    let data = habit(base(), ids.walk, 'Walk');
    data = startChallenge(data, ids.walk, 30, at('2026-10-01'));
    expect(latestHabitRule(data.habits[0]!).endCondition).toEqual({kind: 'date', date: '2026-10-30'});
    data = done(data, ids.walk, '2026-10-01'); data = done(data, ids.walk, '2026-10-02');
    data = setHabitEntryStatus(data, ids.walk, '2026-10-03', 'skipped', '', at('2026-10-03'));
    const c = challengeOf(data.habits[0]!, '2026-10-05')!;
    expect(c).toMatchObject({start: '2026-10-01', end: '2026-10-30', days: 30, dayNumber: 5, done: 2, scheduled: 3, finished: false});
    expect(() => startChallenge(data, ids.walk, CHALLENGE_DAYS.min - 1, at('2026-10-05'))).toThrow(/7 to 365 days/);
  });
  test('when it ends: finished, a calm note in the person\'s numbers; "keep going" removes the end date from that day', () => {
    let data = habit(base(), ids.walk, 'Walk', '2026-10-01', {endCondition: {kind: 'date', date: '2026-10-07'}});
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06']) data = done(data, ids.walk, day);
    const c = challengeOf(data.habits[0]!, '2026-10-09')!;
    expect(c).toMatchObject({start: '2026-10-01', end: '2026-10-07', days: 7, done: 5, scheduled: 7, finished: true});
    expect(finishedWords(data.habits[0]!, c)).toBe('Your 7-day Walk challenge ended on 2026-10-07: done on 5 of 7 scheduled days.');
    expect(challengeNoteId(data.habits[0]!, c)).toBe(`challenge:${ids.walk}:2026-10-07`);
    const kept = keepGoing(data, ids.walk, at('2026-10-09'));
    expect(latestHabitRule(kept.habits[0]!)).toMatchObject({from: '2026-10-09', endCondition: {kind: 'none'}});
    expect(challengeOf(kept.habits[0]!, '2026-10-09')).toBeNull();
    habitDataSchema.parse(kept);
  });
});

describe('stacks', () => {
  function stacked(): HabitData {
    let data = habit(base(), ids.walk, 'Make the bed');
    data = habit(data, ids.water, 'Drink water', '2026-09-01', {stackAfterId: ids.walk});
    data = habit(data, ids.stretch, 'Stretch', '2026-09-01', {stackAfterId: ids.water});
    data = habit(data, ids.read, 'Read', '2026-09-01');
    return data;
  }
  test('a chain in order from the habit nothing comes before; a lone habit is not a stack', () => {
    expect(stacksOf(stacked()).map(chain => chain.map(h => h.title))).toEqual([['Make the bed', 'Drink water', 'Stretch']]);
  });
  test('the chained reminder: only once the habit before is done today, while this one is due; put off for the day', () => {
    let data = stacked(), w = setChained(emptyWReminders(), ids.water, true);
    expect(chainedDue(w, data, '2026-10-07')).toEqual([]);
    data = done(data, ids.walk, '2026-10-07');
    expect(chainedDue(w, data, '2026-10-07', '08:05')).toEqual([{id: `chained:${ids.water}`, kind: 'stack-next', habitId: ids.water, title: 'Drink water', after: 'Make the bed', day: '2026-10-07', time: '08:05', href: '/app/habits'}]);
    expect(chainedDue(dismissChained(w, ids.water, '2026-10-07'), data, '2026-10-07')).toEqual([]);
    expect(chainedDue(dismissChained(w, ids.water, '2026-10-06'), data, '2026-10-07')).toHaveLength(1);
    expect(chainedDue(w, done(data, ids.water, '2026-10-07'), '2026-10-07')).toEqual([]);
    w = setChained(w, ids.water, false);
    expect(w.chained).toEqual({});
  });
});

describe('patterns', () => {
  test('by weekday and by week over 12 weeks: done of scheduled, rest days and today-not-yet left out', () => {
    let data = habit(base(), ids.walk, 'Walk', '2026-09-28');
    data = done(data, ids.walk, '2026-09-28'); data = done(data, ids.walk, '2026-10-05');
    data = setHabitEntryStatus(data, ids.walk, '2026-10-06', 'skipped', '', at('2026-10-06'));
    const days = byWeekday(data.habits[0]!, '2026-10-07');
    expect(days.find(d => d.weekday === 1)).toEqual({weekday: 1, done: 2, scheduled: 2});
    expect(days.find(d => d.weekday === 2)).toEqual({weekday: 2, done: 0, scheduled: 1});
    expect(days.find(d => d.weekday === 3)).toEqual({weekday: 3, done: 0, scheduled: 1});
    const weeks = byWeek(data.habits[0]!, '2026-10-07');
    expect(weeks).toHaveLength(12);
    expect(weeks.slice(-2)).toEqual([{weekStart: '2026-09-28', done: 1, scheduled: 7}, {weekStart: '2026-10-05', done: 1, scheduled: 1}]);
    expect(weeks[0]).toEqual({weekStart: '2026-07-20', done: 0, scheduled: 0});
  });
  test('usual save time: the middle of five or more saves in the last 60 days, to the quarter hour; null with fewer', () => {
    let data = habit(base(), ids.walk, 'Walk', '2026-09-01');
    const saves = [['2026-10-01', '07:10'], ['2026-10-02', '07:20'], ['2026-10-03', '07:35'], ['2026-10-04', '21:00'], ['2026-10-05', '07:25']] as const;
    for (const [day, clock] of saves.slice(0, 4)) data = done(data, ids.walk, day, clock);
    expect(usualSaveTime(data.habits[0]!, 'UTC', '2026-10-07')).toBeNull();
    data = done(data, ids.walk, saves[4][0], saves[4][1]);
    expect(usualSaveTime(data.habits[0]!, 'UTC', '2026-10-07')).toEqual({clock: '07:30', n: 5});
    expect(usualSaveTime(data.habits[0]!, 'Europe/Brussels', '2026-10-07')).toEqual({clock: '09:30', n: 5});
  });
});
