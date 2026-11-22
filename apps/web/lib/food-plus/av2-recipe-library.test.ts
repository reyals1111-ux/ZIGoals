import {describe, expect, it, vi} from 'vitest';
import {parseIngredientLine} from '../health-aa/recipe-text';
import {countGrams, ingredientItem, libraryFoodsFor} from './recipe-library';

/** Session AV lane 2 (food, LEDGER #87, #95, #104): a recipe ingredient matched to the offline food library. */
const food = (name: string, kcal: number | null) => ({key: name.toLowerCase(), name, match: 'substring', matchedAlias: null, entries: [{source: 'ciqual', sourceName: 'CIQUAL', id: name, name, aliases: [], basis: 'per-100g', nutrients: {kcal, proteinMg: 1000, carbsMg: 5000, fatMg: 100}, vitamins: {}, more: {}}]});
vi.mock('../food-generic/search', () => ({
  searchGenericLibrary: async (q: string) => ({results: q.includes('lentil') ? [food('Lentil soup, canned', 60), food('Lentils, red, boiled', 116), food('Lentils, red, raw', 330)] : q.includes('onion') ? [food('Onion rings, fried', 400), food('Onion, raw', 40)] : [], failed: []}),
}));
describe('recipe ingredients from the offline library', () => {
  it('reads an ingredient line as meal words; a bare count becomes grams at a usual portion', () => {
    const lentils = parseIngredientLine('200 g red lentils')!, onion = parseIngredientLine('1 onion')!;
    expect(ingredientItem(lentils)).toEqual({text: 'red lentils', food: 'red lentils', count: 200, unit: 'g'});
    expect(countGrams(lentils, 'Lentils, red, raw')).toBeNull();
    expect(countGrams(onion, 'Onion, raw')).toBeGreaterThan(0);
  });
  it('the plain food first, at most five, each with its calories per 100 g', async () => {
    const lentils = await libraryFoodsFor(parseIngredientLine('200 g red lentils')!);
    expect(lentils.map(f => f.name)).toEqual(['Lentils, red, raw', 'Lentils, red, boiled', 'Lentil soup, canned']);
    expect(lentils[0]).toMatchObject({sourceName: 'CIQUAL', kcalPer100g: 330, portionGrams: null});
    const onion = await libraryFoodsFor(parseIngredientLine('1 onion')!);
    expect(onion[0]!.name).toBe('Onion, raw');
    expect(onion[0]!.portionGrams).toBeGreaterThan(0);
    expect(await libraryFoodsFor(parseIngredientLine('1 pinch of nothingness')!)).toEqual([]);
  });
});
