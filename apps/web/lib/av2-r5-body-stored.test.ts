import {describe, expect, test} from 'vitest';
import {collectEverything} from './export/everything';
import {nextValue, planParts} from './restore/plan';
import {CYCLE_KEY, cycleSchema} from './cycle/store';
import {FOOD_PLUS_KEY, foodPlusSchema} from './food-plus/schema';
import {NOTIFY_KEY, notifyPrefsSchema} from './notify/prefs';

/**
 * Session AV lane 2 (r5-body; TIER 3 (stored formats), additive): every new optional field reads, a value this build cannot
 * read is dropped on its own (never the record), records written before keep reading, and Export everything → erase →
 * Restore keeps every new field (the notification prefs are exported and, as before, never restored). No new key: the three records are in Export everything already.
 */
const NOW = '2026-11-22T09:00:00.000Z';
const collect = (key: string, value: unknown) => collectEverything({[key]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
const roundTrip = (key: string, value: unknown) => {
  const part = planParts(JSON.parse(JSON.stringify(collect(key, value).json))).find(p => p.kind === 'device' && p.key === key);
  if (!part) return undefined;
  const back = nextValue(part, 'replace', undefined);
  return 'value' in back ? back.value : undefined;
};

describe('zigoals:cycle:v1 — own words, hidden and order (#380), cycles left out (#382), No period and perimenopause (#383)', () => {
  const OLD = {version: 1, on: true, plan: true, days: {'2026-10-03': {flow: 'medium', symptoms: ['cramps']}, '2026-10-20': {symptoms: ['headache'], note: 'Slept badly'}}};
  const NEW = {...OLD, days: {...OLD.days, '2026-10-21': {symptoms: ['migraine', 'low-energy']}}, own: [{id: 'migraine', word: 'Migraine'}, {id: 'sore-feet', word: 'Sore feet', gone: true}], hidden: ['acne'], order: ['tired', 'cramps'], leftOut: ['2026-09-05'], noPeriod: true, peri: true};
  test('an older record reads as before; the new fields read', () => {
    expect(cycleSchema.parse(OLD)).toEqual(OLD);
    expect(cycleSchema.parse(NEW)).toEqual(NEW);
  });
  test('a value this build cannot read is dropped alone, never the record', () => {
    expect(cycleSchema.parse({...NEW, own: [{id: 'Not An Id', word: 'x'}, {id: 'migraine', word: 'Migraine'}]}).own).toEqual([{id: 'migraine', word: 'Migraine'}]);
    expect(cycleSchema.parse({...NEW, own: 'words'}).own).toBeUndefined();
    expect(cycleSchema.parse({...NEW, hidden: [3]}).hidden).toBeUndefined();
    expect(cycleSchema.parse({...NEW, leftOut: ['soon']}).leftOut).toBeUndefined();
    expect(cycleSchema.parse({...NEW, noPeriod: 'yes', peri: false})).toMatchObject({noPeriod: undefined, peri: undefined, days: NEW.days});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(CYCLE_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:food-plus:v1 — lateMeal (#371)', () => {
  const OLD = {version: 1, times: {'health_entry-0001': '21:30'}};
  const NEW = {...OLD, lateMeal: {hours: 2, kcal: 450}};
  test('reads; a bad value is dropped alone', () => {
    expect(foodPlusSchema.parse(OLD)).toEqual(OLD);
    expect(foodPlusSchema.parse(NEW)).toEqual(NEW);
    expect(foodPlusSchema.parse({...NEW, lateMeal: {hours: 9, kcal: 450}})).toEqual({...OLD, lateMeal: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(FOOD_PLUS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:notify:v1 — habitParts (#369)', () => {
  const OLD = {version: 1, types: {habits: true}, mood: {time: '20:00'}};
  const NEW = {...OLD, habitParts: {on: true, morning: '07:30', afternoon: '12:30', evening: '18:00'}};
  test('reads; a bad time is dropped alone; a bad part is dropped alone', () => {
    expect(notifyPrefsSchema.parse(OLD)).toEqual(OLD);
    expect(notifyPrefsSchema.parse(NEW)).toEqual(NEW);
    expect(notifyPrefsSchema.parse({...NEW, habitParts: {...NEW.habitParts, evening: '25:00'}}).habitParts).toEqual({...NEW.habitParts, evening: undefined});
    expect(notifyPrefsSchema.parse({...NEW, habitParts: {morning: '07:30'}})).toEqual({...OLD, habitParts: undefined});
  });
  test('Export everything carries it (the notification prefs are exported, not restored: a new device asks again)', () => {
    expect((collect(NOTIFY_KEY, NEW).json as {device: Record<string, unknown>}).device.notify).toMatchObject({habitParts: NEW.habitParts});
    expect(planParts(JSON.parse(JSON.stringify(collect(NOTIFY_KEY, NEW).json))).some(x => x.kind === 'device' && x.key === NOTIFY_KEY)).toBe(false);
  });
});
