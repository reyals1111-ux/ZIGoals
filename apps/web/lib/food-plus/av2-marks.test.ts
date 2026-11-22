import {describe, expect, it} from 'vitest';
import {fitsStyle, labelLevels, setMarks} from './marks';
import {emptyFoodPlus} from './schema';
import {av2FoodAnswer} from '../ai/local-answers/av2-food';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';

/** Session AV lane 2 (food, LEDGER #198, #199): an eating style's "fits" mark and the label levels, from a food's own nutrients. */
const food = (nutrients: Record<string, number | null>, servingGrams: number | null = 100) => ({servingGrams, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null, ...nutrients}} as never);
describe('food marks', () => {
  it('fits: low carb at 10 % of calories or less, high protein at 25 % or more, high fibre at 3 g per 100 kcal; unknown gives none', () => {
    expect(fitsStyle(food({kcal: 200, carbsMg: 5000}), 'low-carb')).toBe(true); // 20 kcal of 200
    expect(fitsStyle(food({kcal: 200, carbsMg: 6000}), 'low-carb')).toBe(false);
    expect(fitsStyle(food({kcal: 200, proteinMg: 12_500}), 'high-protein')).toBe(true);
    expect(fitsStyle(food({kcal: 100, fiberMg: 3000}), 'high-fibre')).toBe(true);
    expect(fitsStyle(food({kcal: 100}), 'high-fibre')).toBeNull();
    expect(fitsStyle(food({kcal: null, proteinMg: 20_000}), 'high-protein')).toBeNull();
  });
  it('label levels per 100 g by the front-of-pack rule; salt from sodium; only for foods in grams', () => {
    const levels = labelLevels(food({kcal: 450, fatMg: 20_000, saturatedFatMg: 1500, sugarMg: 10_000, sodiumMg: 200}, 50));
    expect(levels.map(l => [l.name, l.level, l.per100g])).toEqual([['Fat', 'high', 40], ['Saturated fat', 'medium', 3], ['Sugars', 'medium', 20], ['Salt', 'medium', 1]]);
    expect(labelLevels(food({kcal: 40, fatMg: 1000}, null))).toEqual([]);
    expect(labelLevels(food({kcal: 40, sugarMg: 4000}))[0]).toMatchObject({level: 'low'});
  });
  it('the choice is kept and cleared', () => {
    let r = setMarks(emptyFoodPlus(), {style: 'high-protein'});
    r = setMarks(r, {levels: true});
    expect(r.marks).toEqual({style: 'high-protein', levels: true});
    expect(setMarks(setMarks(r, {style: null}), {levels: false}).marks).toBeUndefined();
  });
  it('NOVA and ZIGi name the foods that fit, in English and Dutch', () => {
    const en = av2FoodAnswer('which of my foods are low carb', zigiEnv(showcaseAll()));
    expect(en && 'text' in en ? en.text : '').toMatch(/^Of your \d+ foods, \d+ fit low carb/);
    const nl = av2FoodAnswer('welke van mijn voedingsmiddelen zijn eiwitrijk', zigiEnv(showcaseAll()));
    expect(nl && 'text' in nl ? nl.text : '').toMatch(/^Van je \d+ voedingsmiddelen passen er \d+ bij eiwitrijk/);
  });
});
