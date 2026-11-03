import {describe, expect, test} from 'vitest';
import {habitScheduleSchema} from '../habits';
import {localWeekday} from '../local-date';
import {MAX_PHRASE, nextWeekday, parseRecurrence, partOfDayFor} from './parse';
import {describeSchedule, phraseChips} from './describe';

// 2026-10-31 is a Saturday.
const TODAY = '2026-10-31';
const parse = (text: string) => parseRecurrence(text, TODAY);

describe('the examples from the build list', () => {
  test('"every other tue 7am": every 14 days from the next Tuesday, a 7:00 reminder, morning', () => {
    const r = parse('every other tue 7am');
    expect(r.schedule).toEqual({kind: 'interval', every: 14, anchor: '2026-11-03'});
    expect(localWeekday('2026-11-03')).toBe(2);
    expect(r.time).toBe('07:00'); expect(r.partOfDay).toBe('morning'); expect(r.unknown).toEqual([]); expect(r.problem).toBeNull();
  });
  test('"3x a week" and its spellings', () => {
    for (const text of ['3x a week', '3 x a week', '3× per week', '3 times a week', 'three times per week', '3/week', '3 per week']) expect(parse(text).schedule, text).toEqual({kind: 'frequency', times: 3, period: 'week'});
    expect(parse('twice a month').schedule).toEqual({kind: 'frequency', times: 2, period: 'month'});
    expect(parse('once a year').schedule).toEqual({kind: 'frequency', times: 1, period: 'year'});
    expect(parse('5 times weekly').schedule).toEqual({kind: 'frequency', times: 5, period: 'week'});
  });
  test('"weekdays", "weekends" and ranges', () => {
    for (const text of ['weekdays', 'every weekday', 'on weekdays', 'mon-fri', 'monday to friday', 'Mon through Fri']) expect(parse(text).schedule, text).toEqual({kind: 'weekdays', days: [1, 2, 3, 4, 5]});
    expect(parse('weekends').schedule).toEqual({kind: 'weekdays', days: [0, 6]});
    expect(parse('fri-mon').schedule).toEqual({kind: 'weekdays', days: [0, 1, 5, 6]});
  });
  test('"mon wed fri" and lists with commas, "and", plurals', () => {
    for (const text of ['mon wed fri', 'Mon, Wed and Fri', 'mondays, wednesdays & fridays', 'every monday wednesday friday', 'weekly on mon, wed, fri']) expect(parse(text).schedule, text).toEqual({kind: 'weekdays', days: [1, 3, 5]});
    expect(parse('every sunday').schedule).toEqual({kind: 'weekdays', days: [0]});
    expect(parse('every week on thursday').schedule).toEqual({kind: 'weekdays', days: [4]});
  });
  test('"daily at 7" (a 24-hour clock when there is no am or pm)', () => {
    const r = parse('daily at 7');
    expect(r.schedule).toEqual({kind: 'daily'}); expect(r.time).toBe('07:00'); expect(r.partOfDay).toBe('morning');
    expect(parse('every day at 19').time).toBe('19:00');
    expect(parse('everyday at 7pm').time).toBe('19:00');
    expect(parse('each day').schedule).toEqual({kind: 'daily'});
  });
});

