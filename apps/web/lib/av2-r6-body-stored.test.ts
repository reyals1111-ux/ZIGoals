import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from './export/everything';
import {nextValue, planParts} from './restore/plan';
import {FOOD_PLUS_KEY, foodPlusSchema} from './food-plus/schema';
import {ENERGY_KEY, energySchema} from './energy/schema';
import {WORKOUTS_KEY, workoutsSchema} from './workouts/schema';
import {LOW_DAY_KEY, lowDaySchema} from './calm/low-day';
import {BRING_UP_KEY, bringUpSchema} from './clinician-report/bring-up';
import {AV2_R6_BODY_ERASE_KEYS, AV2_R6_BODY_EXPORT_KEYS, AV2_R6_BODY_PERSONAL_KEYS, BRING_UP_KEY_LITERAL, LOW_DAY_KEY_LITERAL} from './av2-r6-body-keys';
import {readPortions} from './food-plus/portions';
import {liftsOf} from './mood-words/lifts';

/**
 * Session AV lane 2, round 6 (r6-body; TIER 3 (stored formats), additive): every new optional field reads, a value this
 * build cannot read is dropped on its own (never the record), records written before keep reading, and Export everything
 * → erase → Restore keeps every new field. The two new keys' round trips run once the lead has spread
 * lib/av2-r6-body-keys.ts into the registries (`skipIf(!registered)`, as round 4's).
 */
