import {expect, test} from 'vitest';
import {habitTrack} from '../../../ai/local-answers/exact/habits';
import {habitDataSchema} from '../../../habits';
import {buildShowcase} from '../../../showcase-data';
import {calendarOf, dayNames, periodLabel, widgetPeriod} from './calendar';
import {missRanks} from './ranks';

/** Session AS (ADR-042 Part 2): the calendar and the ranked miss bars read the same days the exact answers state (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', habits = habitDataSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:habits:v1']!)).habits;
const meditate = habits.find(h => h.title === 'Meditate')!;

test('the owner’s second question as a calendar: November, with 3 and 12 November lit and today still open', () => {
  const view = calendarOf(habitTrack(meditate, DAY), widgetPeriod('this-month', DAY), DAY);
  expect(view.title).toMatch(/Nov/);
  expect(view.weekdays).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  expect(view.weeks).toHaveLength(6); // 26 Oct – 6 Dec
  expect(view.weeks[0]![0]!.date).toBe('2026-10-26'); expect(view.weeks.at(-1)!.at(-1)!.date).toBe('2026-12-06');
  expect(view.lit).toEqual(['2026-11-03', '2026-11-12']);
  const cells = view.weeks.flat(), of = (date: string) => cells.find(c => c.date === date)!;
  expect(of('2026-11-03')).toMatchObject({state: 'skipped', inPeriod: true}); expect(of('2026-11-12').state).toBe('skipped');
  expect(of('2026-11-17')).toMatchObject({state: 'open', today: true}); expect(of('2026-11-18').state).toBe('ahead');
  expect(of('2026-10-30')).toMatchObject({state: 'rest', inPeriod: false}); // outside the month: dimmed, no state
  expect(view.tally).toMatchObject({done: 14, missed: 0, skipped: 2, open: 1});
  expect(of('2026-11-03').words).toMatch(/Nov 3.*skipped/);
  expect(dayNames(view.lit)).toBe('Nov 3, Nov 12'); expect(periodLabel(view.period, DAY)).toBe('this month');
});
test('a week inside a month is drawn in its month, the week bright and the other days dimmed; a period that is not a token falls back to the kind’s default', () => {
  const week = calendarOf(habitTrack(meditate, DAY), widgetPeriod('last-week', DAY), DAY);
  expect(week.weeks).toHaveLength(6); expect(week.lit).toEqual(['2026-11-12']);
  expect(week.weeks.flat().filter(c => c.inPeriod && c.date <= DAY).map(c => c.day)).toEqual([9, 10, 11, 12, 13, 14, 15]);
  // A period across two months is the weeks that hold it.
  const across = calendarOf(habitTrack(meditate, DAY), widgetPeriod('last-30-days', DAY), DAY);
  expect(across.weeks).toHaveLength(5); expect(across.weeks[0]![0]!.date).toBe('2026-10-19'); expect(across.weeks.at(-1)!.at(-1)!.date).toBe('2026-11-22');
  expect(widgetPeriod('not-a-period', DAY).token).toBe('this-month'); expect(widgetPeriod(undefined, DAY, 'last-week').token).toBe('last-week');
  const done = calendarOf(habitTrack(meditate, DAY), widgetPeriod('last-week', DAY), DAY, 'done');
  expect(done.lit).toHaveLength(6);
});
test('the owner’s first question as ranked bars: nothing missed this week; this month one habit, with the skipped days apart', () => {
  const week = missRanks(habits, widgetPeriod('this-week', DAY), DAY);
  expect(week).toMatchObject({rows: [], clean: 7, habitsMissed: 0, missedDays: 0, openToday: ['Exercise', 'Meditate', 'Drink water']});
  const month = missRanks(habits, widgetPeriod('this-month', DAY), DAY);
  expect(month.rows[0]).toMatchObject({label: 'Late-night snacks', missed: 2, skipped: 3, total: 5, text: '5 days: 2 missed, 3 skipped'});
  expect(month.rows.slice(1).every(r => r.missed === 0 && r.skipped === 2)).toBe(true);
  expect(month).toMatchObject({habitsMissed: 1, habitsNotDone: 7, clean: 0, missedDays: 2, skippedDays: 15, max: 5});
});