describe('intervals and month dates', () => {
  test('every other day, every N days, alternate days start today', () => {
    expect(parse('every other day').schedule).toEqual({kind: 'interval', every: 2, anchor: TODAY});
    expect(parse('alternate days').schedule).toEqual({kind: 'interval', every: 2, anchor: TODAY});
    expect(parse('every 3 days').schedule).toEqual({kind: 'interval', every: 3, anchor: TODAY});
    expect(parse('every three days').schedule).toEqual({kind: 'interval', every: 3, anchor: TODAY});
  });
  test('every N weeks, on a weekday or from today', () => {
    expect(parse('every 2 weeks on monday').schedule).toEqual({kind: 'interval', every: 14, anchor: '2026-11-02'});
    expect(parse('every 3 weeks').schedule).toEqual({kind: 'interval', every: 21, anchor: TODAY});
    expect(parse('every other saturday').schedule).toEqual({kind: 'interval', every: 14, anchor: TODAY}); // today is a Saturday
    expect(parse('every week').schedule).toEqual({kind: 'frequency', times: 1, period: 'week'});
  });
  test('month dates in order, once each, with their words', () => {
    expect(parse('on the 15th and 1st of each month').schedule).toEqual({kind: 'month-dates', days: [1, 15]});
    expect(parse('monthly on the 1st').schedule).toEqual({kind: 'month-dates', days: [1]});
    expect(parse('the 1st, 1st and 28th').schedule).toEqual({kind: 'month-dates', days: [1, 28]});
    expect(parse('monthly').schedule).toEqual({kind: 'frequency', times: 1, period: 'month'});
  });
  test('impossible numbers are refused with one sentence, never clamped', () => {
    expect(parse('8x a week')).toMatchObject({schedule: null, problem: 'At most 7 times a week.'});
    expect(parse('29 times a month').problem).toBe('At most 28 times a month.');
    expect(parse('3 times a day').problem).toMatch(/target, not a schedule/);
    expect(parse('every 400 days').problem).toMatch(/2 to 365 days/);
    expect(parse('every 60 weeks').problem).toMatch(/2 to 52 weeks/);
    expect(parse('the 32nd').problem).toMatch(/1st to the 31st/);
    expect(parse('every 1 day').problem).toMatch(/daily schedule/);
  });
});

