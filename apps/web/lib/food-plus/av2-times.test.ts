import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthData, type HealthDiaryEntry} from '../health';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {FOOD_PLUS_KEY_LITERAL} from '../av2-food-keys';
import {FOOD_PLUS, FOOD_PLUS_KEY, emptyFoodPlus, foodPlusSchema} from './schema';
import {dayPartOf, dayTimeline, eatenAt, eatingWindow, nutrientTiming, setEatenAt, share} from './times';

/** Session AV lane 2 (food, LEDGER #101, #108): eaten-at times and nutrient timing; the record's round trip. */
const ZONE = 'Europe/Amsterdam';
const entry = (id: string, date: string, createdAt: string, kcal: number, proteinMg: number | null, meal: HealthDiaryEntry['meal'] = 'Lunch'): HealthDiaryEntry => ({id, sourceId: 'health_food-fict-001', sourceKind: 'food', snapshot: {name: `Fictional ${id.slice(-3)}`, servingGrams: 100, nutrients: {kcal, proteinMg, carbsMg: 10_000, fatMg: 5000}}, date, meal, quantityMilli: 1000, createdAt, updatedAt: createdAt});
const health = (diary: HealthDiaryEntry[]): HealthData => healthSchema.parse({...createEmptyHealth(), diary});
const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }} as unknown as Storage}; };

describe('eaten-at times', () => {
  it('an entry logged on its own day reads the clock it was logged at, in the journal\'s zone; another day reads none', () => {
    const same = entry('health_diary-t-001', '2026-11-23', '2026-11-23T07:40:00.000Z', 300, 20_000);
    const later = entry('health_diary-t-002', '2026-11-22', '2026-11-23T07:40:00.000Z', 300, 20_000);
    expect(eatenAt(same, null, ZONE)).toEqual({clock: '08:40', set: false});
    expect(eatenAt(later, null, ZONE)).toBeNull();
  });
  it('a set time wins; "none" takes it off; null goes back to the logged time; ids no longer in the diary are dropped', () => {
    const e = entry('health_diary-t-001', '2026-11-23', '2026-11-23T07:40:00.000Z', 300, 20_000);
    let r = setEatenAt(emptyFoodPlus(), e.id, '07:15');
    expect(eatenAt(e, r, ZONE)).toEqual({clock: '07:15', set: true});
    r = setEatenAt(r, 'health_diary-gone-0001', '12:00');
    r = setEatenAt(r, e.id, 'none', new Set([e.id]));
    expect(eatenAt(e, r, ZONE)).toBeNull();
    expect(Object.keys(r.times!)).toEqual([e.id]);
    r = setEatenAt(r, e.id, null);
    expect(r.times).toBeUndefined();
    expect(eatenAt(e, r, ZONE)).toEqual({clock: '08:40', set: false});
    expect(() => setEatenAt(r, e.id, '25:00')).toThrow('Enter a time like 07:45.');
  });
  it('the day in order, its eating window', () => {
    const h = health([entry('health_diary-t-003', '2026-11-23', '2026-11-23T18:30:00.000Z', 600, 40_000, 'Dinner'), entry('health_diary-t-001', '2026-11-23', '2026-11-23T06:45:00.000Z', 300, 12_000, 'Breakfast'), entry('health_diary-t-002', '2026-11-23', '2026-11-23T11:05:00.000Z', 500, 30_000)]);
    expect(dayTimeline(h, null, ZONE, '2026-11-23').map(r => r.at?.clock)).toEqual(['07:45', '12:05', '19:30']);
    expect(eatingWindow(h, null, ZONE, '2026-11-23')).toEqual({first: '07:45', last: '19:30', minutes: 705});
    expect(eatingWindow(h, null, ZONE, '2026-11-20')).toBeNull();
  });
});

describe('nutrient timing', () => {
  it('sums each part of the day; untimed entries are counted apart; an unknown value is left out, never 0', () => {
    const h = health([
      entry('health_diary-t-001', '2026-11-23', '2026-11-23T06:45:00.000Z', 300, 12_000, 'Breakfast'),
      entry('health_diary-t-002', '2026-11-23', '2026-11-23T11:05:00.000Z', 500, null),
      entry('health_diary-t-003', '2026-11-22', '2026-11-22T18:30:00.000Z', 600, 36_000, 'Dinner'),
      entry('health_diary-t-004', '2026-11-21', '2026-11-23T09:00:00.000Z', 200, 5000, 'Snacks'),
    ]);
    const t = nutrientTiming(h, null, ZONE, '2026-11-23', 7);
    expect(t.timedEntries).toBe(3); expect(t.untimedEntries).toBe(1); expect(t.daysWithTimes).toBe(2);
    const morning = t.parts.find(p => p.key === 'morning')!, evening = t.parts.find(p => p.key === 'evening')!, midday = t.parts.find(p => p.key === 'midday')!;
    expect([morning.proteinMg, midday.proteinMg, evening.proteinMg]).toEqual([12_000, 0, 36_000]);
    expect(midday.kcal).toBe(500);
    expect(share(t, evening, 'proteinMg')).toBe(75);
    expect(nutrientTiming(h, null, ZONE, '2026-11-23', 1).timedEntries).toBe(2);
    expect(['00:00', '04:59', '05:00', '13:59', '21:00', '23:59'].map(dayPartOf)).toEqual(['early', 'early', 'morning', 'midday', 'late', 'late']);
  });
});

describe('the food-plus record', () => {
  it('its key literal; a part this build cannot read is dropped alone, never the whole record', () => {
    expect(FOOD_PLUS_KEY_LITERAL).toBe(FOOD_PLUS_KEY);
    const parsed = foodPlusSchema.parse({version: 1, times: {'health_diary-t-001': 'noon'}, weekdays: {'6': {kcal: 2400, proteinG: 150}}, future: {kept: true}});
    expect(parsed.times).toBeUndefined();
    expect(parsed.weekdays).toEqual({'6': {kcal: 2400, proteinG: 150}});
    expect((parsed as Record<string, unknown>).future).toEqual({kept: true});
  });
  it('export → erase → restore keeps every field (the record is exported and restored as its JSON text)', () => {
    const {m, storage} = memory();
    updateDeviceRecord(storage, FOOD_PLUS, r => setEatenAt(r, 'health_diary-t-001', '07:15'));
    updateDeviceRecord(storage, FOOD_PLUS, r => foodPlusSchema.parse({...r, weekdays: {'0': {kcal: 1800}}, checkIn: {weekday: 5, partial: ['2026-11-20']}, challenge: {daysPerWeek: 5, since: '2026-11-16'}, notify: true, sugarAlcohols: {'health_food-fict-001': 4000}, photos: {'health_food-fict-001': {takenAt: '2026-11-23T08:00:00.000Z'}}}));
    const exported = m.get(FOOD_PLUS_KEY)!;
    m.delete(FOOD_PLUS_KEY);
    expect(readDeviceRecord(storage, FOOD_PLUS)).toEqual({data: emptyFoodPlus(), unreadable: false});
    m.set(FOOD_PLUS_KEY, exported);
    const back = readDeviceRecord(storage, FOOD_PLUS);
    expect(back.unreadable).toBe(false);
    expect(back.data).toEqual(JSON.parse(exported));
    expect(back.data.times).toEqual({'health_diary-t-001': '07:15'});
    expect(back.data.checkIn).toEqual({weekday: 5, partial: ['2026-11-20']});
  });
});
