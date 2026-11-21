import {describe, expect, it} from 'vitest';
import {highInEaten, highInGeneric} from './search';
import {notEatenAsFood, usualPortionGrams} from './portion';
import {GENERIC_COLUMNS, type LoadedGenericSource} from './load';

/** Session AV (owner follow-up 1, F-HIGH-IN): the offline library's foods richest in a nutrient, per 100 g. */
const row = (id: string, name: string, ironMg: number | null) => GENERIC_COLUMNS.map(c => c === 'id' ? id : c === 'nameEn' ? name : c === 'aliases' ? [] : c === 'ironMg' ? ironMg : null);
const source = (name: string, rows: unknown[][]) => ({entry: {source: 'ciqual', name, attribution: '', licence: '', licenceUrl: '', link: '', notice: '', datasetVersion: '1'}, file: {foods: rows}}) as unknown as LoadedGenericSource;
describe('Session AV (F-HIGH-IN)', () => {
  it('richest first, each food once (its higher value), unknown and zero left out', () => {
    const a = source('CIQUAL', [row('1', 'Lentils, boiled', 3.3), row('2', 'Spinach, raw', 2.7), row('3', 'Apple', 0), row('4', 'Tofu', null)]);
    const b = source('CoFID', [row('9', 'lentils boiled', 3.6), row('8', 'Liver, lamb', 9.9)]);
    expect(highInGeneric([a, b], 'ironMg')).toEqual([{name: 'Liver, lamb', sourceName: 'CoFID', per100g: 10}, {name: 'lentils boiled', sourceName: 'CoFID', per100g: 4}, {name: 'Spinach, raw', sourceName: 'CIQUAL', per100g: 3}]);
    expect(highInGeneric([a, b], 'ironMg', 1)).toHaveLength(1);
  });
  it('q3 #28: foods as eaten — no dried herbs, spices, seaweed or powders — ranked by a usual portion', () => {
    for (const n of ['Gut weed (Ulva sp.), dried or dehydrated', 'Chlorella, dried or dehydrated', 'Thyme, dried', 'Basil, dried, ground', 'Cumin seeds', 'Curry powder', 'Cocoa powder, no added sugars, powder, instant', 'Baking powder', 'Seaweed, nori, dried, raw', 'Allspice, ground'])
      expect(notEatenAsFood(n), n).toBe(true);
    for (const n of ['Lentils, boiled', 'Spinach, raw', 'Almonds, whole kernels', 'Apricots, dried', 'Pepper, sweet, red, raw', 'Liver, lamb'])
      expect(notEatenAsFood(n), n).toBe(false);
    expect([usualPortionGrams('Almonds, whole kernels'), usualPortionGrams('Milk, whole, UHT'), usualPortionGrams("Pecorino cheese, from ewe's milk"), usualPortionGrams('Lentils, red, boiled'), usualPortionGrams('Tofu')]).toEqual([30, 250, 30, 150, 100]);
    const a = source('CIQUAL', [row('1', 'Thyme, dried', 124), row('2', 'Lentils, boiled', 3.3), row('3', 'Almonds, whole kernels', 3.7), row('4', 'Liver, lamb', 9.9), row('5', 'Spirulina (spirulina sp.), dried or dehydrated', 28)]);
    expect(highInEaten([a], 'ironMg')).toEqual([
      {name: 'Liver, lamb', sourceName: 'CIQUAL', per100g: 10, portionGrams: 100, perPortion: 10},
      {name: 'Lentils, boiled', sourceName: 'CIQUAL', per100g: 3, portionGrams: 150, perPortion: 5},
      {name: 'Almonds, whole kernels', sourceName: 'CIQUAL', per100g: 4, portionGrams: 30, perPortion: 1},
    ]);
  });
});
