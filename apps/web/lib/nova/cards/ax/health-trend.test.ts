import {expect, test} from 'vitest';
import {createEmptyHealth, healthSchema} from '../../../health';
import {buildShowcase} from '../../../showcase-data';
import {trendOf, trendWords, waterWeek, weightRange, weightTrend} from './health-trend';

/** Session AS (ADR-042 Part 2, trends): each trend reads the exact layer's own track over its period (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', health = healthSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:health:v1']!));

test('sleep: the last 30 days against the 8 h goal; a day without a night is a gap', () => {
  const view = trendOf('sleep-trend', health, undefined, DAY);
  expect(view.period.token).toBe('last-30-days'); expect(view.values).toHaveLength(30);
  expect(view.values.filter(v => v === null)).toHaveLength(3); // 29 October, 6 and 13 November: no night logged
  expect(view).toMatchObject({logged: 27, target: 480, reach: true, reached: 4, any: true});
  expect(view.latest).toMatchObject({date: DAY, value: 437}); expect(view.lowest).toMatchObject({date: '2026-10-19', value: 377}); expect(view.highest).toMatchObject({date: '2026-10-26', value: 521});
  const words = trendWords(view, DAY);
  expect(words).toMatchObject({figure: '7', unit: 'h 13 min', label: 'asleep a night on average · the last 30 days', note: 'Goal 8 h · reached on 4 of 27 nights · highest 8 h 41 min'});
  expect(words.rows.slice(0, 4)).toEqual([['Average a night', '7 h 13 min over 27 nights logged'], ['Lowest', '6 h 17 min, Mon, Oct 19'], ['Highest', '8 h 41 min, Mon, Oct 26'], ['Your sleep goal', '8 h, reached on 4 of 27 nights logged']]);
  expect(words.rows.at(-1)).toEqual(['Tue, Nov 17', '7 h 17 min']);
});
test('steps and calories: the average a day; a step target is a goal to reach, a calorie target only a line', () => {
  const steps = trendOf('steps-trend', health, undefined, DAY);
  expect(steps).toMatchObject({logged: 30, average: 7400, target: 8000, reach: true, reached: 12});
  expect(trendWords(steps, DAY)).toMatchObject({figure: '7,400', unit: 'steps a day', note: 'Target 8,000 steps · reached on 12 of 30 days · highest 8,800 steps'});
  const week = trendOf('steps-trend', health, 'this-week', DAY);
  expect(week.values).toEqual([8100, 8800]); expect(trendWords(week, DAY)).toMatchObject({figure: '8,450', label: 'on average · this week'});
  const kcal = trendOf('calorie-trend', health, undefined, DAY);
  expect(kcal).toMatchObject({logged: 30, target: 2200, reach: false, reached: null});
  expect(kcal.highest).toMatchObject({date: '2026-11-12', value: 2357});
  expect(trendWords(kcal, DAY)).toMatchObject({figure: '1,976', unit: 'kcal a day', note: 'Your target: 2,200 kcal · highest 2,357 kcal'});
});
test('resting heart rate: none is recorded in the Showcase, so there is nothing to draw (the widget teaches)', () => {
  const view = trendOf('heart-trend', health, undefined, DAY);
  expect(view).toMatchObject({any: false, logged: 0, average: null, latest: null, target: null});
  expect(view.values.every(v => v === null)).toBe(true);
});
test('weight: the Weight card’s own readings, the change in words and the goal; the range follows the answer', () => {
  const {card, words} = weightTrend(health, undefined, DAY);
  expect(card.window.range).toBe('month'); expect(card.readings).toHaveLength(8);
  expect(words).toMatchObject({figure: '73.48', unit: 'kg', label: 'weight · logged yesterday', note: 'Down 1.1 kg since Oct 19 · your goal: 72 kg', asOf: 'the last 30 days · 8 of 30 days logged'}); // 74.6 kg on 19 October
  expect(card.target).toMatchObject({grams: 72000, text: '72 kg'});
  expect(weightRange({range: 'quarter', period: 'this-week'}, DAY)).toBe('quarter'); expect(weightRange({period: 'this-week'}, DAY)).toBe('week');
  expect(weightRange({period: 'this-month'}, DAY)).toBe('month'); expect(weightRange({period: 'last-90-days'}, DAY)).toBe('quarter'); expect(weightRange({period: 'this-year'}, DAY)).toBe('year');
  const week = weightTrend(health, {period: 'this-week'}, DAY); // the last 7 days hold two weigh-ins: 12 and 16 November
  expect(week.words.note).toBe('Down 0.2 kg since Nov 12 · your goal: 72 kg');
});
test('water by day: the last 7 days against the 2,000 mL target; today is still open', () => {
  const view = waterWeek(health, undefined, DAY);
  expect(view.days.map(d => d.value)).toEqual([2500, 2000, 2200, 2400, 2300, 2100, 1000]);
  expect(view.days.map(d => d.label)).toEqual(['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']);
  expect(view).toMatchObject({target: 2000, targetText: '2,000 mL', total: 14500, logged: 7, reached: 6, open: true, any: true});
  expect(view.days.at(-1)).toMatchObject({state: 'open', text: '1,000 mL'});
  expect(view.words).toMatchObject({figure: '6', unit: 'of 7 days', label: 'water target reached · the last 7 days', note: '14,500 mL in all, 2,071 mL a day · today still open'});
  // This month: 17 days, the newest fourteen drawn; 1 and 10 November hold nothing (unknown, not zero).
  const month = waterWeek(health, 'this-month', DAY);
  expect(month.days).toHaveLength(14); expect(month.days.find(d => d.date === '2026-11-10')).toMatchObject({value: null, text: 'nothing logged', state: 'none'});
  expect(month).toMatchObject({logged: 15, reached: 14, total: 32500}); expect(month.days[0]!.label).toBe('W'); // one letter a column past seven
});
test('nothing recorded: no trend holds a value, and the widgets teach', () => {
  const empty = createEmptyHealth();
  for (const kind of ['sleep-trend', 'steps-trend', 'heart-trend', 'calorie-trend'] as const) expect(trendOf(kind, empty, undefined, DAY)).toMatchObject({any: false, logged: 0, average: null});
  expect(weightTrend(empty, undefined, DAY).card.latest).toBeNull();
  expect(waterWeek(empty, undefined, DAY)).toMatchObject({any: false, logged: 0, target: null});
  expect(waterWeek(empty, undefined, DAY).days.every(d => d.value === null)).toBe(true);
});
