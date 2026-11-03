import {describe, expect, test} from 'vitest';
import {foodLine, matchIngredient} from './recipe-match';
import type {HealthFood} from '../health';

// Session AK Q1 (WIRING_AUDIT 4.8): the "recipe-match" tests ADR-036 names, in their own file. Exact first (case and
// accents ignored), then "close" only when every word of the shorter name is in the longer one (plurals folded), never a
// guess beyond that; up to five candidates for the picker. Fictional foods.
const at = '2026-11-04T08:00:00.000Z';
const food = (id: string, name: string, kcal: number | null = 100, serving: {servingGrams: number | null; servingMl?: number} = {servingGrams: 100}): HealthFood => ({id, name, brand: '', ...serving, nutrients: {kcal, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at} as HealthFood);
const FOODS = [food('health_f-lentils', 'Red lentils', 116), food('health_f-onion01', 'Onion', null), food('health_f-creme01', 'Crème fraîche', 290), food('health_f-tomato1', 'Tomatoes, canned', 24), food('health_f-milk001', 'Milk', 64, {servingGrams: null, servingMl: 250})];

describe('matchIngredient', () => {
  test('exact, ignoring case, accents and punctuation', () => {
    expect(matchIngredient('ONION', FOODS)).toMatchObject({how: 'exact', food: {id: 'health_f-onion01'}});
    expect(matchIngredient('creme fraiche', FOODS)).toMatchObject({how: 'exact', food: {id: 'health_f-creme01'}});
    expect(matchIngredient('tomatoes canned', FOODS)).toMatchObject({how: 'exact', food: {id: 'health_f-tomato1'}});
  });
  test('close: every word of the shorter name in the longer one, plurals folded', () => {
    expect(matchIngredient('onions', FOODS)).toMatchObject({how: 'close', food: {id: 'health_f-onion01'}});
    expect(matchIngredient('lentils', FOODS)).toMatchObject({how: 'close', food: {id: 'health_f-lentils'}});
    expect(matchIngredient('red lentils, rinsed', FOODS)).toMatchObject({how: 'close', food: {id: 'health_f-lentils'}});
    expect(matchIngredient('tomato', FOODS)).toMatchObject({how: 'close', food: {id: 'health_f-tomato1'}});
  });
  test('a shared word that covers neither name is a candidate for the picker, never a match', () => {
    const m = matchIngredient('green lentil soup mix', FOODS);
    expect(m.how).toBe('none'); expect(m.food).toBeNull();
    expect(m.candidates.map(f => f.id)).toEqual(['health_f-lentils']);
  });
  test('nothing in common, an empty line, or no foods: none, with no candidates', () => {
    expect(matchIngredient('olive oil', FOODS)).toEqual({food: null, how: 'none', candidates: []});
    expect(matchIngredient('  ,  ', FOODS)).toEqual({food: null, how: 'none', candidates: []});
    expect(matchIngredient('onion', [])).toEqual({food: null, how: 'none', candidates: []});
  });
  test('at most five candidates, the exact one first, covering names before partial ones, then shorter names', () => {
    const many = [food('health_f-rice0001', 'Brown rice cooked'), food('health_f-rice0002', 'Rice'), food('health_f-rice0003', 'Rice cakes'), food('health_f-rice0004', 'Wild rice'), food('health_f-rice0005', 'Rice noodles'), food('health_f-rice0006', 'Rice pudding')];
    const m = matchIngredient('rice', many);
    expect(m).toMatchObject({how: 'exact', food: {id: 'health_f-rice0002'}});
    expect(m.candidates).toHaveLength(5);
    expect(m.candidates[0]!.id).toBe('health_f-rice0002');
  });
});
describe('foodLine', () => {
  test('calories per serving in grams or millilitres; unknown calories say so', () => {
    expect(foodLine(FOODS[0]!)).toBe('116 kcal per 100 g');
    expect(foodLine(FOODS[1]!)).toBe('nutrition unknown, per 100 g');
    expect(foodLine(FOODS[4]!)).toBe('64 kcal per 250 mL');
  });
});
