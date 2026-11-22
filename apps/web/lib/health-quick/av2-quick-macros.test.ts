import {describe, expect, it} from 'vitest';
import {createEmptyHealth, dailyHealthSummary, healthSchema, logHealthItem, saveFood} from '../health';
import {dailyData, saveMealFromDiary} from '../health-daily';
import {QUICK_ADD_PREFIX, quickAddSourceId, quickCalories, quickMacro} from './calories';

/** Session AV lane 2 (food, LEDGER #86; q3 #3 check 8): quick add with optional macros, and a meal saved from its menu. */
const AT = '2026-11-23T08:00:00.000Z';
describe('Session AV lane 2 (food): quick-add macros', () => {
  it('keeps the macros given and leaves a blank one unknown, never zero', () => {
    const h = quickCalories(createEmptyHealth(), {id: 'health_quickkcal-0001', sourceId: quickAddSourceId(), kcal: '520', protein: '32', carbs: '41,5', fat: '', date: '2026-11-23', meal: 'Lunch'}, AT);
    expect(h.diary[0]!.snapshot.nutrients).toEqual({kcal: 520, proteinMg: 32_000, carbsMg: 41_500, fatMg: null});
    expect(h.diary[0]!.sourceId.startsWith(QUICK_ADD_PREFIX)).toBe(true);
    expect(h.foods).toEqual([]);
    const summary = dailyHealthSummary(h, '2026-11-23');
    expect(summary.nutrients.proteinMg).toBe(32_000);
    expect(summary.nutrients.fatMg).toBeNull();
    expect(healthSchema.safeParse(JSON.parse(JSON.stringify(h))).success).toBe(true);
  });
  it('refuses a macro that is not a number or above 1,000 g, with its unit', () => {
    expect(() => quickMacro('lots', 'protein')).toThrow('Not a number');
    expect(() => quickMacro('1001', 'fat')).toThrow('Enter 0 to 1,000 g fat.');
    expect(quickMacro('  ', 'carbs')).toBeNull();
    expect(quickMacro('0', 'carbs')).toBe(0);
  });
  it('a quick-add id is a valid Health id', () => {
    for (let i = 0; i < 20; i++) expect(quickAddSourceId()).toMatch(/^health_[a-z0-9-]{8,80}$/);
  });
});

describe('Session AV lane 2 (food): "Save this meal" from a meal\'s menu', () => {
  it('saves exactly that meal\'s entries as a saved meal, snapshots as they are', () => {
    let h = saveFood(createEmptyHealth(), {id: 'health_food-oats-01', name: 'Fictional oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 27_000, fatMg: 3000}, createdAt: AT, updatedAt: AT});
    h = logHealthItem(h, {id: 'health_log-oats-001', sourceId: 'health_food-oats-01', sourceKind: 'food', date: '2026-11-23', meal: 'Breakfast', quantityMilli: 1500}, AT);
    h = quickCalories(h, {id: 'health_quickkcal-0002', sourceId: quickAddSourceId(), kcal: '300', date: '2026-11-23', meal: 'Lunch'}, AT);
    const saved = saveMealFromDiary(h, 'health_saved-meal-01', 'Breakfast, Nov 23', '2026-11-23', 'Breakfast', AT);
    const meals = dailyData(saved).savedMeals;
    expect(meals).toHaveLength(1);
    expect(meals[0]!.items.map(i => [i.snapshot.name, i.quantityMilli])).toEqual([['Fictional oats', 1500]]);
  });
});
