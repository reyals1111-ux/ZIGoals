import {describe, expect, test} from 'vitest';
import {createEmptyHealth, type HealthData} from './health';
import {healthDay} from './health-daily';
import {healthExtrasSchema, type HealthExtras} from './health-extras';
import {dismissFastStart, fastStartDue, setFastAfterMeal} from './meal-reminders';

/** Session AL Part 15 (AL-COMPETITOR-GAP-049/067/081): "after I log Dinner, ask whether to start a fast". Fictional data. */
const now = new Date('2026-11-08T19:30:00Z');
const withDinner = (createdAt: string): HealthData => {
  const h = createEmptyHealth(), day = healthDay(null, now);
  const entry = {id: 'health_dinner-0001', sourceId: 'health_food-00001', sourceKind: 'food', snapshot: {}, date: day, meal: 'Dinner', quantityMilli: 1000, createdAt, updatedAt: createdAt};
  return {...h, diary: [entry]} as unknown as HealthData;
};
const extras: HealthExtras = {version: 1};
describe('a fast\'s start, tied to the Diary', () => {
  test('off by default; on, it asks once the chosen meal is logged today, with the person\'s own hours', () => {
    const health = withDinner('2026-11-08T19:10:00.000Z');
    expect(fastStartDue({extras, health, sessions: [], now})).toBeNull();
    const on = setFastAfterMeal(extras, 'Dinner');
    expect(fastStartDue({extras: on, health, sessions: [], now})).toMatchObject({meal: 'Dinner', label: 'Dinner', loggedAt: '2026-11-08T19:10:00.000Z', hours: 16});
    // The last fast's own target is reused; nothing is suggested.
    const past = [{startedAt: '2026-11-06T20:00:00.000Z', endedAt: '2026-11-07T10:00:00.000Z', targetHours: 14}];
    expect(fastStartDue({extras: on, health, sessions: past, now})?.hours).toBe(14);
    // Another meal chosen: nothing until that meal is logged.
    expect(fastStartDue({extras: setFastAfterMeal(extras, 'Snacks'), health, sessions: [], now})).toBeNull();
    expect(fastStartDue({extras: on, health: createEmptyHealth(), sessions: [], now})).toBeNull();
  });
  test('it stays away once a fast runs or started after the meal, or after "Not today"', () => {
    const health = withDinner('2026-11-08T19:10:00.000Z'), on = setFastAfterMeal(extras, 'Dinner');
    expect(fastStartDue({extras: on, health, sessions: [{startedAt: '2026-11-08T19:20:00.000Z', endedAt: null, targetHours: 16}], now})).toBeNull();
    expect(fastStartDue({extras: on, health, sessions: [{startedAt: '2026-11-08T19:20:00.000Z', endedAt: '2026-11-08T19:25:00.000Z', targetHours: 16}], now})).toBeNull();
    // A fast that ended before the meal does not count.
    expect(fastStartDue({extras: on, health, sessions: [{startedAt: '2026-11-07T19:00:00.000Z', endedAt: '2026-11-08T11:00:00.000Z', targetHours: 16}], now})).not.toBeNull();
    const due = fastStartDue({extras: on, health, sessions: [], now})!;
    const dismissed = dismissFastStart(on, due.day);
    expect(fastStartDue({extras: dismissed, health, sessions: [], now})).toBeNull();
    // Choosing the meal again asks again today; off removes the field.
    expect(fastStartDue({extras: setFastAfterMeal(dismissed, 'Dinner'), health, sessions: [], now})).not.toBeNull();
    expect('fastAfterMeal' in setFastAfterMeal(on, null)).toBe(false);
  });
  test('stored format: additive and loose; an unreadable value is dropped on its own', () => {
    const read = healthExtrasSchema.parse({version: 1, meals: {Dinner: {time: '19:00'}}, fastAfterMeal: {meal: 'Supper'}});
    expect(read.meals?.Dinner?.time).toBe('19:00');
    expect(read.fastAfterMeal).toBeUndefined();
    expect(healthExtrasSchema.parse({version: 1, fastAfterMeal: {meal: 'Dinner', hours: 99, later: true}}).fastAfterMeal).toEqual({meal: 'Dinner', later: true});
  });
});
