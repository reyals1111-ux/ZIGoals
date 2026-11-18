import {expect, test} from 'vitest';
import {habitsAnswer} from '../../../ai/local-answers/exact/habits';
import type {Query} from '../../../ai/local-answers/exact/types';
import {habitDataSchema} from '../../../habits';
import {buildShowcase} from '../../../showcase-data';
import {widgetPeriod} from './calendar';
import {comparePeriods} from './habit-compare';
import {streakFlames} from './habit-flames';
import {habitWeekdays, habitYear, habitsLattice} from './habit-lattice';

/**
 * Session AS (ADR-042 Part 2): the Habits answer widgets of the day group — flames, lattices, the weekday grid, the year
 * heat and the twins — read the Habits page's own days and streaks (the Showcase on 17 November 2026; the figures below
 * were read from its records: six habits kept since 19 October, each with two or three skipped days, "Late-night snacks"
 * with two missed days in November, and an archived "Evening stretch" from an earlier season).
 */
const DAY = '2026-11-17', habits = habitDataSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:habits:v1']!)).habits;
const meditate = habits.find(h => h.title === 'Meditate')!;
const query = (ask: Query['ask'], period: string | null, read = ''): Query => ({domain: 'habits', ask, shape: 'count', lang: 'en', period, weekday: null, subject: null, read});

