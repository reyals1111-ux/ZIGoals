import {describe, expect, it} from 'vitest';
import {libraryQueries, matchOwnFood, ownMatch, ownQuantityMilli, portionGrams, rankLibraryNames, splitMealWords} from './match';
import {undoWordsLog} from './undo';
import {createEmptyHealth, logHealthItem, saveFood} from '../health';
import type {HealthFood} from '../health';

/** Session AV (owner follow-up 1, F-WORDS-MATCH): meal words read into items and matched to the person's own foods. */
const food = (id: string, name: string, servingGrams: number | null = 100): HealthFood => ({id, name, brand: '', servingGrams, nutrients: {kcal: 100, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z'});
describe('Session AV (F-WORDS-MATCH)', () => {
  it('splits a meal into items with a number and a unit, English and Dutch', () => {
    expect(splitMealWords('2 eggs, a slice of toast and a coffee').map(i => [i.food, i.count, i.unit])).toEqual([['eggs', 2, null], ['toast', 1, null], ['coffee', 1, null]]);
    expect(splitMealWords('150g yoghurt with honey').map(i => [i.food, i.count, i.unit])).toEqual([['yoghurt', 150, 'g'], ['honey', null, null]]);
    expect(splitMealWords('twee boterhammen met kaas en een kop koffie').map(i => [i.food, i.count])).toEqual([['boterhammen', 2], ['kaas', null], ['koffie', 1]]);
    expect(splitMealWords('Café crème')).toEqual([{text: 'cafe creme', food: 'cafe creme', count: null, unit: null}]);
  });
  it('matches the person\'s own foods by name, then by every word; the amount from grams or the count', () => {
    const foods = [food('f1', 'Egg'), food('f2', 'Wholegrain toast', 35), food('f3', 'Greek yoghurt', 150), food('f4', 'Toast with jam', 40)];
    const [eggs, toast] = splitMealWords('2 eggs and toast');
    expect(matchOwnFood(eggs!, foods)?.id).toBe('f1');
    expect(matchOwnFood(toast!, foods)?.id).toBe('f2');
    expect(matchOwnFood(splitMealWords('soup')[0]!, foods)).toBeNull();
    expect(ownQuantityMilli(eggs!, foods[0]!)).toBe(2000);
    expect(ownQuantityMilli(splitMealWords('300 g greek yoghurt')[0]!, foods[2]!)).toBe(2000);
    expect(ownQuantityMilli(toast!, foods[1]!)).toBe(1000);
  });
  it('q3 #25: whole words only for an own food; only the same name starts ticked', () => {
    const foods = [food('f1', 'Egg'), food('f2', 'Wholegrain toast', 35)];
    expect(matchOwnFood(splitMealWords('eggplant')[0]!, foods)).toBeNull(); // never "Egg" by its first letters
    expect(matchOwnFood(splitMealWords('egg')[0]!, [food('f9', 'Eggplant')])).toBeNull();
    expect(ownMatch(splitMealWords('2 eggs')[0]!, foods)).toEqual({food: foods[0], exact: true});
    expect(ownMatch(splitMealWords('toast')[0]!, foods)).toEqual({food: foods[1], exact: false});
  });
  it('q3 #25: known dishes stay whole, an article after a number is dropped, a count of a library food has a usual portion', () => {
    expect(splitMealWords('mac and cheese, peanut butter and jelly sandwich and fish and chips').map(i => i.food)).toEqual(['mac and cheese', 'peanut butter and jelly sandwich', 'fish and chips']);
    expect(splitMealWords('half a sandwich').map(i => [i.food, i.count])).toEqual([['sandwich', 0.5]]);
    expect(splitMealWords('2 eggs and toast').map(portionGrams)).toEqual([100, null]);
    expect(portionGrams(splitMealWords('a slice of toast')[0]!)).toBe(35);
    expect(portionGrams(splitMealWords('150 g yoghurt')[0]!)).toBeNull(); // grams given: the person's own number
  });
  it('q3 #25: the plain library food first, several to choose from', () => {
    // Real names from the offline library (CIQUAL, CoFID), in the order its own search returns them.
    const eggs = ['Eggs, duck, whole, raw', 'Eggs, quail, whole, raw', 'Eggs, chicken, yolk, raw', 'Egg, raw', 'Egg, powder', 'Egg white, raw'];
    expect(libraryQueries(splitMealWords('2 eggs')[0]!)).toEqual(['eggs', 'egg']);
    expect(eggs[rankLibraryNames('egg', eggs)[0]!]).toBe('Egg, raw');
    const toast = ['Toasted ham and cheese sandwich, prepacked', 'French toast', 'Bread, white, toasted', 'Bread, brown, toasted'];
    expect(libraryQueries(splitMealWords('toast')[0]!).at(-1)).toBe('bread toasted');
    expect(toast[rankLibraryNames('bread toasted', toast)[0]!]).toMatch(/^Bread, (white|brown), toasted$/);
    const banana = ['Banana nectar', 'Bananas, flesh only', 'Banana bread, homemade', 'Banana, flesh without skin, raw'];
    expect(banana[rankLibraryNames('banana', banana)[0]!]).toBe('Banana, flesh without skin, raw');
    expect(rankLibraryNames('banana', banana).slice(-2).map(i => banana[i])).toEqual(expect.arrayContaining(['Banana nectar']));
    expect(libraryQueries(splitMealWords('mac and cheese')[0]!).at(-1)).toBe('macaroni cheese');
  });
  it('q3 #25 (data): Undo takes off only what this Log made, never what was logged since', () => {
    const at = '2026-11-20T08:00:00.000Z';
    let h = saveFood(createEmptyHealth(), {id: 'health_fictional-own-01', name: 'Fictional own', brand: '', servingGrams: 100, nutrients: {kcal: 100, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at});
    h = saveFood(h, {id: 'health_fictional-lib-01', name: 'Egg, raw', brand: 'CIQUAL', servingGrams: 100, nutrients: {kcal: 140, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at});
    h = logHealthItem(h, {id: 'health_fictional-made-01', sourceId: 'health_fictional-lib-01', sourceKind: 'food', date: '2026-11-20', meal: 'Breakfast', quantityMilli: 1000}, at);
    // Logged after "Log" and before "Undo" (another tab): it stays.
    h = logHealthItem(h, {id: 'health_fictional-later-01', sourceId: 'health_fictional-own-01', sourceKind: 'food', date: '2026-11-20', meal: 'Breakfast', quantityMilli: 1000}, at);
    const back = undoWordsLog(h, {entryIds: ['health_fictional-made-01'], foodIds: ['health_fictional-lib-01']});
    expect(back.diary.map(e => e.id)).toEqual(['health_fictional-later-01']);
    expect(back.foods.map(f => f.id)).toEqual(['health_fictional-own-01']);
    // A made food that another entry used since is kept.
    const used = logHealthItem(h, {id: 'health_fictional-again-01', sourceId: 'health_fictional-lib-01', sourceKind: 'food', date: '2026-11-20', meal: 'Lunch', quantityMilli: 1000}, at);
    expect(undoWordsLog(used, {entryIds: ['health_fictional-made-01'], foodIds: ['health_fictional-lib-01']}).foods.map(f => f.id)).toContain('health_fictional-lib-01');
  });
});
