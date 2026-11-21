import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema, logHealthItem, saveFood} from '../health';
import {dailyData, saveMealFromDiary} from '../health-daily';
import {repeatDates, saveRepeatingPlans} from './repeat-plan';

/** Session AV (owner follow-up 1, F-REPEAT-PLAN): a saved meal planned on chosen weekdays, one ordinary plan per day. */
const AT = '2026-11-23T08:00:00.000Z';
describe('Session AV (F-REPEAT-PLAN)', () => {
  it('the chosen weekdays for the weeks asked, at most twelve', () => {
    expect(repeatDates('2026-11-23', [1, 4], 2)).toEqual(['2026-11-23', '2026-11-26', '2026-11-30', '2026-12-03']);
    expect(repeatDates('2026-11-23', [0], 40)).toHaveLength(12);
    expect(repeatDates('2026-11-23', [], 4)).toEqual([]);
  });
  it('one plan per day in the strict plan record; a day already planned is skipped', () => {
    let h = saveFood(createEmptyHealth(), {id: 'health_fictional-oats-01', name: 'Oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: AT, updatedAt: AT});
    h = logHealthItem(h, {id: 'health_fictional-log-001', sourceId: 'health_fictional-oats-01', sourceKind: 'food', date: '2026-11-22', meal: 'Breakfast', quantityMilli: 1000}, AT);
    h = saveMealFromDiary(h, 'health_fictional-meal-01', 'Fictional porridge', '2026-11-22', 'Breakfast', AT);
    const once = saveRepeatingPlans(h, {base: 'health_repeat-0001', savedMealId: 'health_fictional-meal-01', meal: 'Breakfast', dates: repeatDates('2026-11-23', [1, 3], 2)}, AT);
    expect(once.planned).toBe(4);
    expect(dailyData(once.data).plans.map(p => [p.date, p.meal, p.name])).toEqual([['2026-11-23', 'Breakfast', 'Fictional porridge'], ['2026-11-25', 'Breakfast', 'Fictional porridge'], ['2026-11-30', 'Breakfast', 'Fictional porridge'], ['2026-12-02', 'Breakfast', 'Fictional porridge']]);
    expect(healthSchema.safeParse(JSON.parse(JSON.stringify(once.data))).success).toBe(true);
    expect(saveRepeatingPlans(once.data, {base: 'health_repeat-0002', savedMealId: 'health_fictional-meal-01', meal: 'Breakfast', dates: ['2026-11-23', '2026-12-07']}, AT).planned).toBe(1);
  });
});
