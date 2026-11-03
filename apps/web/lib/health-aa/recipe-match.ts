import type {HealthFood} from '../health';

/**
 * Session AK (task 4.8): which of the person's foods an imported ingredient line matches, shown on the confirmation so
 * every match is visible and every unmatched line can be pointed at a food or left as a new one. Exact name first (case
 * and accents ignored); then a "close" match where every word of the shorter name is in the longer one (plurals folded);
 * never a guess beyond that. Up to five candidates for the picker.
 */
export type IngredientMatch = {food: HealthFood | null; how: 'exact' | 'close' | 'none'; candidates: HealthFood[]};
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (s: string) => fold(s).split(' ').filter(w => w.length > 1).map(w => w.length > 3 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
export function matchIngredient(name: string, foods: readonly HealthFood[]): IngredientMatch {
  const n = fold(name);
  if (!n) return {food: null, how: 'none', candidates: []};
  const exact = foods.find(f => fold(f.name) === n);
  const mine = words(name);
  const scored = foods.map(f => {
    const theirs = words(f.name), shared = mine.filter(w => theirs.includes(w)).length;
    const covers = shared > 0 && (shared === mine.length || shared === theirs.length);
    return {f, shared, covers};
  }).filter(x => x.shared > 0).sort((a, b) => Number(b.covers) - Number(a.covers) || b.shared - a.shared || a.f.name.length - b.f.name.length || a.f.name.localeCompare(b.f.name));
  const candidates = [...new Set([...(exact ? [exact] : []), ...scored.map(x => x.f)])].slice(0, 5);
  if (exact) return {food: exact, how: 'exact', candidates};
  const close = scored.find(x => x.covers);
  return close ? {food: close.f, how: 'close', candidates} : {food: null, how: 'none', candidates};
}
/** "116 kcal per 100 g" for the match line; "nutrition unknown" when the food has no calories. */
export function foodLine(food: HealthFood): string {
  const serving = food.servingGrams !== null ? `${food.servingGrams} g` : food.servingMl !== undefined ? `${food.servingMl} mL` : 'serving';
  return food.nutrients.kcal === null ? `nutrition unknown, per ${serving}` : `${food.nutrients.kcal} kcal per ${serving}`;
}
