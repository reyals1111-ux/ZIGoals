import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../health';
import {healthDay} from '../health-daily';
import {healthGoalLine, healthGoalProgress, windowDays} from './progress';
import {type HealthGoal} from './schema';

// G3 (docs/product/features/G3-health-goals.md, "Tests"): progress from the Health records only.
const DAY = '2026-10-01', AT = '2026-09-01T07:00:00.000Z';
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const goal = (patch: Partial<HealthGoal>): HealthGoal => ({version: 1, id: '92000000-0000-4000-8000-0000000000a1', name: 'Walk more', measure: 'steps', direction: 'at-least', target: {value: '8000', decimals: 0}, unit: 'steps', window: {kind: 'rolling', weeks: 4}, status: 'active', createdAt: AT, updatedAt: AT, ...patch});
const activity = (entries: {date: string; steps: number; minutes: number}[]): HealthData => ({...createEmptyHealth(), activity: entries.map((a, i) => ({id: `health_activity-${String(i).padStart(3, '0')}`, name: 'Walk', createdAt: AT, updatedAt: AT, ...a}))});
const daily = (health: HealthData, patch: Partial<NonNullable<HealthData['daily']>['preferences']>, water: {date: string; amountMilli: number}[] = []): HealthData => ({...health, daily: {version: 1, favorites: [], savedMeals: [], plans: [], waterOperations: [], copyOperations: [], groceryNotes: '', water: water.map((w, i) => ({id: `health_water-${String(i).padStart(3, '0')}`, unit: 'ml' as const, createdAt: AT, updatedAt: AT, ...w})), preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg', ...patch}}});

describe('healthGoalProgress', () => {
  test('Showcase on its day: Walk more reads 7,475 of 8,000 steps over 28 recorded days', () => {
    const health = healthSchema.parse(JSON.parse(buildShowcase(DAY).records[HEALTH_STORAGE_KEY]!));
    const progress = healthGoalProgress(goal({}), health, DAY);
    expect(progress).toEqual({kind: 'value', current: 7475, target: 8000, unit: 'steps', percent: 93.4375, days: 28, done: false, detail: '28 days with activity recorded · 209,300 steps in total', ended: undefined});
    expect(healthGoalLine(goal({}), progress)).toBe('7,475 of 8,000 steps');
  });
  test('steps: no activity is no data; the average counts recorded days only', () => {
    expect(healthGoalProgress(goal({}), createEmptyHealth(), DAY)).toEqual({kind: 'no-data', ended: undefined});
    const one = healthGoalProgress(goal({}), activity([{date: '2026-09-20', steps: 12000, minutes: 90}]), DAY);
    expect(one).toMatchObject({kind: 'value', current: 12000, days: 1, done: true, percent: 100});
    expect(healthGoalLine(goal({}), {kind: 'no-data'})).toBe('No data yet');
  });
  test('water days: the personal target, or any water when none is set', () => {
    const water = goal({measure: 'water', unit: 'days', target: {value: '5', decimals: 0}, window: {kind: 'rolling', weeks: 2}});
    const entries = [{date: '2026-09-28', amountMilli: 750_000}, {date: '2026-09-29', amountMilli: 2_000_000}, {date: '2026-09-30', amountMilli: 2_250_000}];
    expect(healthGoalProgress(water, daily(createEmptyHealth(), {waterTargetMl: 2000}, entries), DAY)).toMatchObject({kind: 'value', current: 2, target: 5, days: 14, detail: '2 of 14 days so far'});
    expect(healthGoalProgress(water, daily(createEmptyHealth(), {}, entries), DAY)).toMatchObject({kind: 'value', current: 3});
    expect(healthGoalProgress(water, daily(createEmptyHealth(), {}), DAY)).toEqual({kind: 'no-data', ended: undefined});
  });
  test('exercise reps and active minutes add the window; a deleted counter says so', () => {
    const counters: HealthData = {...createEmptyHealth(), exercise: {version: 1, counters: [{id: 'health_counter-pushups', name: 'Push-ups', icon: 'pushup'}], days: [20, 26, null, 30].flatMap((count, i) => count === null ? [] : [{id: `health_counter-pushups@2026-09-${20 + i}`, counterId: 'health_counter-pushups', date: `2026-09-${20 + i}`, count}])}};
    const reps = goal({measure: 'exercise', exerciseId: 'health_counter-pushups', unit: 'reps', target: {value: '100', decimals: 0}});
    expect(healthGoalProgress(reps, counters, DAY)).toMatchObject({kind: 'value', current: 76, days: 3, done: false, percent: 76});
    expect(healthGoalProgress(goal({measure: 'exercise', exerciseId: 'health_counter-gone', unit: 'reps'}), counters, DAY)).toEqual({kind: 'no-data', detail: 'This counter was deleted.', ended: undefined});
    expect(healthGoalProgress(goal({measure: 'activeMinutes', unit: 'minutes', target: {value: '60', decimals: 0}}), activity([{date: '2026-09-28', steps: 1, minutes: 35}, {date: '2026-09-29', steps: 1, minutes: 40}]), DAY)).toMatchObject({kind: 'value', current: 75, done: true, percent: 100});
  });
  test('weight: the 30-day average in the goal\'s unit, compared in grams, never a percentage', () => {
    const readings = (grams: number[]): HealthData => ({...createEmptyHealth(), weights: grams.map((g, i) => ({id: `health_weight-${String(i).padStart(3, '0')}`, date: `2026-09-${String(10 + i).padStart(2, '0')}`, grams: g, createdAt: AT, updatedAt: AT}))});
    const down = goal({measure: 'weight', direction: 'down', unit: 'kg', target: {value: '72', decimals: 0}});
    const high = healthGoalProgress(down, readings([74600, 74200, 73800, 73440]), DAY);
    expect(high).toMatchObject({kind: 'value', current: 74.01, target: 72, unit: 'kg', percent: null, days: 4, done: false, detail: '30-day average of 4 readings · latest 73.44 kg on 2026-09-13'});
    expect(healthGoalLine(down, high)).toBe('74.01 towards 72 kg');
    expect(healthGoalProgress(down, readings([72000, 71900, 71800]), DAY)).toMatchObject({done: true, current: 71.9});
    const lb = goal({measure: 'weight', direction: 'down', unit: 'lb', target: {value: '1587', decimals: 1}});
    expect(healthGoalProgress(lb, readings([72000]), DAY)).toMatchObject({current: 158.73, done: false});
    expect(healthGoalProgress(lb, readings([71900]), DAY)).toMatchObject({current: 158.51, done: true});
    expect(healthGoalProgress(down, createEmptyHealth(), DAY)).toEqual({kind: 'no-data', ended: undefined});
  });
  test('windows: rolling weeks end today; a date goal starts on its Health day and ends with its final figure', () => {
    expect(windowDays(goal({}), DAY, null)).toEqual({start: '2026-09-04', end: DAY});
    const by = goal({window: {kind: 'by', date: '2026-09-20'}, createdAt: '2026-09-01T23:30:00.000Z'});
    expect(windowDays(by, DAY, 'Pacific/Kiritimati')).toEqual({start: '2026-09-02', end: '2026-09-20'});
    expect(windowDays(by, DAY, 'Etc/GMT+12')).toEqual({start: '2026-09-01', end: '2026-09-20'});
    const ended = healthGoalProgress(by, activity([{date: '2026-09-10', steps: 9000, minutes: 60}, {date: '2026-09-25', steps: 20000, minutes: 60}]), DAY);
    expect(ended).toMatchObject({kind: 'value', current: 9000, days: 1, ended: '2026-09-20'});
    // DST days are consecutive window days through healthDay.
    const spring = windowDays(goal({window: {kind: 'rolling', weeks: 1}}), healthDay('Europe/Brussels', new Date('2026-03-29T12:00:00Z')), 'Europe/Brussels');
    expect(spring).toEqual({start: '2026-03-23', end: '2026-03-29'});
  });
  test('today comes from the Health journal\'s zone', () => {
    expect(healthDay('Pacific/Kiritimati', new Date('2026-10-01T11:30:00Z'))).toBe('2026-10-02');
    expect(healthDay('Etc/GMT+12', new Date('2026-10-01T11:30:00Z'))).toBe('2026-09-30');
    expect(windowDays(goal({}), healthDay('Pacific/Kiritimati', new Date('2026-10-01T11:30:00Z')), 'Pacific/Kiritimati').end).toBe('2026-10-02');
  });
});
