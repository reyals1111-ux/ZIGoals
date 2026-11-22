import {describe, expect, test} from 'vitest';
import {createEmptyHealth, type HealthData} from '../health';
import {CALORIE_WEEK, calorieWeekSchema, clearFreeDay, freeDayLine, freeDayShares, planFreeDay, shiftCalories, weekBudget, type CalorieWeek} from './calorie-week';
import {KCAL_FLOOR} from './energy';
import {weekDays} from './planner';
import {emptyHealthExtras} from '../health-extras';
import {closeReturnNote, lastFoodDay, returnNoteDue, setReturnNote} from '../food-log/return-note';
import {emptyMoreGoals} from '../health-goals/more';
import {bandDays, clearWeightBand, setWeightBand} from '../health-goals/band';
import {addLocalDays} from '../local-date';

/** Session AV lane 2, round 4 (health; Noom, LEDGER #328, #329, #331): a free day, a note for a harder week, a weight band. */
const TODAY = '2026-11-18'; // a Wednesday; the week runs Monday 16 to Sunday 22 November
const withTarget = (kcal: number | null): HealthData => ({...createEmptyHealth(), targets: {...createEmptyHealth().targets, kcal}});
const empty: CalorieWeek = CALORIE_WEEK.empty();

describe('a planned free day (LEDGER #328)', () => {
  test('the extra on its day, taken evenly from the week’s other days from the day it was planned on; the weekly total stays', () => {
    const r = planFreeDay(empty, 2000, '2026-11-21', 600, TODAY);
    expect(r.freeDay).toEqual({date: '2026-11-21', extraKcal: 600, plannedOn: TODAY});
    const week = weekBudget(withTarget(2000), r, TODAY, TODAY)!;
    expect(week.days.map(d => d.budget)).toEqual([2000, 2000, 1850, 1850, 1850, 2600, 1850]);
    expect(week.days[5]).toMatchObject({free: 600});
    expect(week.days[2]).toMatchObject({gave: 150});
    expect(week.weeklyBudget).toBe(14_000);
  });
  test('never below the coach’s floor: a day with less room gives what it has, the rest is spread; too much is refused', () => {
    const shifted = shiftCalories(empty, 1500, 2, 5, 300); // Wednesday 1,200 (at the floor), Saturday 1,800
    const shares = freeDayShares(planFreeDay(shifted, 1500, '2026-11-22', 600, TODAY), 1500, weekDays(TODAY))!;
    expect(shares.gives['2026-11-18']).toBe(0);
    expect(Object.values(shares.gives).reduce((a, b) => a + b, 0)).toBe(600);
    expect(Math.min(...weekBudget(withTarget(1500), planFreeDay(shifted, 1500, '2026-11-22', 600, TODAY), TODAY, TODAY)!.days.map(d => d.budget))).toBeGreaterThanOrEqual(KCAL_FLOOR);
    expect(() => planFreeDay(empty, 1300, '2026-11-22', 2000, TODAY)).toThrow(/can give 400 kcal at most/);
    expect(() => planFreeDay(empty, 2000, '2026-11-10', 400, TODAY)).toThrow('Choose a day from today on.');
    expect(() => planFreeDay(empty, 2000, '2026-11-21', 20, TODAY)).toThrow(/from 50 to 2000/);
  });
  test('shown in its own week only, gone the week after; cancel removes it', () => {
    const r = planFreeDay(empty, 2000, '2026-11-21', 600, TODAY);
    expect(weekBudget(withTarget(2000), r, '2026-11-25', '2026-11-25')!.days.every(d => !d.free && !d.gave && d.budget === 2000)).toBe(true);
    expect(clearFreeDay(r).freeDay).toBeUndefined();
    expect(calorieWeekSchema.parse(clearFreeDay(r))).toEqual(empty);
  });
});

// Session AV lane 2 (review B4E-9): the food day's line names the free day unless it is today.
describe('the free day’s line on the food day', () => {
  const fmt = {number: (n: number) => n.toLocaleString('en-US'), day: (d: string) => `day ${d}`};
  test('"today" on today, the day named on another', () => {
    expect(freeDayLine(600, TODAY, TODAY, fmt)).toBe('A planned free day: 600 kcal more today, taken evenly from this week’s other days.');
    expect(freeDayLine(1200, '2026-11-21', TODAY, fmt)).toBe('A planned free day: 1,200 kcal more on day 2026-11-21, taken evenly from that week’s other days.');
  });
});

