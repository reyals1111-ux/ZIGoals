import {expect, test} from 'vitest';
import {parseCsv} from '../csv/parse';
import {detectNutritionPreset} from './nutrition-presets';
import {planNutritionImport} from './nutrition';

// Session W Part 7: MyFitnessPal and Cronometer files are recognised by their header rows (fictional values) and their
// columns pre-filled; MyFitnessPal's percentage-of-daily-value columns are never taken as amounts.
const MFP = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-10-01,Breakfast,420,12,3,2,4,0,180,560,300,55,6,12,22,10,8,15,20,
2026-10-01,Dinner,700,25,8,4,9,0,90,900,800,70,9,10,40,5,30,10,25,fictional
`;
const CRONO = `Day,Time,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g),Sugars (g),Saturated (g),Sodium (mg),Potassium (mg),Calcium (mg),Iron (mg),Category
2026-10-02,8:30 AM,Breakfast,Fictional oats,58.00 g,220,8,38,4,6,1,1,2,210,30,2.5,Breakfast Cereals
`;
test('MyFitnessPal: one entry per meal named after it; calcium and iron (a % of daily value) are never matched', () => {
  const parsed = parseCsv(MFP), preset = detectNutritionPreset(parsed.header)!;
  expect(preset.id).toBe('myfitnesspal');
  expect(preset.mapping).toMatchObject({date: 0, meal: 1, food: 1, kcal: 2, fat: 3, saturatedFat: 4, sodium: 9, potassium: 10, carbs: 11, fibre: 12, sugars: 13, protein: 14});
  expect(preset.mapping.calcium).toBeUndefined();
  expect(preset.mapping.iron).toBeUndefined();
  const plan = planNutritionImport({rows: parsed.rows, mapping: preset.mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: '2026-10-07', importId: 'mfp', at: '2026-10-07T00:00:00.000Z'});
  expect(plan.entries.map(e => [e.meal, e.snapshot.name, e.snapshot.nutrients.kcal, e.snapshot.nutrients.proteinMg])).toEqual([['Breakfast', 'Breakfast', 420, 22_000], ['Dinner', 'Dinner', 700, 40_000]]);
  expect(plan.entries[0]!.snapshot.nutrients.calciumMg).toBeUndefined();
  expect(plan.foods).toEqual([]);
});
test('Cronometer: foods with their amount become library foods; other files have no preset', () => {
  const parsed = parseCsv(CRONO), preset = detectNutritionPreset(parsed.header)!;
  expect(preset.id).toBe('cronometer');
  const plan = planNutritionImport({rows: parsed.rows, mapping: preset.mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: '2026-10-07', importId: 'cr', at: '2026-10-07T00:00:00.000Z'});
  expect(plan.entries[0]).toMatchObject({meal: 'Breakfast', snapshot: {name: 'Fictional oats', servingGrams: 58}});
  expect(plan.entries[0]!.snapshot.nutrients).toMatchObject({kcal: 220, saturatedFatMg: 1000, calciumMg: 30, ironMg: 3});
  expect(detectNutritionPreset(['date', 'food', 'calories'])).toBeNull();
});
