import {describe, expect, it} from 'vitest';
import {createEmptyHealth, type HealthTargets} from '../health';
import {netCarbs} from '../health-aa/macro-mode';
import {DEVICE_RECORD_EVENT, FOOD_PLUS_STORAGE_KEY, dayTargets, sugarAlcoholMg, sugarAlcoholsOf, weekdayOfDay, weekdayTargetsOf} from './day-target';
import {emptyWeekdayDraft, mondayToWeekdays, saveWeekdays, setSugarAlcohol, weekCalories} from './weekdays';
import {FOOD_PLUS_KEY, emptyFoodPlus} from './schema';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';

/** Session AV lane 2 (food, LEDGER #88, #97, #107): targets by weekday; sugar alcohols in net carbs. */
const base: HealthTargets = {...createEmptyHealth().targets, kcal: 2200, proteinMg: 120_000, carbsMg: 260_000, fatMg: 73_000};
describe('targets by weekday', () => {
  it('the inlined key and event equal their owners\' constants', () => {
    expect(FOOD_PLUS_STORAGE_KEY).toBe(FOOD_PLUS_KEY);
    expect(DEVICE_RECORD_EVENT).toBe(ZIGI_STORE_EVENT);
  });
  it('a weekday\'s own values replace the Targets\' for that day only; a blank field keeps them', () => {
    const draft = emptyWeekdayDraft(null);
    draft['6'] = {kcal: '2,600', proteinG: '150', carbsG: '', fatG: ''};
    const saved = saveWeekdays(emptyFoodPlus(), draft);
    expect(saved.ok).toBe(true);
    const record = saved.ok ? saved.value : emptyFoodPlus();
    expect(record.weekdays).toEqual({'6': {kcal: 2600, proteinG: 150}});
    expect(weekdayOfDay('2026-11-28')).toBe(6);
    const sat = dayTargets(base, '2026-11-28', record.weekdays!), mon = dayTargets(base, '2026-11-23', record.weekdays!);
    expect([sat.kcal, sat.proteinMg, sat.carbsMg, sat.byWeekday]).toEqual([2600, 150_000, 260_000, ['kcal', 'proteinMg']]);
    expect([mon.kcal, mon.byWeekday]).toEqual([2200, []]);
    expect(weekCalories(base, record.weekdays!, '2026-11-23')).toBe(2200 * 6 + 2600);
  });
  it('refuses a value that is not a whole number in range, naming the day and field; Monday copies to the weekdays', () => {
    const draft = emptyWeekdayDraft(null);
    draft['3'].fatG = '12.5';
    expect(saveWeekdays(emptyFoodPlus(), draft)).toEqual({ok: false, issue: {day: '3', field: 'fatG', message: 'Enter a whole number from 0 to 5,000 g fat, or leave it blank.'}});
    draft['3'].fatG = ''; draft['1'] = {kcal: '1900', proteinG: '', carbsG: '180', fatG: ''};
    const copied = mondayToWeekdays(draft);
    expect(['2', '3', '4', '5'].map(d => copied[d as '2'].carbsG)).toEqual(['180', '180', '180', '180']);
    expect(copied['6'].carbsG).toBe('');
    const all = saveWeekdays(emptyFoodPlus(), emptyWeekdayDraft(null));
    expect(all.ok && all.value.weekdays).toBeUndefined();
  });
  it('the first-chunk reader takes only whole numbers in range and never throws', () => {
    expect(weekdayTargetsOf(JSON.stringify({version: 1, weekdays: {'0': {kcal: 1800.5, proteinG: 90}, '1': {kcal: -1}, '9': {kcal: 2000}}}))).toEqual({'0': {proteinG: 90}});
    expect(weekdayTargetsOf('not json')).toEqual({});
    expect(weekdayTargetsOf(JSON.stringify({version: 2, weekdays: {'0': {kcal: 1800}}}))).toEqual({});
    expect(sugarAlcoholsOf(JSON.stringify({version: 1, sugarAlcohols: {'health_food-fict-001': 4000, bad: 3, 'health_food-fict-002': -1}}))).toEqual({'health_food-fict-001': 4000});
  });
});
describe('sugar alcohols in net carbs', () => {
  it('per serving, scaled by the servings eaten, taken off the carbs; blank clears; gone foods are dropped', () => {
    let r = setSugarAlcohol(emptyFoodPlus(), 'health_food-fict-001', '4,5');
    expect(r.sugarAlcohols).toEqual({'health_food-fict-001': 4500});
    r = setSugarAlcohol(r, 'health_food-fict-002', '2', new Set(['health_food-fict-002']));
    expect(r.sugarAlcohols).toEqual({'health_food-fict-002': 2000});
    expect(() => setSugarAlcohol(r, 'health_food-fict-002', 'lots')).toThrow('Enter 0 to 1,000 g of sugar alcohols');
    expect(setSugarAlcohol(r, 'health_food-fict-002', '').sugarAlcohols).toBeUndefined();
    const sa = sugarAlcoholMg([{sourceId: 'health_food-fict-002', sourceKind: 'food', quantityMilli: 1500}, {sourceId: 'health_food-fict-002', sourceKind: 'recipe', quantityMilli: 1000}], r.sugarAlcohols!);
    expect(sa).toBe(3000);
    const n = netCarbs([{kcal: 200, proteinMg: 1000, carbsMg: 30_000, fatMg: 1000, fiberMg: 5000}], sa);
    expect(n).toEqual({grams: 22, net: true, fiberKnownOf: 1});
    expect(netCarbs([{kcal: 200, proteinMg: 1000, carbsMg: 30_000, fatMg: 1000}])).toEqual({grams: 30, net: false, fiberKnownOf: 0});
  });
});
