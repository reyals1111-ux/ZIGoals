import {describe, expect, test} from 'vitest';
import {createEmptyHealth, logHealthItem, saveFood, type HealthData} from '../health';
import {copyMealTo} from './quick';

// Session AP (feature 6): a meal of any day copied to any day and meal slot, through the existing copy write. Fictional foods.
const AT = '2026-11-14T07:00:00.000Z', TODAY = '2026-11-14';
let n = 0;
function journal(): HealthData {
  let h = createEmptyHealth();
  for (const [id, name, kcal] of [['oats', 'Oats', 380], ['coffee', 'Coffee', 5], ['soup', 'Lentil soup', 240]] as const)
    h = saveFood(h, {id: `health_food-${id}`, name, brand: '', servingGrams: 100, nutrients: {kcal, proteinMg: 1000, carbsMg: 2000, fatMg: 500}, createdAt: AT, updatedAt: AT});
  const log = (id: string, date: string, meal: 'Breakfast' | 'Lunch', q = 1000) => { h = logHealthItem(h, {id: `health_diary-copyto-${String(++n).padStart(4, '0')}`, sourceId: `health_food-${id}`, sourceKind: 'food', date, meal, quantityMilli: q}, AT); };
  log('oats', '2026-11-03', 'Breakfast', 1500); log('coffee', '2026-11-03', 'Breakfast'); log('soup', '2026-11-10', 'Lunch');
  return h;
}

describe('copy a meal to any day and meal slot', () => {
  test('a breakfast from eleven days ago becomes today\'s lunch, exactly as logged, beside what is there', () => {
    const h = journal(), next = copyMealTo(h, {date: '2026-11-03', meal: 'Breakfast'}, {date: TODAY, meal: 'Lunch'}, 'health_copy-ap-0001', AT, TODAY);
    expect(next.diary.filter(e => e.date === TODAY).map(e => [e.meal, e.snapshot.name, e.quantityMilli])).toEqual([['Lunch', 'Oats', 1500], ['Lunch', 'Coffee', 1000]]);
    expect(next.diary.filter(e => e.date === '2026-11-03')).toHaveLength(2); // the source stays
    // The same operation twice adds nothing.
    expect(copyMealTo(next, {date: '2026-11-03', meal: 'Breakfast'}, {date: TODAY, meal: 'Lunch'}, 'health_copy-ap-0001', AT, TODAY)).toBe(next);
  });
  test('to an earlier day, and to another meal of the same day', () => {
    const h = journal();
    expect(copyMealTo(h, {date: '2026-11-10', meal: 'Lunch'}, {date: '2026-11-01', meal: 'Lunch'}, 'health_copy-ap-0002', AT, TODAY).diary.filter(e => e.date === '2026-11-01')).toHaveLength(1);
    expect(copyMealTo(h, {date: '2026-11-10', meal: 'Lunch'}, {date: '2026-11-10', meal: 'Dinner'}, 'health_copy-ap-0003', AT, TODAY).diary.filter(e => e.date === '2026-11-10' && e.meal === 'Dinner')).toHaveLength(1);
  });
  test('refused with a plain sentence: the same slot, a later day, an empty meal', () => {
    const h = journal();
    expect(() => copyMealTo(h, {date: '2026-11-10', meal: 'Lunch'}, {date: '2026-11-10', meal: 'Lunch'}, 'health_copy-ap-0004', AT, TODAY)).toThrow(/another day or another meal/);
    expect(() => copyMealTo(h, {date: '2026-11-10', meal: 'Lunch'}, {date: '2026-11-15', meal: 'Lunch'}, 'health_copy-ap-0005', AT, TODAY)).toThrow(/today or an earlier day/);
    expect(() => copyMealTo(h, {date: '2026-11-10', meal: 'Breakfast'}, {date: TODAY, meal: 'Lunch'}, 'health_copy-ap-0006', AT, TODAY)).toThrow(/Nothing was logged for breakfast/);
  });
});
