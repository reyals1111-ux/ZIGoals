import {describe, expect, test} from 'vitest';
import {collectEverything} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {HEALTH_EXTRAS_KEY, healthExtrasSchema, setDrink} from '../health-extras';
import {NOTIFY_KEY, notifyPrefsSchema} from './prefs';

/**
 * Session AV lane 2 (health r3; LEDGER #280–#283, #286; TIER 3 (stored formats), additive): the notification prefs' water
 * spread and weigh-in reminder, and the health extras' own drinks, a drink's energy and sugar, and the water tip choice.
 * A record written by an earlier release reads as before; an unreadable new value is dropped, never a reason to refuse the
 * record; Export everything carries them, and the health extras come back on Restore.
 */
const AT = '2026-11-22T08:00:00.000Z';
const collect = (key: string, value: unknown) => collectEverything({[key]: JSON.stringify(value)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
const OLD_EXTRAS = {version: 1, drinks: {'w-1': {type: 'coffee', caffeineMg: 95}}, meals: {Breakfast: {name: 'Early', time: '07:30'}}};
const NEW_EXTRAS = {
  ...OLD_EXTRAS,
  drinks: {'w-1': {type: 'coffee', caffeineMg: 95}, 'w-2': {type: 'juice', own: 'orange-juice', kcal: 110, sugarG: 21.5}},
  ownDrinks: [{id: 'orange-juice', name: 'Orange juice', type: 'juice', sizeMl: 250, symbol: '🧃', colour: 'orange', kcal: 110, sugarG: 21.5}],
  waterTips: true,
};

describe('notification prefs: water through the day and the weigh-in reminder', () => {
  test('older prefs read as before', () => {
    const p = notifyPrefsSchema.parse({version: 1, types: {water: true}});
    expect(p.waterSpread).toBeUndefined();
    expect(p.weighIn).toBeUndefined();
  });
  test('the new fields read as written; an unreadable one is dropped and the rest kept', () => {
    const p = notifyPrefsSchema.parse({version: 1, types: {}, waterSpread: {on: true, from: '09:00', to: '21:00', every: 120}, weighIn: {time: '07:15', repeat: 'weekdays', weekdays: 1 | 16}});
    expect(p.waterSpread).toEqual({on: true, from: '09:00', to: '21:00', every: 120});
    expect(p.weighIn).toEqual({time: '07:15', repeat: 'weekdays', weekdays: 17});
    const bad = notifyPrefsSchema.parse({version: 1, types: {habits: false}, waterSpread: {on: true, from: '9am', to: '21:00', every: 45}, weighIn: {time: '07:15', repeat: 'monthly', day: 31}});
    expect(bad.types).toEqual({habits: false});
    expect(bad.waterSpread).toBeUndefined();
    expect(bad.weighIn).toEqual({time: '07:15', repeat: 'monthly'});
  });
  test('Export everything carries them (notification prefs are exported, not restored: a new device asks again)', () => {
    const p = {version: 1, types: {}, waterSpread: {on: true, from: '08:30', to: '20:30', every: 180}, weighIn: {time: '07:00', repeat: 'daily'}};
    expect((collect(NOTIFY_KEY, p).json as {device: Record<string, unknown>}).device.notify).toMatchObject({waterSpread: p.waterSpread, weighIn: p.weighIn});
  });
});

describe('health extras: own drinks, energy and sugar, water tips', () => {
  test('a record written before reads as before', () => {
    const r = healthExtrasSchema.parse(OLD_EXTRAS);
    expect(r).toEqual(OLD_EXTRAS);
    expect(r.ownDrinks).toBeUndefined();
    expect(r.waterTips).toBeUndefined();
  });
  test('the new fields read as written; an unreadable drink is dropped and the others kept', () => {
    expect(healthExtrasSchema.parse(NEW_EXTRAS)).toEqual(NEW_EXTRAS);
    const r = healthExtrasSchema.parse({...NEW_EXTRAS, waterTips: 'yes', ownDrinks: [{id: 'Bad Id', name: 'x', type: 'juice', sizeMl: 250}, NEW_EXTRAS.ownDrinks[0], {id: 'tea', name: 'Tea', type: 'tea', sizeMl: 9000}], drinks: {...NEW_EXTRAS.drinks, 'w-3': {type: 'tea', kcal: -4, sugarG: 'lots'}}});
    expect(r.ownDrinks).toEqual(NEW_EXTRAS.ownDrinks);
    expect(r.waterTips).toBeUndefined();
    expect(r.drinks?.['w-3']).toEqual({type: 'tea'});
    expect(r.meals).toEqual(OLD_EXTRAS.meals);
  });
  test('an older build reading a drink entry still finds its fixed type and caffeine', () => {
    const older = {type: (NEW_EXTRAS.drinks['w-2'] as {type: string}).type};
    expect(older.type).toBe('juice');
  });
  test('setDrink keeps the energy, sugar and own drink when they are not given, and replaces them when they are', () => {
    const r = healthExtrasSchema.parse(NEW_EXTRAS);
    expect(setDrink(r, 'w-2', 'juice', 5).drinks?.['w-2']).toEqual({type: 'juice', caffeineMg: 5, own: 'orange-juice', kcal: 110, sugarG: 21.5});
    expect(setDrink(r, 'w-2', 'milk').drinks?.['w-2']).toEqual({type: 'milk', kcal: 110, sugarG: 21.5});
    expect(setDrink(r, 'w-2', 'juice', undefined, {kcal: 90}).drinks?.['w-2']).toEqual({type: 'juice', own: 'orange-juice', kcal: 90});
    expect(setDrink(r, 'w-9', 'water', undefined, {kcal: 0}).drinks?.['w-9']).toEqual({type: 'water', kcal: 0});
    expect(setDrink(r, 'w-9', 'water').drinks?.['w-9']).toBeUndefined();
  });
  test('Export everything → erase → Restore keeps every new field', () => {
    const part = planParts(JSON.parse(JSON.stringify(collect(HEALTH_EXTRAS_KEY, NEW_EXTRAS).json))).find(p => p.kind === 'device' && p.key === HEALTH_EXTRAS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(NEW_EXTRAS);
  });
});
