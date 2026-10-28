import {expect, test} from 'vitest';
import {MAX_ESTIMATES, addEstimate, estimateLine, emptyMealEstimates, mealEstimatesSchema, middleOf, rangeText, removeEstimate} from './schema';
import {mealEstimateEntry} from '../ai/actions/meal-estimate-writes';

/** Session AI (feature 1, HE17): the ranges behind an AI meal estimate, kept beside the food on this device. */
const at = '2026-10-28T12:00:00.000Z';
test('middle and words of a range', () => {
  expect(middleOf('kcal', [450, 651])).toBe(551); expect(middleOf('protein_g', [20, 25])).toBe(22.5);
  expect(rangeText('kcal', [450, 650])).toBe('450–650'); expect(rangeText('fat_g', [12, 12])).toBe('12');
});
test('add, replace, remove, and the oldest go past the limit', () => {
  let r = addEstimate(emptyMealEstimates(), 'food_a', {ranges: {kcal: [450, 650]}, source: 'photo', at});
  r = addEstimate(r, 'food_a', {ranges: {kcal: [500, 600]}, source: 'chat', at});
  expect(r.foods.food_a).toMatchObject({ranges: {kcal: [500, 600]}, source: 'chat'});
  expect(removeEstimate(r, 'food_a').foods).toEqual({});
  let many = emptyMealEstimates();
  for (let i = 0; i <= MAX_ESTIMATES; i++) many = {...many, foods: {...many.foods, [`f${i}`]: {ranges: {}, source: 'chat', at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()}}};
  const trimmed = addEstimate(many, 'newest', {ranges: {}, source: 'chat', at});
  expect(Object.keys(trimmed.foods)).toHaveLength(MAX_ESTIMATES); expect(trimmed.foods.f0).toBeUndefined(); expect(trimmed.foods.newest).toBeDefined();
});
test('loose and versioned: a later field is kept; a reversed range is refused; the card writer checks the patch', () => {
  expect(mealEstimatesSchema.parse({version: 1, foods: {f: {ranges: {kcal: [1, 2], fibre_g: [1, 2]}, source: 'photo', at, later: true}}, extra: 1})).toMatchObject({extra: 1, foods: {f: {later: true}}});
  expect(() => addEstimate(emptyMealEstimates(), 'f', {ranges: {kcal: [650, 450]}, source: 'photo', at})).toThrow();
  expect(mealEstimateEntry.apply(emptyMealEstimates(), {add: {foodId: 'f', estimate: {ranges: {kcal: [1, 2]}, source: 'photo', at}}})).toMatchObject({foods: {f: {source: 'photo'}}});
  expect(() => mealEstimateEntry.apply(emptyMealEstimates(), {add: {foodId: 'f', estimate: {ranges: {kcal: [2, 1]}, source: 'photo', at}}})).toThrow(/cannot be kept/);
  expect(() => mealEstimateEntry.apply(emptyMealEstimates(), {remove: 'f'})).toThrow();
});
test('the library line', () => expect(estimateLine({ranges: {kcal: [450, 650], protein_g: [20, 30]}, source: 'photo', at})).toBe('AI estimate from a photo: kcal 450–650 · protein 20–30 g per serving (saved: the middle; edit to correct it)'));
