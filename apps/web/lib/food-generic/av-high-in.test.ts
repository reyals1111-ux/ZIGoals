import {describe, expect, it} from 'vitest';
import {highInGeneric} from './search';
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
});
