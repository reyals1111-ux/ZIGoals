import {describe, expect, test} from 'vitest';
import {foodProductSchema, lookupProductSchema, parseFoodProduct} from '../food-lookup';
import {FOOD_DISPLAY, FOOD_DISPLAY_KEY, MAX_GRADES, abFirst, foodDisplaySchema, gradeOfFood, gradesFor, nutriGrade, rememberGrade, setAbFirst, setNutriScore, showsNutriScore} from './schema';

// Session AK (item 15). Fictional products.
const off = (grade?: unknown) => ({status: 'success', product: {code: '0034000470693', product_name: 'Fixture', nutriments: {'energy-kcal_100g': 123}, ...(grade === undefined ? {} : {nutriscore_grade: grade})}});

describe('the lookup answer carries the grade as an optional field, a to e only', () => {
  test('a valid grade in any case is kept, lower case', () => {
    expect(parseFoodProduct(off('b'), '0034000470693')).toMatchObject({source: 'Open Food Facts', nutriscoreGrade: 'b'});
    expect(parseFoodProduct(off(' E '), '0034000470693')).toMatchObject({nutriscoreGrade: 'e'});
  });
  test('anything else leaves it out, and the product still parses', () => {
    for (const g of ['unknown', 'not-applicable', 'f', 'ab', '', 3, null, {grade: 'a'}, undefined]) {
      const p = parseFoodProduct(off(g), '0034000470693');
      expect('nutriscoreGrade' in p, String(g)).toBe(false); expect(p.name).toBe('Fixture');
    }
  });
  test('the answer schema stays strict: only a–e, and nothing new beside it', () => {
    const p = parseFoodProduct(off('a'), '0034000470693');
    expect(lookupProductSchema.parse(p)).toEqual(p);
    expect(foodProductSchema.safeParse({...p, nutriscoreGrade: 'f'}).success).toBe(false);
    expect(foodProductSchema.safeParse({...p, ecoscore: 'a'}).success).toBe(false);
  });
});

describe('the setting and the remembered grades', () => {
  test('a new loose key, off by default', () => {
    expect(FOOD_DISPLAY_KEY).toBe('zigoals:food-display:v1');
    expect(showsNutriScore(FOOD_DISPLAY.empty())).toBe(false); expect(showsNutriScore(null)).toBe(false);
    expect(foodDisplaySchema.parse({version: 1, later: 'kept'})).toEqual({version: 1, later: 'kept'});
    expect(foodDisplaySchema.safeParse({version: 1, grades: [{barcode: '123', grade: 'a'}]}).success).toBe(false);
    expect(foodDisplaySchema.safeParse({version: 1, grades: [{barcode: '12345678', grade: 'z'}]}).success).toBe(false);
    expect(foodDisplaySchema.safeParse({version: 1, grades: [{barcode: '12345678', grade: 'a'}, {barcode: '12345678', grade: 'b'}]}).success).toBe(false);
  });
  test('grades are read only from a–e', () => {
    expect([nutriGrade('A'), nutriGrade('c '), nutriGrade('unknown'), nutriGrade(1), nutriGrade(undefined)]).toEqual(['a', 'c', null, null, null]);
  });
  test('grades are remembered only while on; turning off forgets them and the A/B order', () => {
    let r = rememberGrade({version: 1}, '0034000470693', 'b');
    expect(r).toEqual({version: 1});
    r = setNutriScore(r, true); r = rememberGrade(r, '0034000470693', 'B'); r = rememberGrade(r, '00001234', 'unknown');
    expect(r.grades).toEqual([{barcode: '0034000470693', grade: 'b'}]);
    r = setAbFirst(r, true); expect(r.abFirst).toBe(true);
    r = setNutriScore(r, false); expect(r).toEqual({version: 1});
    expect(() => setAbFirst({version: 1}, true)).toThrow(/first/);
  });
  test('at most 500 grades, the oldest leave first; a repeat moves to the end', () => {
    let r = setNutriScore({version: 1}, true);
    for (let i = 0; i < MAX_GRADES + 3; i++) r = rememberGrade(r, String(10_000_000 + i), 'c');
    expect(r.grades).toHaveLength(MAX_GRADES); expect(r.grades![0]!.barcode).toBe('10000003');
    r = rememberGrade(r, '10000003', 'a'); expect(r.grades!.at(-1)).toEqual({barcode: '10000003', grade: 'a'}); expect(r.grades).toHaveLength(MAX_GRADES);
  });
});

describe('the library: a letter only for a food saved from Open Food Facts, A and B first', () => {
  const on = rememberGrade(rememberGrade(setNutriScore({version: 1}, true), '0034000470693', 'a'), '00001234', 'd');
  const foods = [{id: 'oil', provenance: {barcode: '00001234'}}, {id: 'oats', provenance: {barcode: '0034000470693'}}, {id: 'mine'}, {id: 'apple'}];
  test('generic and hand-typed foods have no letter; off shows none', () => {
    expect(gradesFor(on, foods)).toEqual({oil: 'd', oats: 'a'});
    expect(gradeOfFood({version: 1, grades: [{barcode: '00001234', grade: 'd'}]}, foods[0]!)).toBeNull();
    expect(gradeOfFood(on, {provenance: {barcode: '99999999'}})).toBeNull();
  });
  test('A and B first, the rest in their order; no letter is not a low letter', () => {
    expect(abFirst(foods, gradesFor(on, foods)).map(f => f.id)).toEqual(['oats', 'oil', 'mine', 'apple']);
    expect(abFirst(foods, {}).map(f => f.id)).toEqual(['oil', 'oats', 'mine', 'apple']);
  });
});