describe('a note for a harder week (LEDGER #329)', () => {
  const diaryOn = (...dates: string[]): HealthData => ({...createEmptyHealth(), diary: dates.map((date, i) => ({id: `health_diary-note-${String(i).padStart(3, '0')}`, date} as HealthData['diary'][number]))});
  const extras = (() => { const r = setReturnNote(emptyHealthExtras(), '  Why: I want to feel steady.\r\nOne small thing: log breakfast.  '); if (!r.ok) throw new Error(r.message); return r.value; })();
  test('kept as written (trimmed); blank removes it; too long is refused', () => {
    expect(extras.returnNote).toEqual({text: 'Why: I want to feel steady.\nOne small thing: log breakfast.'});
    expect(setReturnNote(extras, '   ')).toEqual({ok: true, value: {version: 1, returnNote: undefined}});
    expect(setReturnNote(extras, 'x'.repeat(401)).ok).toBe(false);
  });
  test('shown after three or more days without a food log, until closed or food is logged; never a count of days', () => {
    expect(lastFoodDay(diaryOn('2026-11-10', '2026-11-14'), TODAY)).toBe('2026-11-14');
    expect(returnNoteDue(diaryOn('2026-11-14'), extras, TODAY)).toEqual({text: extras.returnNote!.text, lastLogged: '2026-11-14'});
    expect(returnNoteDue(diaryOn('2026-11-15'), extras, TODAY)).toBeNull(); // two days away
    expect(returnNoteDue(diaryOn('2026-11-14', TODAY), extras, TODAY)).toBeNull(); // food logged today
    expect(returnNoteDue(diaryOn(), extras, TODAY)).toBeNull(); // never logged: not a return
    expect(returnNoteDue(diaryOn('2026-11-14'), emptyHealthExtras(), TODAY)).toBeNull();
    const closed = closeReturnNote(extras, '2026-11-14');
    expect(returnNoteDue(diaryOn('2026-11-14'), closed, TODAY)).toBeNull();
    // The next return shows it again.
    expect(returnNoteDue(diaryOn('2026-11-14', '2026-11-19'), closed, addLocalDays('2026-11-19', 4))).not.toBeNull();
  });
});

describe('keep your weight in a band (LEDGER #331)', () => {
  const weights = (grams: number[]): HealthData => ({...createEmptyHealth(), weights: grams.map((g, i) => ({id: `health_weight-band-${String(i).padStart(3, '0')}`, date: addLocalDays(TODAY, -grams.length + 1 + i), grams, createdAt: `${TODAY}T07:00:00.000Z`, updatedAt: `${TODAY}T07:00:00.000Z`} as unknown as HealthData['weights'][number])).map((w, i) => ({...w, grams: grams[i]!}))});
  test('set in kg or lb, said which field to fix; removed', () => {
    const kg = setWeightBand(emptyMoreGoals(), '70', '73,5', 'kg', `${TODAY}T08:00:00.000Z`);
    expect(kg.ok && kg.band).toMatchObject({lowGrams: 70_000, highGrams: 73_500});
    const lb = setWeightBand(emptyMoreGoals(), '150', '160', 'lb', `${TODAY}T08:00:00.000Z`);
    expect(lb.ok && lb.band).toMatchObject({lowGrams: 68_039, highGrams: 72_575});
    const field = (lo: string, hi: string) => { const r = setWeightBand(emptyMoreGoals(), lo, hi, 'kg', `${TODAY}T08:00:00.000Z`); return r.ok ? null : r.field; };
    expect(field('', '73')).toBe('low'); expect(field('70', 'x')).toBe('high'); expect(field('70', '70.2')).toBe('high'); expect(field('5', '73')).toBe('low');
    expect(kg.ok && clearWeightBand(kg.value).weightBand).toBeUndefined();
  });
  test('the trend’s days inside the band in the last 30', () => {
    const data = weights(Array.from({length: 30}, (_, i) => i < 15 ? 72_000 : 75_000));
    const r = bandDays(data, {lowGrams: 70_000, highGrams: 73_000, createdAt: `${TODAY}T08:00:00.000Z`}, TODAY);
    expect(r.days).toBe(30);
    expect(r.inside + r.above + r.below).toBe(30);
    expect(r.inside).toBeGreaterThanOrEqual(15);
    expect(r.above).toBeGreaterThan(0);
    expect(bandDays(createEmptyHealth(), {lowGrams: 70_000, highGrams: 73_000, createdAt: `${TODAY}T08:00:00.000Z`}, TODAY)).toEqual({inside: 0, days: 0, above: 0, below: 0});
  });
});
