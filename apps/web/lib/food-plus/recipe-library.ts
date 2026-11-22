import type {Nutrition} from '../health';
import type {ParsedIngredient} from '../health-aa/recipe-text';
import {libraryQueries, rankLibraryNames, type WordsItem} from '../meal-words/match';
import {usualPortionGrams} from '../food-generic/portion';
import {libraryExtras, type LibraryExtras} from './library-extras';

/**
 * Session AV lane 2 (food, LEDGER #87, #95, #104; MyFitnessPal's Recipe Importer, Cronometer's, MacroFactor's): a recipe
 * ingredient that matches none of the person's own foods is looked up in the offline food library (the same matcher as
 * "Find these foods", lib/meal-words/match.ts), so the imported recipe gets nutrition per 100 g instead of "unknown".
 * The best 5, the plain food first; the person checks the choice before Save. The library loads on first use.
 */
export type LibraryFood = {name: string; sourceName: string; nutrients: Nutrition; kcalPer100g: number | null; portionGrams: number | null; /** LEDGER #93: the vitamins and extras the library carries for it. */ extras: LibraryExtras};
/** The ingredient as meal words ("2 onions" → food "onions", count 2) for the matcher. */
export function ingredientItem(row: Pick<ParsedIngredient, 'name' | 'quantity' | 'unit' | 'grams'>): WordsItem {
  const unit = row.grams !== null ? 'g' : row.unit === 'ml' ? 'ml' : null;
  return {text: row.name, food: row.name.toLowerCase().replace(/\s+/g, ' ').trim(), count: row.grams ?? row.quantity, unit};
}
/** A count without a unit ("1 onion") becomes grams at a usual portion; with grams or no count, none. */
export const countGrams = (row: Pick<ParsedIngredient, 'name' | 'quantity' | 'unit' | 'grams'>, libraryName: string): number | null =>
  row.grams === null && row.unit === null && row.quantity !== null && row.quantity > 0 ? Math.round(row.quantity * usualPortionGrams(libraryName)) : null;
export async function libraryFoodsFor(row: Pick<ParsedIngredient, 'name' | 'quantity' | 'unit' | 'grams'>, limit = 5): Promise<LibraryFood[]> {
  const {searchGenericLibrary} = await import('../food-generic/search');
  const item = ingredientItem(row), queries = libraryQueries(item), seen = new Set<string>(), all: {name: string; sourceName: string; nutrients: Nutrition; extras: LibraryExtras}[] = [];
  for (const q of queries) for (const x of (await searchGenericLibrary(q, {limit: 30}).catch(() => ({results: []}))).results) {
    const e = x.entries[0];
    if (e && !seen.has(x.key)) { seen.add(x.key); all.push({name: e.name, sourceName: e.sourceName, nutrients: e.nutrients, extras: libraryExtras(e)}); }
  }
  if (!queries.length) return [];
  return rankLibraryNames(queries.at(-1)!, all.map(o => o.name)).slice(0, limit).map(i => { const o = all[i]!; return {...o, kcalPer100g: o.nutrients.kcal, portionGrams: countGrams(row, o.name)}; });
}
