import {describe, expect, it} from 'vitest';
import {GENERIC_COLUMNS, type LoadedGenericSource} from '../food-generic/load';
import {ORACLE_NUTRIENTS, oracleAmount, oracleFoods, oracleNutrient} from './oracle';

/** Session AV lane 2 (food, LEDGER #100; Cronometer's Oracle): protein, the minerals and the vitamins from the offline library. */
const row = (id: string, name: string, values: Partial<Record<(typeof GENERIC_COLUMNS)[number], number | null>>) => GENERIC_COLUMNS.map(c => c === 'id' ? id : c === 'nameEn' ? name : c === 'aliases' ? [] : values[c] ?? null);
const source = (name: string, rows: unknown[][]) => ({entry: {source: 'ciqual', name, attribution: '', licence: '', licenceUrl: '', link: '', notice: '', datasetVersion: '1'}, file: {foods: rows}}) as unknown as LoadedGenericSource;
const lib = [source('CIQUAL', [
  row('1', 'Chicken breast, cooked', {kcal: 150, proteinMg: 31_000}),
  row('2', 'Lentils, boiled', {kcal: 116, proteinMg: 9000, folateUg: 181}),
  row('3', 'Pepper, sweet, red, raw', {kcal: 31, proteinMg: 1000, vitCMg: 128}),
  row('4', 'Orange, raw', {kcal: 47, vitCMg: 53}),
  row('5', 'Parsley, dried', {kcal: 290, vitCMg: 125, proteinMg: 26_000}),
  row('6', 'Salmon, cooked', {kcal: 206, proteinMg: 22_000, vitDUg: 11, b12Ug: 3.2, omega3Mg: 2200}),
  row('7', 'Water', {kcal: 0, vitCMg: 0}),
])];
describe('the Oracle', () => {
  it('every nutrient the library carries is offered, protein and the vitamins among them', () => {
    expect(ORACLE_NUTRIENTS.map(n => n.key)).toEqual(expect.arrayContaining(['protein', 'vitamin-c', 'vitamin-d', 'vitamin-b12', 'folate', 'magnesium', 'zinc', 'omega-3']));
    expect(ORACLE_NUTRIENTS).toHaveLength(19);
    expect(oracleNutrient('nope')).toBeNull();
  });
  it('protein by a usual portion; herbs and spices left out; unknown and zero never counted', () => {
    const top = oracleFoods(lib, 'protein');
    expect(top.map(f => f.name)).toEqual(['Chicken breast, cooked', 'Salmon, cooked', 'Lentils, boiled', 'Pepper, sweet, red, raw']);
    expect([top[0]!.portionGrams, oracleAmount(top[0]!.perPortion, oracleNutrient('protein')!)]).toEqual([120, '37 g']);
    expect(oracleFoods(lib, 'vitamin-c').map(f => f.name)).toEqual(['Pepper, sweet, red, raw', 'Orange, raw']);
  });
  it('per 100 kcal ranks the dense foods first (Cronometer\'s nutrient density)', () => {
    const dense = oracleFoods(lib, 'vitamin-c', 'kcal');
    expect(dense[0]!.name).toBe('Pepper, sweet, red, raw');
    expect(Math.round(dense[0]!.per100kcal!)).toBe(Math.round(128_000 / 31 * 100));
    expect(oracleAmount(dense[0]!.per100kcal!, oracleNutrient('vitamin-c')!)).toBe('413 mg');
    expect(oracleFoods(lib, 'vitamin-b12').map(f => [f.name, oracleAmount(f.per100g, oracleNutrient('vitamin-b12')!)])).toEqual([['Salmon, cooked', '3.2 µg']]);
  });
});