test('streak flames: the Habits page’s own streaks, the longest first, six at most; one habit when it is asked for', () => {
  const view = streakFlames(habits, DAY);
  expect(view.flames.map(f => [f.name, f.current])).toEqual([['Contribute', 27], ['Walk', 27], ['Drink water', 26], ['Exercise', 26], ['Meditate', 26], ['Read', 26]]);
  expect(view).toMatchObject({one: false, running: 7, total: 7, more: 1}); // the archived habit is not a flame; "Late-night snacks" (3 days) is the seventh
  expect(view.flames[0]).toMatchObject({share: 1, text: '27 days', unit: 'days'}); expect(view.flames[2]!.share).toBeCloseTo(26 / 27, 5);
  expect(view.lead).toMatchObject({name: 'Contribute', current: 27});
  const one = streakFlames(habits, DAY, {ref: meditate.id});
  expect(one).toMatchObject({one: true, more: 0, flames: [{name: 'Meditate', current: 26, best: 26, share: 1, bestShare: 1, text: '26 days'}]});
  expect(streakFlames(habits, DAY, {ref: 'no-such-habit'}).flames).toHaveLength(6); // an unknown ref shows every habit
});
test('best streaks: each habit’s longest streak ever beside the one running now', () => {
  const view = streakFlames(habits, DAY, {by: 'best', cap: 8});
  expect(view.flames.map(f => [f.name, f.best, f.current])).toEqual([['Walk', 27, 27], ['Contribute', 27, 27], ['Read', 26, 26], ['Exercise', 26, 26], ['Meditate', 26, 26], ['Drink water', 26, 26], ['Late-night snacks', 7, 3]]);
  const snacks = view.flames.at(-1)!;
  expect(snacks.bestShare).toBeCloseTo(7 / 27, 5); expect(snacks.share).toBeCloseTo(3 / 27, 5); expect(snacks).toMatchObject({text: '3 days', bestText: '7 days'});
  expect(view.longest).toMatchObject({name: 'Walk', best: 27}); expect(view.more).toBe(0); // the tie is named as the exact layer's sentence names it
  expect(habitsAnswer(query('streak', null), habits, DAY)!.text).toContain('Longest ever: Walk, 27 days.');
});
test('the habits lattice: November so far, a column a day, missed and skipped told apart, today still open', () => {
  const view = habitsLattice(habits, widgetPeriod('this-month', DAY), DAY);
  expect(view.columns).toHaveLength(17); expect(view.columns[0]).toMatchObject({date: '2026-11-01', day: 1, today: false}); expect(view.columns.at(-1)).toMatchObject({day: 17, today: true}); expect(view.earlier).toBe(0);
  expect(view.totals).toEqual({done: 99, decided: 101, missed: 2, skipped: 15, open: 3});
  expect(view.rows.map(r => r.name)).toEqual(['Read', 'Exercise', 'Walk', 'Meditate', 'Contribute', 'Drink water', 'Late-night snacks']);
  const row = (name: string) => view.rows.find(r => r.name === name)!;
  expect(row('Meditate')).toMatchObject({done: 14, decided: 14, missed: 0, skipped: 2, open: true, note: '14/14'});
  expect(row('Meditate').cells[2]).toBe('skipped'); expect(row('Meditate').cells[11]).toBe('skipped'); expect(row('Meditate').cells[16]).toBe('open'); // 3 and 12 November; today
  expect(row('Late-night snacks')).toMatchObject({done: 12, decided: 14, missed: 2, skipped: 3, open: false, note: '12/14'});
  expect(row('Late-night snacks').cells.flatMap((c, i) => c === 'missed' ? [i + 1] : [])).toEqual([8, 13]);
  // The same figures as the exact layer's sentence.
  expect(habitsAnswer(query('status', 'this-month'), habits, DAY)!.text).toContain('99 of 101 due check-ins done (98%); 2 missed, 15 skipped');
  // A period longer than 31 days keeps its newest 31 columns and counts the whole period.
  const long = habitsLattice(habits, widgetPeriod('last-90-days', DAY), DAY);
  expect(long.columns).toHaveLength(31); expect(long.earlier).toBe(59); expect(long.totals).toMatchObject({missed: 12, skipped: 23});
});
test('habit weekdays: the days not done on each weekday in the last 90 days, the heaviest named', () => {
  const view = habitWeekdays(habits, DAY);
  expect(view.period.token).toBe('last-90-days');
  expect(view.columns.map(c => [c.label, c.total])).toEqual([['Mo', 7], ['Tu', 4], ['We', 4], ['Th', 4], ['Fr', 6], ['Sa', 5], ['Su', 5]]);
  expect(view.all).toBe(35); expect(view.worst).toBe(0); expect(view.columns[view.worst!]).toMatchObject({name: 'Mondays', missed: 2, skipped: 5}); expect(view.max).toBe(3);
  expect(view.rows.map(r => [r.name, r.total])).toEqual([['Evening stretch', 8], ['Late-night snacks', 8], ['Read', 4], ['Contribute', 3], ['Drink water', 3], ['Exercise', 3], ['Meditate', 3], ['Walk', 3]]);
  expect(view.rows[1]!.cells.map(c => c.total)).toEqual([2, 0, 0, 1, 1, 3, 1]);
  expect(habitsAnswer(query('missed', null, 'which weekday'), habits, DAY)!.text).toBe('Most habit days not done fall on Mondays: 7 of 35 in the last 90 days.');
  expect(habitWeekdays(habits, DAY, 'not-a-period').period.token).toBe('last-90-days');
});
test('habit year: one habit’s last 53 weeks, a column a week from Monday', () => {
  const view = habitYear(meditate, DAY);
  expect(view.weeks).toHaveLength(53); expect(view.from).toBe('2025-11-17'); expect(view.weeks.at(-1)!.key).toBe('2026-11-16');
  expect(view).toMatchObject({name: 'Meditate', done: 26, missed: 0, skipped: 3, part: 0, decided: 26, open: true});
  expect(view.dates.skipped).toEqual(['2026-10-25', '2026-11-03', '2026-11-12']);
  const cells = view.weeks.flatMap(w => w.cells), of = (date: string) => cells.find(c => c.date === date)!;
  expect(of('2026-11-17')).toMatchObject({state: 'open', today: true}); expect(of('2026-11-18').state).toBe('ahead'); expect(of('2026-10-18').state).toBe('rest'); // before it was kept
  expect(of('2026-11-03')).toMatchObject({state: 'skipped', words: 'Tue, Nov 3: skipped'}); expect(of('2026-10-19').state).toBe('done');
  expect(view.weeks.filter(w => w.month).map(w => w.month)).toEqual(['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
});
test('compare periods: this week beside the same days of the week before, as the exact layer counts them', () => {
  const week = comparePeriods(habits, widgetPeriod('this-week', DAY), DAY);
  expect(week).toMatchObject({name: null, unit: 'due check-ins', points: 0, now: {done: 11, due: 11, rate: 100, words: 'Nov 16 – Nov 17'}, before: {done: 12, due: 12, rate: 100, words: 'Nov 9 – Nov 10'}});
  expect(habitsAnswer(query('compare', 'this-week'), habits, DAY)!.text).toBe('Habits this week: 11 of 11 due check-ins done (100%); the period before (Mon, Nov 9 to Tue, Nov 10): 12 of 12 (100%).');
  const one = comparePeriods(habits, widgetPeriod('last-week', DAY), DAY, meditate.id);
  expect(one).toMatchObject({name: 'Meditate', unit: 'days', points: 0, now: {done: 6, due: 7, rate: 86}, before: {done: 6, due: 7, rate: 86, words: 'Nov 2 – Nov 8'}});
  // A habit with a measure carries its amount too (the sentence compares those).
  expect(comparePeriods(habits, widgetPeriod('this-week', DAY), DAY, meditate.id)).toMatchObject({now: {done: 1, due: 1, amount: '15 minutes'}, before: {done: 2, due: 2, amount: '20 minutes'}});
  expect(week.now.amount).toBeNull();
  // Nothing was kept in early October: that side is unknown, not zero.
  const month = comparePeriods(habits, widgetPeriod('this-month', DAY), DAY);
  expect(month.now).toMatchObject({done: 99, due: 101, rate: 98}); expect(month.before).toMatchObject({due: 0, rate: null}); expect(month.points).toBeNull();
});
test('no habits kept: nothing is drawn as a figure', () => {
  expect(streakFlames([], DAY)).toMatchObject({flames: [], running: 0, total: 0, more: 0, longest: null, lead: null});
  expect(habitsLattice([], widgetPeriod('this-month', DAY), DAY)).toMatchObject({rows: [], totals: {done: 0, decided: 0, missed: 0, skipped: 0, open: 0}});
  expect(habitWeekdays([], DAY)).toMatchObject({rows: [], all: 0, worst: null});
  expect(comparePeriods([], widgetPeriod('this-week', DAY), DAY)).toMatchObject({now: {due: 0, rate: null}, before: {due: 0, rate: null}, points: null});
});
