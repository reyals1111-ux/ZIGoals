import {describe, expect, test} from 'vitest';
import {parseCsv} from '../csv/parse';
import {guessMapping} from '../csv/mapping';
import {HEALTH_STORAGE_KEY, createEmptyHealth, editDiaryEntry, foodSnapshot, healthSchema} from '../health';
import {buildShowcase} from '../showcase-data';
import {IMPORT_UNDO_KEY, importUndoSchema} from './undo-schema';
import {DIARY_LIMIT_MESSAGE, NUTRITION_FIELDS, NutritionUndoRefused, applyNutritionImport, distinctMeals, guessMeal, parseServingMeasure, planNutritionImport, undoNutritionImport} from './nutrition';

// I1 (docs/product/features/I1-nutrition-import.md, "Tests").
const AT = '2026-10-01T10:00:00.000Z', TODAY = '2026-10-01', IMPORT = '0f1e2d3c-4b5a-4697-8899-aabbccddeeff';
const A = 'Date,Meal,Food,Calories,Protein (g),Carbohydrates (g),Fat (g)\n2026-09-28,Breakfast,Oats,380,13,67,7\n2026-09-28,Lunch,Soup,120,4,10,\n2026-09-29,Morning Snack,Apple,95,0.5,25,0.3\n';
const B = 'Date,Meal,Food,Brand,Serving size,Servings,Calories,Protein (g),Carbohydrates (g),Fat (g),Sodium\n2026-09-28,Breakfast,Oats,Mill,100 g,0.5,380,13,67,7,120\n2026-09-29,Breakfast,Oats,Mill,100 g,1,380,13,67,7,120\n2026-09-29,Dinner,Soup,,250 ml,1,120,4,10,2,\n';
const plan = (csv: string, extra: Partial<Parameters<typeof planNutritionImport>[0]> = {}) => { const parsed = parseCsv(csv), mapping = guessMapping(parsed.header, NUTRITION_FIELDS); return planNutritionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: TODAY, importId: IMPORT, at: AT, ...extra}); };

