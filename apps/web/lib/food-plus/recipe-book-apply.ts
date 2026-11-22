import {saveFood, saveRecipe, newHealthId, type HealthData, type Nutrition} from '../health';
import type {GenericFood} from '../diet-templates/apply';
import type {FoodKey} from '../diet-templates/templates';
import {RECIPE_BOOK, type BookRecipe, type BookStyle} from './recipe-book';

/**
 * Session AV lane 2 (food, LEDGER #91): the built-in recipes' nutrition from the offline library, their styles, and
 * saving one to "My recipes" (its method is kept with lib/food-plus/steps.ts). Pure (the library foods are passed in, resolved by
 * lib/diet-templates/apply.ts resolveTemplateFoods).
 */
export type Lang = 'en' | 'nl';
export const bookName = (recipe: BookRecipe, lang: Lang) => lang === 'nl' ? recipe.nl : recipe.en;
export const bookFoods = (): FoodKey[] => [...new Set(RECIPE_BOOK.flatMap(r => r.items.map(([k]) => k)))].sort();
const SUMMED = ['kcal', 'proteinMg', 'carbsMg', 'fatMg', 'fiberMg'] as const;
export type BookNutrition = Record<(typeof SUMMED)[number], number | null> & {
  /** For a value some ingredient does not carry: the share of the recipe's grams it leaves out (0 when every one does). */
  missing: Partial<Record<(typeof SUMMED)[number], number>>};
/**
 * One serving's nutrition: the sum of what the ingredients carry. A value no ingredient carries is unknown (null), never
 * 0; one only some carry is the known part, with the share of the grams left out in `missing` (shown "12+ g").
 */
export function bookServing(recipe: BookRecipe, foods: Partial<Record<FoodKey, GenericFood>>): BookNutrition {
  const out = {missing: {}} as BookNutrition, total = recipe.items.reduce((t, [, g]) => t + g, 0);
  for (const key of SUMMED) {
    let sum = 0, known = 0, left = 0;
    for (const [food, grams] of recipe.items) { const v = foods[food]?.nutrients[key]; if (v === null || v === undefined) { left += grams; continue; } sum += v * grams / 100; known++; }
    out[key] = known ? Math.round(sum / recipe.servings) : null;
    if (known && left) out.missing[key] = left / total;
  }
  return out;
}
export type BookTag = BookStyle | 'high-protein' | 'low-carb';
/** The recipe's styles, with high protein (20 g or more a serving, a quarter of its calories or more; a known part is at least that) and low carb (15 g or less) from its nutrition. */
export function bookTags(recipe: BookRecipe, serving: BookNutrition): BookTag[] {
  const tags: BookTag[] = [...recipe.styles];
  if (serving.proteinMg !== null && serving.kcal && serving.proteinMg >= 20_000 && serving.proteinMg / 1000 * 4 >= serving.kcal * 0.25) tags.push('high-protein');
  // Low carb only when what is left out is small (at most 15 % of the grams, oil or a leaf): the known part is then close.
  if (serving.carbsMg !== null && serving.carbsMg <= 15_000 && (serving.missing.carbsMg ?? 0) <= 0.15) tags.push('low-carb');
  return tags;
}
/**
 * Saves a book recipe to the person's recipes: each library food joins their foods per 100 g (one already there with
 * the same name and source is reused), the recipe is made with the book's servings, and its method is returned as the
 * steps for `zigoals:food-plus:v1`. A recipe of the same name already saved is refused, so a double tap adds one.
 */
export function saveBookRecipe(data: HealthData, recipe: BookRecipe, foods: Partial<Record<FoodKey, GenericFood>>, lang: Lang, at: string, ids: {recipeId: string; newId?: () => string}): HealthData {
  const name = bookName(recipe, lang);
  if (data.recipes.some(r => r.name === name)) throw new Error(`“${name}” is already in your recipes.`);
  const missing = recipe.items.filter(([k]) => !foods[k]);
  if (missing.length) throw new Error('The food library could not give every food of this recipe. Nothing was added.');
  const newId = ids.newId ?? newHealthId;
  let next = data;
  const items = recipe.items.map(([key, grams]) => {
    const g = foods[key]!, brand = g.sourceName.slice(0, 80), foodName = g.name.slice(0, 120);
    let food = next.foods.find(f => f.name === foodName && f.brand === brand && f.servingGrams === 100);
    if (!food) { const id = newId(); next = saveFood(next, {id, name: foodName, brand, servingGrams: 100, nutrients: {...g.nutrients} as Nutrition, createdAt: at, updatedAt: at}); food = next.foods.find(f => f.id === id)!; }
    return {foodId: food.id, quantityMilli: Math.max(1, Math.round(grams * 10))};
  });
  return saveRecipe(next, {id: ids.recipeId, name, portionsMilli: recipe.servings * 1000, items}, at);
}
