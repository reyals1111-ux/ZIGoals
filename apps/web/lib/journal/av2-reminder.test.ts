import {describe, expect, test} from 'vitest';
import {DEFAULT_REMINDER, daysWords, reminderLine, reminderOf, streakNudge, toggleDay, withReminder} from './reminder';
import {emptyJournal} from './schema';
import {showcaseJournal} from './showcase';

/** Session AV lane 2 (journal; LEDGER #40, Day One): the reminder to write and the streak line, pure. */
const e = (date: string) => ({id: date, date, text: 'x', createdAt: `${date}T20:00:00.000Z`});
describe('the reminder to write', () => {
  test('off until switched on; a time and weekdays (Monday first), never no day', () => {
    expect(reminderOf(emptyJournal())).toEqual(DEFAULT_REMINDER);
    let j = withReminder(emptyJournal(), {on: true});
    expect(j.reminder).toEqual({on: true, time: '21:00', days: 127});
    j = withReminder(j, {time: '07:45', days: toggleDay(toggleDay(127, 5), 6)});
    expect(j.reminder).toEqual({on: true, time: '07:45', days: 31});
    expect(() => withReminder(j, {days: 0})).toThrow('Keep at least one day.');
    expect(() => withReminder(j, {time: '7 pm'})).toThrow('Choose a time');
    expect(reminderLine(j.reminder!)).toBe('A reminder to write at 07:45, on weekdays, unless you already wrote that day.');
    expect(reminderLine(DEFAULT_REMINDER)).toBe('No reminder to write.');
  });
  test('the days in words', () => {
    expect(daysWords(127)).toBe('every day'); expect(daysWords(31)).toBe('on weekdays'); expect(daysWords(96)).toBe('at weekends');
    expect(daysWords(1 | 4 | 16)).toBe('on Mon, Wed and Fri'); expect(daysWords(64)).toBe('on Sun');
  });
  test('the streak line says what a few lines today do', () => {
    expect(streakNudge([], '2026-11-23')).toBe('A few lines today start your streak.');
    expect(streakNudge([e('2026-11-21'), e('2026-11-22')], '2026-11-23')).toBe('Write today to make it 3 days in a row.');
    expect(streakNudge([e('2026-11-21'), e('2026-11-22'), e('2026-11-23')], '2026-11-23')).toBe('Written today: 3 days in a row.');
    expect(streakNudge([e('2026-11-23')], '2026-11-23')).toBe('Written today.');
    expect(streakNudge([e('2026-11-10'), e('2026-11-11')], '2026-11-23')).toBe('Your longest run is 2 days. A few lines today start a new one.');
  });
  test('the Showcase keeps a reminder on (the Showcase sends no notification)', () => {
    expect(showcaseJournal('2026-11-23').reminder).toEqual({on: true, time: '21:00', days: 127});
  });
});
