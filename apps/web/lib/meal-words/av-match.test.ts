import {describe, expect, it} from 'vitest';
import {matchOwnFood, ownQuantityMilli, splitMealWords} from './match';
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
});
