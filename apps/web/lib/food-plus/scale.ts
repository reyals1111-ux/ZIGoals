import type {HealthRecipe} from '../health';
import {formatNumber} from '../visual-format';

/**
 * Session AW (X5, LEDGER #450; Paprika's scaling while cooking): the cooking view's "Cook for 2 / 4 / 6" and "½× / 1× /
 * 2×": every ingredient amount multiplied for the servings chosen and rounded the way a cook measures — grams and
 * millilitres to 5 (below 20 to the whole one, never 0), pieces to halves (never under a half). Only what the cooking
 * view shows changes; the saved recipe, its nutrition and its logging stay as they are. Derived; nothing stored. Pure.
 */
export type Scale = {kind: 'servings'; servings: number} | {kind: 'times'; times: number};
export const SERVING_CHOICES = [2, 4, 6] as const, TIMES_CHOICES = [0.5, 1, 2] as const;
export const recipeServings = (recipe: Pick<HealthRecipe, 'portionsMilli'>) => recipe.portionsMilli / 1000;
/** The factor a choice multiplies by (1 for the recipe as saved). */
export function factorOf(recipe: Pick<HealthRecipe, 'portionsMilli'>, scale: Scale | null): number {
  if (!scale) return 1;
  const f = scale.kind === 'times' ? scale.times : scale.servings / recipeServings(recipe);
  return Number.isFinite(f) && f > 0 ? Math.min(f, 100) : 1;
}
export const roundMeasure = (amount: number) => amount < 20 ? Math.max(1, Math.round(amount)) : Math.round(amount / 5) * 5;
export const roundPieces = (amount: number) => Math.max(0.5, Math.round(amount * 2) / 2);
const pieceText = (n: number) => { const whole = Math.floor(n), half = n - whole >= 0.5; return whole ? `${formatNumber(whole)}${half ? '½' : ''}` : '½'; };
export type ScaledLine = {foodId: string; name: string; amount: string};
/**
 * The ingredient lines as the cooking view shows them, for the factor: "450 g peas", "1½ × eggs". At 1× the amounts are
 * the recipe's own, unrounded, as the cooking view has always shown them.
 */
export function scaledLines(recipe: Pick<HealthRecipe, 'ingredients'>, factor: number): ScaledLine[] {
  return recipe.ingredients.map(i => {
    const servings = i.quantityMilli / 1000 * factor, s = i.snapshot, exact = (x: number) => formatNumber(x, {maximumFractionDigits: 1});
    if (factor === 1) return {foodId: i.foodId, name: s.name, amount: s.servingGrams !== null ? `${exact(s.servingGrams * servings)} g` : s.servingMl !== undefined ? `${exact(s.servingMl * servings)} ml` : `${formatNumber(servings, {maximumFractionDigits: 3})} ×`};
    const amount = s.servingGrams !== null ? `${formatNumber(roundMeasure(s.servingGrams * servings))} g`
      : s.servingMl !== undefined ? `${formatNumber(roundMeasure(s.servingMl * servings))} ml`
      : `${pieceText(roundPieces(servings))} ×`;
    return {foodId: i.foodId, name: s.name, amount};
  });
}
/** "Makes 2 servings" / "For 4 servings (the recipe makes 2): amounts × 2" / "Half the recipe: amounts × ½". */
export function scaleWords(recipe: Pick<HealthRecipe, 'portionsMilli'>, scale: Scale | null): string {
  const made = recipeServings(recipe), n = (x: number) => formatNumber(x, {maximumFractionDigits: 2}), servings = (x: number) => `${n(x)} ${x === 1 ? 'serving' : 'servings'}`;
  const f = factorOf(recipe, scale);
  if (!scale || f === 1) return `Makes ${servings(made)}.`;
  const times = f === 0.5 ? '½' : n(f);
  return scale.kind === 'servings' ? `For ${servings(scale.servings)} (the recipe makes ${n(made)}): amounts × ${times}.` : `${f === 0.5 ? 'Half the recipe' : f === 2 ? 'Twice the recipe' : `The recipe × ${times}`}: ${servings(made * f)}.`;
}