describe('planNutritionImport', () => {
  test('fixture A: no serving column means entries with an unknown measure and no library food; blank is unknown', () => {
    const p = plan(A);
    expect(p.foods).toEqual([]); expect(p.withoutMeasure).toBe(3); expect(p.days).toBe(2); expect(p.refused).toEqual([]);
    expect(p.entries[0]).toMatchObject({id: `health_imp-${IMPORT}-e1`, date: '2026-09-28', meal: 'Breakfast', quantityMilli: 1000, snapshot: {name: 'Oats', servingGrams: null, nutrients: {kcal: 380, proteinMg: 13000, carbsMg: 67000, fatMg: 7000}}, createdAt: AT, updatedAt: AT});
    expect(p.entries[1]!.snapshot.nutrients.fatMg).toBeNull();
    expect(p.entries[2]).toMatchObject({meal: 'Snacks', snapshot: {nutrients: {proteinMg: 500, fatMg: 300}}});
    expect(guessMeal('Morning Snack')).toBe('Snacks'); expect(guessMeal('Tea')).toBeNull();
  });
  test('fixture B: one food per distinct tuple, snapshots from the food, sodium kept, blanks absent', () => {
    const p = plan(B);
    expect(p.foods.map(f => [f.id, f.name, f.brand, f.servingGrams, f.servingMl])).toEqual([[`health_imp-${IMPORT}-f1`, 'Oats', 'Mill · imported', 100, undefined], [`health_imp-${IMPORT}-f2`, 'Soup', 'Imported', null, 250]]);
    expect(p.foods[0]!.nutrients).toEqual({kcal: 380, proteinMg: 13000, carbsMg: 67000, fatMg: 7000, sodiumMg: 120});
    expect(p.foods[1]!.nutrients).not.toHaveProperty('sodiumMg');
    expect(p.entries.map(e => [e.sourceId, e.quantityMilli, e.meal])).toEqual([[`health_imp-${IMPORT}-f1`, 500, 'Breakfast'], [`health_imp-${IMPORT}-f1`, 1000, 'Breakfast'], [`health_imp-${IMPORT}-f2`, 1000, 'Dinner']]);
    expect(p.entries[0]!.snapshot).toEqual(foodSnapshot(p.foods[0]!));
    expect(parseServingMeasure('100 g', '', 'point')).toEqual({servingGrams: 100}); expect(parseServingMeasure('250', 'ml', 'point')).toEqual({servingGrams: null, servingMl: 250}); expect(parseServingMeasure('1 serving', '', 'point')).toBeNull(); expect(parseServingMeasure('', '', 'point')).toBeNull();
  });
  test('per-100 g basis with a weight column; blank weight refused; meals mapped; refusals name the field', () => {
    const csv = 'Date,Meal,Food,Weight (g),Calories,Fat (g)\n2026-09-28,Tea,Rice,150,130,0\n2026-09-28,Tea,Rice,,130,0\n2026-09-28,Tea,Rice,100,abc,0\n';
    const p = plan(csv, {basis: 'per-100g', mealMap: {Tea: 'Lunch'}});
    expect(p.entries).toHaveLength(1); expect(p.entries[0]).toMatchObject({quantityMilli: 1500, meal: 'Lunch', snapshot: {servingGrams: 100, nutrients: {kcal: 130, proteinMg: null, fatMg: 0}}});
    expect(p.refused.map(r => r.reason)).toEqual(['Row 2: give the amount eaten or a serving count.', 'Row 3: Calories is not a number.']);
    expect(distinctMeals(parseCsv(csv).rows, guessMapping(parseCsv(csv).header, NUTRITION_FIELDS))).toEqual(['Tea']);
  });
  test('dates: formats, the future and the Health zone being irrelevant', () => {
    const csv = 'Date,Food,Calories\n28/09/2026,Oats,380\n2027-01-01,Oats,380\n';
    const parsed = parseCsv(csv), mapping = guessMapping(parsed.header, NUTRITION_FIELDS);
    const p = planNutritionImport({rows: parsed.rows, mapping, numberStyle: 'point', dateFormat: 'dmy', basis: 'serving', today: TODAY, importId: IMPORT, at: AT});
    expect(p.entries[0]!.date).toBe('2026-09-28'); expect(p.refused.map(r => r.reason)).toEqual(['Row 2: the date is not day/month/year.']);
    const iso = planNutritionImport({rows: [['2027-01-01', 'Oats', '380']], mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: TODAY, importId: IMPORT, at: AT});
    expect(iso.refused[0]!.reason).toBe('Row 1: the date is in the future.');
  });
});
describe('apply and undo', () => {
  test('atomic and validated; ids unique; stamps equal the import instant; limits refuse before writing', () => {
    const p = plan(B), next = applyNutritionImport(createEmptyHealth(), p);
    expect(healthSchema.parse(next)).toEqual(next);
    expect(next.foods.map(f => f.id)).toEqual(p.foods.map(f => f.id)); expect(next.diary).toHaveLength(3);
    expect(next.diary.every(e => e.createdAt === AT && e.updatedAt === AT)).toBe(true);
    const full = {...createEmptyHealth(), diary: Array.from({length: 9999}, (_, i) => ({...p.entries[0]!, id: `health_full-${String(i).padStart(6, '0')}`}))};
    expect(() => applyNutritionImport(full, plan(A))).toThrow(DIARY_LIMIT_MESSAGE);
  });
  test('undo removes exactly the created ids; an edit or a later use refuses; a hand-removed food is skipped', () => {
    const p = plan(B), applied = applyNutritionImport(createEmptyHealth(), p);
    const record = {id: IMPORT, kind: 'nutrition' as const, at: AT, label: 'B', createdIds: [...p.foods.map(f => f.id), ...p.entries.map(e => e.id)], expiresAt: '2026-10-08T10:00:00.000Z'};
    const undone = undoNutritionImport(applied, record);
    expect(undone.removed).toBe(5); expect(undone.data).toEqual(createEmptyHealth());
    const edited = editDiaryEntry(applied, p.entries[0]!.id, {quantityMilli: 2000, meal: 'Lunch', date: '2026-09-28'}, '2026-10-02T10:00:00.000Z');
    expect(() => undoNutritionImport(edited, record)).toThrow(NutritionUndoRefused);
    const used = {...applied, recipes: [{id: 'health_recipe-0001', name: 'Porridge', portionsMilli: 1000, ingredients: [{foodId: p.foods[0]!.id, snapshot: foodSnapshot(p.foods[0]!), quantityMilli: 1000}], createdAt: AT, updatedAt: AT}]} as typeof applied;
    expect(() => undoNutritionImport(healthSchema.parse(used), record)).toThrow(NutritionUndoRefused);
    const removedByHand = {...applied, foods: applied.foods.filter(f => f.id !== p.foods[1]!.id)};
    expect(undoNutritionImport(removedByHand, record).removed).toBe(4);
  });
  test('Showcase: the example import parses, its ledger record exists and undoes on the session copy', () => {
    const {records} = buildShowcase('2026-10-01');
    const health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), ledger = importUndoSchema.parse(JSON.parse(records[IMPORT_UNDO_KEY]!));
    expect(health.foods.find(f => f.id === 'health_food-0009')).toMatchObject({name: 'Showcase imported oats', brand: 'Showcase import (fictional)', servingGrams: 100});
    expect(health.diary.filter(e => e.id.startsWith('health_import-showcase-'))).toHaveLength(2);
    expect(ledger.imports[0]).toMatchObject({kind: 'nutrition', label: 'SHOWCASE DATA · fictional example import', createdIds: ['health_food-0009', 'health_import-showcase-0', 'health_import-showcase-1']});
    const undone = undoNutritionImport(health, ledger.imports[0]!);
    expect(undone.removed).toBe(3); expect(undone.data.foods.some(f => f.id === 'health_food-0009')).toBe(false);
  });
});