const NOW = '2026-11-22T09:00:00.000Z';
const collect = (key: string, value: unknown) => collectEverything({[key]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
const roundTrip = (key: string, value: unknown) => {
  const part = planParts(JSON.parse(JSON.stringify(collect(key, value).json))).find(p => p.kind === 'device' && p.key === key);
  if (!part) return undefined;
  const back = nextValue(part, 'replace', undefined);
  return 'value' in back ? back.value : undefined;
};
const registered = (key: string) => Object.values(DEVICE_KEYS as Record<string, string>).includes(key);

describe('zigoals:energy:v1 — lifts (#412)', () => {
  const OLD = {version: 1, days: {'2026-11-20': {energy: 3, at: '2026-11-20T20:00:00.000Z'}}};
  const NEW = {...OLD, lifts: ['A walk round the block', 'Call my sister']};
  test('an older record reads as before; the new field reads; a bad line drops alone where read', () => {
    expect(energySchema.parse(OLD)).toEqual(OLD);
    expect(energySchema.parse(NEW)).toEqual(NEW);
    expect(liftsOf(energySchema.parse({...NEW, lifts: [3, 'Call my sister', '', 'x'.repeat(81)]}))).toEqual(['Call my sister']);
    expect(energySchema.parse({...NEW, lifts: 'walks'})).toEqual({...OLD, lifts: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(ENERGY_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:food-plus:v1 — portions (#418)', () => {
  const OLD = {version: 1, lateMeal: {hours: 3, kcal: 300}};
  const NEW = {...OLD, portions: {counters: [{id: 'veg', aim: {n: 5, per: 'day'}}, {id: 'own-nuts1', name: 'Nuts'}], days: {'2026-11-22': {veg: 2, 'own-nuts1': 1}}}};
  test('reads; a bad counter or day is dropped alone; a bad part is dropped alone', () => {
    expect(foodPlusSchema.parse(OLD)).toEqual(OLD);
    expect(foodPlusSchema.parse(NEW)).toEqual(NEW);
    const odd = foodPlusSchema.parse({...NEW, portions: {counters: [{id: 'BAD'}, {id: 'veg', aim: {n: 99, per: 'day'}}], days: {'soon': {veg: 1}, '2026-11-22': {veg: -1, fruit: 2}}}});
    expect(readPortions(odd)).toEqual({counters: [{id: 'veg'}], days: {'2026-11-22': {fruit: 2}}});
    expect(foodPlusSchema.parse({...NEW, portions: 'lots'})).toEqual({...OLD, portions: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(FOOD_PLUS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:workouts:v1 — light (#421), favouriteExercises (#420), bestsFrom (#422), exerciseDefaults (#424)', () => {
  const workout = {id: 'w1', name: 'Legs', date: '2026-11-20', type: 'strength', startedAt: '2026-11-20T17:00:00.000Z', endedAt: '2026-11-20T18:00:00.000Z', exercises: [{id: 'e1', exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: 's1', kind: 'normal', reps: 5, weightKg: 100, done: true}]}]};
  const OLD = {version: 1, workouts: [workout], templates: [], exercises: [], restSeconds: 90};
  const NEW = {...OLD, workouts: [{...workout, light: true}], favouriteExercises: ['squat', 'custom-abc'], bestsFrom: {squat: '2026-11-01', '*': '2026-10-01'}, exerciseDefaults: {squat: {sets: 3, reps: 8, restSeconds: 120}, plank: {sets: 3, seconds: 45}}};
  test('an older record reads as before; the new fields read', () => {
    expect(workoutsSchema.parse(OLD)).toEqual(OLD);
    expect(workoutsSchema.parse(NEW)).toEqual(NEW);
  });
  test('a value this build cannot read is dropped alone, never the record', () => {
    const odd = workoutsSchema.parse({...NEW, workouts: [{...workout, light: 'yes'}], favouriteExercises: ['squat', 3, 'squat', '__proto__'], bestsFrom: {squat: 'soon', deadlift: '2026-11-02'}, exerciseDefaults: {squat: {sets: 0}, plank: {sets: 2, reps: 500}}});
    expect(odd.workouts[0]!.light).toBeUndefined();
    expect(odd.favouriteExercises).toEqual(['squat']);
    expect(odd.bestsFrom).toEqual({deadlift: '2026-11-02'});
    expect(odd.exerciseDefaults).toEqual({plank: {sets: 2, reps: undefined}});
    expect(workoutsSchema.parse({...NEW, bestsFrom: 'today', exerciseDefaults: [1]})).toMatchObject({bestsFrom: {}, exerciseDefaults: {}, favouriteExercises: ['squat', 'custom-abc']});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(WORKOUTS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:low-day:v1 (#416) and zigoals:bring-up:v1 (#417), new keys', () => {
  const LOW = {version: 1, helps: ['A shower', 'Tea by the window'], people: ['Sam: “Can we talk for ten minutes?”'], later: ['The inbox'], note: 'It passes.', updatedAt: NOW};
  const BRING = {version: 1, items: [{id: 'bu-0001-abcd', text: 'Ask about the headaches', from: 'journal', day: '2026-11-20', createdAt: NOW}, {id: 'bu-0002-abcd', text: 'Sleep since October', from: 'typed', createdAt: NOW, doneAt: NOW}]};
  test('the literals are the owners’ keys, in every list', () => {
    expect(LOW_DAY_KEY_LITERAL).toBe(LOW_DAY_KEY); expect(BRING_UP_KEY_LITERAL).toBe(BRING_UP_KEY);
    expect(AV2_R6_BODY_PERSONAL_KEYS).toEqual([LOW_DAY_KEY, BRING_UP_KEY]); expect(AV2_R6_BODY_ERASE_KEYS).toEqual([LOW_DAY_KEY, BRING_UP_KEY]);
    expect(Object.values(AV2_R6_BODY_EXPORT_KEYS)).toEqual([LOW_DAY_KEY, BRING_UP_KEY]);
  });
  test('they read; a bad line or item is dropped alone', () => {
    expect(lowDaySchema.parse(LOW)).toEqual(LOW);
    expect(lowDaySchema.parse({...LOW, helps: ['', 'A shower', 4], note: 'x'.repeat(601)})).toEqual({...LOW, helps: ['A shower'], note: undefined});
    expect(bringUpSchema.parse(BRING)).toEqual(BRING);
    expect(bringUpSchema.parse({...BRING, items: [{id: 'nope', text: 'x'}, BRING.items[0], {...BRING.items[1], from: 'elsewhere'}]}).items).toEqual([BRING.items[0], {...BRING.items[1], from: 'typed'}]);
  });
  test.skipIf(!registered(LOW_DAY_KEY))('Export everything → erase → Restore keeps the low-day page', () => { expect(roundTrip(LOW_DAY_KEY, LOW)).toEqual(LOW); });
  test.skipIf(!registered(BRING_UP_KEY))('Export everything → erase → Restore keeps the list to bring up', () => { expect(roundTrip(BRING_UP_KEY, BRING)).toEqual(BRING); });
});
