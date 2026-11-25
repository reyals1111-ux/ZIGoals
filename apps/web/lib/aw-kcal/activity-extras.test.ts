import {describe, expect, test} from 'vitest';
import {ACTIVITY_EXTRAS, activityExtrasSchema, distancePrefill, distanceShown, distanceUnitFor, emptyActivityExtras, enteredKcalText, extraOf, extraParts, liveExtras, readDistance, readEffort, readEnteredKcal, withActivityExtra, withoutActivityExtra} from './activity-extras';
import {readDeviceRecord} from '../device-record';
import {createEmptyHealth, healthSchema, saveActivity} from '../health';

/**
 * Session AW (kcal; owner decision 1a; TIER 3 stored formats): the activity extras record — additive, loose, versioned,
 * keyed by the activity's id — and the strict activity record left exactly as builds #37–#59 read it.
 */
const ID = 'health_walk-aw-0001', AT = '2026-11-17T09:00:00.000Z';
const storage = (raw: string | null) => ({getItem: () => raw});
describe('the record', () => {
  test('the activity itself is unchanged: no distance, effort or calories field on the strict record', () => {
    const h = saveActivity(createEmptyHealth(), {id: ID, date: '2026-11-17', name: 'Walk', steps: 0, minutes: 40}, AT);
    expect(Object.keys(h.activity[0]!).sort()).toEqual(['createdAt', 'date', 'id', 'minutes', 'name', 'steps', 'updatedAt']);
    expect(() => healthSchema.parse({...h, activity: [{...h.activity[0], kcal: 320}]})).toThrow();
  });
  test('set, correct and clear an activity’s extras; removing the activity removes them', () => {
    let r = withActivityExtra(emptyActivityExtras(), ID, {distanceKm: 4.2, effort: 'easy', kcal: 320});
    expect(r).toEqual({version: 1, items: {[ID]: {distanceKm: 4.2, effort: 'easy', kcal: 320}}});
    r = withActivityExtra(r, ID, {distanceKm: null, effort: 'hard', kcal: null});
    expect(r.items[ID]).toEqual({effort: 'hard'});
    expect(withActivityExtra(r, ID, {})).toEqual({version: 1, items: {}});
    expect(withoutActivityExtra(r, ID)).toEqual({version: 1, items: {}});
    expect(withoutActivityExtra(r, 'health_other-0001')).toBe(r);
  });
  test('read tolerantly: a later field is kept, an unreadable value is dropped, foreign bytes read as empty and say so', () => {
    const later = {version: 1, items: {[ID]: {kcal: 320, effort: 'very hard', distanceKm: -3, heartRate: 140}}, laterField: true};
    const read = readDeviceRecord(storage(JSON.stringify(later)), ACTIVITY_EXTRAS);
    expect(read.unreadable).toBe(false);
    expect(read.data.items[ID]).toEqual({kcal: 320, heartRate: 140});
    expect(readDeviceRecord(storage('{"version":2}'), ACTIVITY_EXTRAS)).toEqual({data: emptyActivityExtras(), unreadable: true});
    expect(readDeviceRecord(storage(null), ACTIVITY_EXTRAS)).toEqual({data: emptyActivityExtras(), unreadable: false});
    expect(() => activityExtrasSchema.parse({version: 1, items: {'not an id': {kcal: 1}}})).toThrow();
    expect(() => withActivityExtra(emptyActivityExtras(), ID, {kcal: 10_001})).toThrow();
    expect(() => withActivityExtra(emptyActivityExtras(), ID, {kcal: 2.5})).toThrow();
  });
  test('only the extras of activities that still exist are read', () => {
    const r = withActivityExtra(withActivityExtra(emptyActivityExtras(), ID, {kcal: 320}), 'health_gone-0001', {kcal: 90});
    expect([...liveExtras(r, [ID]).keys()]).toEqual([ID]);
    expect(extraOf(r, 'health_none-0001')).toBeNull();
    expect(extraOf(null, ID)).toBeNull();
  });
});

describe('what the form reads and the list shows', () => {
  test('distance in the unit beside the weight: kilometres with kg, miles with lb; kept in kilometres', () => {
    expect(distanceUnitFor('kg')).toBe('km');
    expect(distanceUnitFor('lb')).toBe('mi');
    expect(readDistance('4,2', 'km')).toBe(4.2);
    expect(readDistance('2.61', 'mi')).toBe(4.2);
    expect(readDistance(' ', 'km')).toBeNull();
    expect(() => readDistance('0', 'km')).toThrow(/^Enter a distance greater than 0 and at most 1,000 km/);
    expect(() => readDistance('0.0001', 'km')).toThrow(/^Enter a distance/);
    expect(() => readDistance('abc', 'mi')).toThrow(/^Enter a distance greater than 0 and at most 621 mi/);
    expect(distanceShown(4.2, 'km')).toBe('4.2 km');
    expect(distanceShown(4.2, 'mi')).toBe('2.61 mi');
    expect(distancePrefill(4.2, 'mi')).toBe('2.61');
    expect(distancePrefill(undefined, 'km')).toBe('');
  });
  test('calories: a whole number the person typed, never worked out; effort from its own list', () => {
    expect(readEnteredKcal('320')).toBe(320);
    expect(readEnteredKcal('')).toBeNull();
    for (const bad of ['0', '12.5', '-4', '10001', 'lots']) expect(() => readEnteredKcal(bad), bad).toThrow(/^Enter calories as a whole number from 1 to 10,000/);
    expect(readEffort('moderate')).toBe('moderate');
    expect(readEffort('')).toBeNull();
    expect(readEffort('extreme')).toBeNull();
  });
  test('the row: “4.2 km · Easy effort”, and the calories with their source, “320 kcal · you entered”', () => {
    expect(enteredKcalText(320)).toBe('320 kcal · you entered');
    expect(extraParts({distanceKm: 4.2, effort: 'easy', kcal: 320}, 'km')).toEqual(['4.2 km', 'Easy effort', '320 kcal · you entered']);
    expect(extraParts({effort: 'hard'}, 'km')).toEqual(['Hard effort']);
    expect(extraParts(null, 'km')).toEqual([]);
  });
});