describe('times and parts of the day', () => {
  test.each([['7am', '07:00'], ['7 am', '07:00'], ['7:30pm', '19:30'], ['at 7:30', '07:30'], ['at 19:05', '19:05'], ['12am', '00:00'], ['12pm', '12:00'], ['noon', '12:00'], ['at midnight', '00:00'], ['7.15 a.m.', '07:15'], ['6 p.m.', '18:00']])('%s is %s', (text, time) => {
    expect(parse(`daily ${text}`).time).toBe(time);
  });
  test('a bare number is never a time, and an impossible time is an unknown word', () => {
    expect(parse('daily 7').time).toBeNull(); expect(parse('daily 7').unknown).toEqual(['7']);
    expect(parse('daily 13pm').unknown).toEqual(['13pm']); expect(parse('daily at 25').unknown).toEqual(['25']);
    expect(parse('daily 7:75').time).toBeNull();
  });
  test('"in the morning", "evenings", "at night" set the part of the day without a time', () => {
    expect(parse('weekdays in the morning')).toMatchObject({schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}, time: null, partOfDay: 'morning', unknown: []});
    expect(parse('every evening').partOfDay).toBe('evening');
    expect(parse('at night').partOfDay).toBe('evening');
    expect(parse('afternoons').partOfDay).toBe('afternoon');
  });
  test('a time decides the part of the day', () => {
    expect([partOfDayFor('04:59'), partOfDayFor('05:00'), partOfDayFor('11:59'), partOfDayFor('12:00'), partOfDayFor('16:59'), partOfDayFor('17:00'), partOfDayFor('23:30')]).toEqual(['evening', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
    expect(parse('in the evening at 7am').partOfDay).toBe('morning');
  });
  test('two different times are refused', () => {
    expect(parse('daily 7am 9pm')).toMatchObject({problem: 'Two times in one phrase: keep one.', time: null, schedule: null});
  });
});

describe('unknown words are highlighted, never guessed', () => {
  test('a typo leaves the words around it unknown and names no schedule', () => {
    const r = parse('every other tuw');
    expect(r.schedule).toBeNull(); expect(r.unknown).toEqual(['other', 'tuw']);
    expect(r.tokens.find(t => t.text === 'tuw')).toMatchObject({role: 'unknown', start: 12, end: 15});
  });
  test('known parts still read; the unknown word is returned as typed', () => {
    const r = parse('Gym on Mon and Thu at 6:30');
    expect(r.schedule).toEqual({kind: 'weekdays', days: [1, 4]}); expect(r.time).toBe('06:30'); expect(r.unknown).toEqual(['Gym']);
  });
  test('fillers are never unknown; empty and noise phrases understand nothing', () => {
    expect(parse('')).toMatchObject({schedule: null, time: null, partOfDay: null, unknown: [], problem: null, tokens: []});
    expect(parse('on the').unknown).toEqual([]);
    expect(parse('banana').unknown).toEqual(['banana']);
    expect(parse('?!').unknown).toEqual(['?', '!']);
  });
  test('two schedules in one phrase are refused rather than one picked', () => {
    expect(parse('daily 3x a week')).toMatchObject({schedule: null, problem: 'Two schedules in one phrase: keep one.'});
    expect(parse('every other tue and thu').problem).toBe('Two schedules in one phrase: keep one.');
    // The same schedule said twice is one schedule.
    expect(parse('daily every day').schedule).toEqual({kind: 'daily'});
  });
  test('the phrase is cut at its limit and token positions point into the typed text', () => {
    const long = `daily ${'x'.repeat(200)}`, r = parse(long);
    expect(r.tokens.at(-1)!.end).toBeLessThanOrEqual(MAX_PHRASE);
    const typed = 'Mon,  WED'; for (const t of parse(typed).tokens) expect(typed.slice(t.start, t.end)).toBe(t.text);
  });
});

describe('every result is a schedule the habit record accepts', () => {
  test.each(['every other tue 7am', '3x a week', 'weekdays', 'mon wed fri', 'daily at 7', 'every 3 days', 'the 1st and 15th', 'monthly', 'once a year', 'every 52 weeks on sun', 'weekends'])('%s', text => {
    const s = parse(text).schedule; expect(s).not.toBeNull(); expect(habitScheduleSchema.safeParse(s).success).toBe(true);
  });
  test('the next weekday includes today', () => {
    expect(nextWeekday(TODAY, 6)).toBe(TODAY); expect(nextWeekday(TODAY, 0)).toBe('2026-11-01'); expect(nextWeekday(TODAY, 5)).toBe('2026-11-06');
  });
});

describe('chips', () => {
  test('one chip per thing understood, in order; none when there is a problem', () => {
    const chips = phraseChips(parse('every other tue 7am'));
    expect(chips.map(c => c.kind)).toEqual(['schedule', 'time', 'part']);
    expect(chips[0]!.text).toMatch(/^Every other week, from Tue/); expect(chips[2]!.text).toBe('Morning');
    expect(phraseChips(parse('8x a week'))).toEqual([]);
    expect(phraseChips(parse('banana'))).toEqual([]);
  });
  test('schedule words', () => {
    expect(describeSchedule({kind: 'daily'})).toBe('Every day');
    expect(describeSchedule({kind: 'weekdays', days: [5, 1, 3]})).toBe('Every Mon, Wed and Fri');
    expect(describeSchedule({kind: 'weekdays', days: [0]})).toBe('Every Sun');
    expect(describeSchedule({kind: 'weekdays', days: [1, 2, 3, 4, 5]})).toBe('Weekdays (Mon to Fri)');
    expect(describeSchedule({kind: 'weekdays', days: [6, 0]})).toBe('Weekends (Sat and Sun)');
    expect(describeSchedule({kind: 'frequency', times: 3, period: 'week'})).toBe('3 times a week');
    expect(describeSchedule({kind: 'frequency', times: 1, period: 'month'})).toBe('Once a month');
    expect(describeSchedule({kind: 'month-dates', days: [1, 2, 3, 11, 22]})).toBe('On the 1st, 2nd, 3rd, 11th and 22nd of the month');
    expect(describeSchedule({kind: 'interval', every: 3, anchor: TODAY})).toMatch(/^Every 3 days, from Sat/);
    expect(describeSchedule({kind: 'interval', every: 21, anchor: TODAY})).toMatch(/^Every 3 weeks, from/);
  });
});
