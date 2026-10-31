import {describe, expect, test} from 'vitest';
import {createEmptyHealth, saveFood, type HealthFood} from '../health';
import {FOOD_SCANS_KEY, MAX_SCANS, clearScans, emptyFoodScans, foodScansSchema, recentScans, recordScan, removeScan, scanOf} from './schema';
import {hasSourceExtras, libraryFoodFor, missingFoodDraft, quantityMilliFor, sourceExtras} from './match';

const at = (m: number) => new Date(Date.UTC(2026, 9, 31, 8, m)).toISOString();
const food = (id: string, extra: Partial<HealthFood> = {}): HealthFood => ({id, name: 'Fictional muesli', brand: 'Fixture', servingGrams: 100, nutrients: {kcal: 380, proteinMg: 9000, carbsMg: 60000, fatMg: 7000}, createdAt: at(0), updatedAt: at(0), ...extra});

describe('4.1 the scan history (zigoals:food-scans:v1)', () => {
  test('the key, an empty record, and a scan counted once per lookup', () => {
    expect(FOOD_SCANS_KEY).toBe('zigoals:food-scans:v1');
    let r = recordScan(emptyFoodScans(), {barcode: '0034000470693', name: 'Fictional cereal', source: 'Open Food Facts', at: at(1)});
    r = recordScan(r, {barcode: '0034000470693', name: 'Fictional cereal', source: 'Open Food Facts', at: at(2)});
    expect(scanOf(r, '0034000470693')).toMatchObject({count: 2, at: at(2)});
    // the log after a lookup keeps the count and adds the food, amount and meal
    r = recordScan(r, {barcode: '0034000470693', name: 'Fictional cereal', source: 'Open Food Facts', at: at(3), foodId: 'health_food-0001', quantityMilli: 500, meal: 'Breakfast'}, {count: false});
    expect(scanOf(r, '0034000470693')).toMatchObject({count: 2, foodId: 'health_food-0001', quantityMilli: 500, meal: 'Breakfast'});
    expect(foodScansSchema.parse(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
  test('the newest first, at most 100 (the oldest go), remove and clear', () => {
    let r = emptyFoodScans();
    for (let i = 0; i < MAX_SCANS + 5; i++) r = recordScan(r, {barcode: String(10_000_000 + i), name: `Item ${i}`, source: 'Open Food Facts', at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString()});
    expect(r.scans).toHaveLength(MAX_SCANS);
    expect(scanOf(r, '10000000')).toBeUndefined();
    expect(recentScans(r, 2).map(s => s.barcode)).toEqual(['10000104', '10000103']);
    expect(scanOf(removeScan(r, '10000104'), '10000104')).toBeUndefined();
    expect(clearScans(r).scans).toEqual([]);
  });
  test('a loose record: a later build’s fields are kept; a duplicate barcode or a bad one is refused', () => {
    expect(foodScansSchema.parse({version: 1, later: true, scans: [{barcode: '12345678', name: 'A', source: 'Somewhere new', at: at(1), count: 1, colour: 'x'}]})).toMatchObject({later: true});
    expect(() => foodScansSchema.parse({version: 1, scans: [{barcode: '12345678', name: 'A', source: 's', at: at(1), count: 1}, {barcode: '12345678', name: 'B', source: 's', at: at(2), count: 1}]})).toThrow();
    expect(() => foodScansSchema.parse({version: 1, scans: [{barcode: 'abc', name: 'A', source: 's', at: at(1), count: 1}]})).toThrow();
  });
});

describe('4.1 the library first', () => {
  test('a food saved from Open Food Facts is found by its barcode (leading zeros do not matter); nothing else is', () => {
    const off = food('health_food-off01', {provenance: {provider: 'Open Food Facts', barcode: '0034000470693', apiVersion: '3.4', observedAt: at(0), license: 'ODbL-1.0 / DbCL-1.0'}});
    const h = saveFood(saveFood(createEmptyHealth(), off), food('health_food-other1', {name: 'Other'}));
    expect(libraryFoodFor(h, '034000470693')?.id).toBe('health_food-off01');
    expect(libraryFoodFor(h, '00001234')).toBeNull();
    expect(libraryFoodFor(h, 'not a code')).toBeNull();
  });
  test('a food from another source is linked through the scan history; a removed food is not', () => {
    const h = saveFood(createEmptyHealth(), food('health_food-fdc01'));
    const scans = recordScan(emptyFoodScans(), {barcode: '0012345678905', name: 'Fictional bar', source: 'USDA FoodData Central', at: at(1), foodId: 'health_food-fdc01'});
    expect(libraryFoodFor(h, '012345678905', scans)?.id).toBe('health_food-fdc01');
    expect(libraryFoodFor(createEmptyHealth(), '012345678905', scans)).toBeNull();
  });
});

describe('4.1 the amount on the match card', () => {
  test('grams, servings or units become thousandths of a serving', () => {
    expect(quantityMilliFor('amount', '50', 100)).toBe(500); // as before: 50 g of a per-100 g label
    expect(quantityMilliFor('amount', '30,5', 100)).toBe(305);
    expect(quantityMilliFor('servings', '1.5', 100)).toBe(1500);
    expect(quantityMilliFor('units', '2', 100, '45')).toBe(900); // two 45 g bars
    expect(quantityMilliFor('amount', '250', 250)).toBe(1000);
  });
  test('a blank, zero, negative or huge amount is refused in plain words', () => {
    expect(() => quantityMilliFor('amount', '', 100)).toThrow('Enter the amount as a number above 0.');
    expect(() => quantityMilliFor('units', '2', 100, '0')).toThrow('Enter the weight of one unit as a number above 0.');
    expect(() => quantityMilliFor('servings', '-1', 100)).toThrow();
    expect(() => quantityMilliFor('amount', '200000', 100)).toThrow('outside');
  });
});

describe('4.1/4.4 what a source gives beyond the four fields', () => {
  test('FoodData Central: the seven nutrients and the vitamins, unknown left out', () => {
    const x = sourceExtras({source: 'USDA FoodData Central', nutrients: {kcal: 100, proteinMg: 1, carbsMg: 1, fatMg: 1, fiberMg: 3000, ironMg: 2}, vitamins: {cMg: 6000}});
    expect(x).toEqual({nutrients: {fiberMg: 3000, ironMg: 2}, vitamins: {cMg: 6000}, extras: {}, sodiumFromSalt: false});
    expect(hasSourceExtras(x)).toBe(true);
  });
  test('the offline library: the extras in thousandths of a mg (0.05 mg of B1 stays exact)', () => {
    const x = sourceExtras({source: 'offline', nutrients: {kcal: 52, proteinMg: 300, carbsMg: 14000, fatMg: 200, potassiumMg: 107}, vitamins: {}, more: {magnesiumMg: 5, b1Mg: 0.05, omega3Mg: 9.5}});
    expect(x.nutrients).toEqual({potassiumMg: 107});
    expect(x.extras).toEqual({magnesiumMg: 5000, b1Mg: 50, omega3Mg: 9500});
  });
  test('the Swiss database: sodium from salt ÷ 2.5, said so; Open Food Facts: nothing beyond the four', () => {
    const swiss = sourceExtras({source: 'Swiss Food Composition Database', nutrients: {kcal: 52, proteinMg: null, carbsMg: null, fatMg: null, fiberMg: 2400, sugarMg: null, saltMg: 1000}});
    expect(swiss.nutrients).toEqual({fiberMg: 2400, sodiumMg: 400}); expect(swiss.sodiumFromSalt).toBe(true);
    expect(hasSourceExtras(sourceExtras({source: 'Open Food Facts', nutrients: {kcal: 1, fiberMg: 5}}))).toBe(false);
  });
});

test('4.1 not found: a draft that carries the barcode, every nutrient unknown', () => {
  expect(missingFoodDraft('034000470693')).toEqual({name: 'Product 0034000470693', brand: '', notes: 'Barcode 0034000470693', servingGrams: 100, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}});
});
