import type {HealthData} from '../health';
import {formatDate} from '../visual-format';
import {foodPlusSchema, MAX_MADE_DAYS, type FoodPlus} from './schema';

/**
 * Session AW (X5, LEDGER #455; Paprika's "last made" and ratings): when a recipe was last made and how often, and the
 * person's own one to five stars. The days come from two places, joined: the diary's entries of the recipe (a recipe
 * logged is a recipe made that day) and the days the person said "Made it" at the end of the cooking view
 * (`zigoals:food-plus:v1` `made`). Stars are only the person's (`stars`); a recipe without any shows none, never 0.
 * Pure: the day comes in.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const without = <K extends keyof FoodPlus>(record: FoodPlus, key: K): FoodPlus => { const copy = {...record}; delete copy[key]; return copy; };
/** "Made it" on a day (once a day); past 400 days a recipe keeps the newest. Recipes no longer saved are dropped. */
export function markMade(record: FoodPlus, recipeId: string, day: string, liveRecipeIds?: ReadonlySet<string>): FoodPlus {
  if (!DAY.test(day)) throw new Error('That day could not be read.');
  const map: Record<string, string[]> = {...record.made};
  map[recipeId] = [...new Set([...(map[recipeId] ?? []), day])].sort().slice(-MAX_MADE_DAYS);
  if (liveRecipeIds) for (const id of Object.keys(map)) if (!liveRecipeIds.has(id)) delete map[id];
  return foodPlusSchema.parse({...record, made: map});
}
/** Takes one "Made it" day back off (the diary's own entries stay as they are). */
export function unmarkMade(record: FoodPlus, recipeId: string, day: string): FoodPlus {
  const map: Record<string, string[]> = {...record.made}, left = (map[recipeId] ?? []).filter(d => d !== day);
  if (left.length) map[recipeId] = left; else delete map[recipeId];
  return foodPlusSchema.parse(Object.keys(map).length ? {...record, made: map} : without(record, 'made'));
}
/** The person's stars (1–5), or none with null. */
export function setStars(record: FoodPlus, recipeId: string, stars: number | null, liveRecipeIds?: ReadonlySet<string>): FoodPlus {
  if (stars !== null && !(Number.isInteger(stars) && stars >= 1 && stars <= 5)) throw new Error('Choose from one to five stars.');
  const map: Record<string, number> = {...record.stars};
  if (stars === null) delete map[recipeId]; else map[recipeId] = stars;
  if (liveRecipeIds) for (const id of Object.keys(map)) if (!liveRecipeIds.has(id)) delete map[id];
  return foodPlusSchema.parse(Object.keys(map).length ? {...record, stars: map} : without(record, 'stars'));
}
export type MadeInfo = {days: string[]; last: string | null; times: number; marked: string[]};
/** Every day the recipe was made up to `today`: its diary entries' days and the "Made it" days, once each, oldest first. */
export function madeOf(data: Pick<HealthData, 'diary'>, record: FoodPlus | null | undefined, recipeId: string, today: string): MadeInfo {
  const marked = (record?.made?.[recipeId] ?? []).filter(d => d <= today);
  const logged = data.diary.filter(e => e.sourceKind === 'recipe' && e.sourceId === recipeId && e.date <= today).map(e => e.date);
  const days = [...new Set([...marked, ...logged])].sort();
  return {days, last: days.at(-1) ?? null, times: days.length, marked};
}
export const starsOf = (record: FoodPlus | null | undefined, recipeId: string): number | null => record?.stars?.[recipeId] ?? null;
/** "Last made Nov 12 · 5 times", "Made today · once", or "Not made yet" (no diary entry and no "Made it"). */
export function madeLine(info: MadeInfo, today: string): string {
  if (!info.last) return 'Not made yet';
  const when = info.last === today ? 'today' : formatDate(info.last, {year: info.last.slice(0, 4) !== today.slice(0, 4)});
  return `${info.last === today ? 'Made' : 'Last made'} ${when} · ${info.times === 1 ? 'once' : `${info.times} times`}`;
}
/** "★★★★☆ 4 of 5" for a screen; the words alone for a name. */
export const starsText = (stars: number) => `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
export type RecipeSort = 'added' | 'last-made' | 'stars' | 'name';
/**
 * The recipe list in the order chosen: as added (the list's own order), last made (the most recent first, never made at
 * the end), stars (the most first, unstarred at the end) or by name. Ties keep the list's own order.
 */
export function sortRecipeIds(data: Pick<HealthData, 'diary' | 'recipes'>, record: FoodPlus | null | undefined, sort: RecipeSort, today: string): string[] {
  const ids = data.recipes.map(r => r.id);
  if (sort === 'added') return ids;
  const at = new Map(ids.map((id, i) => [id, i])), name = new Map(data.recipes.map(r => [r.id, r.name]));
  const key = (id: string): string | number => sort === 'last-made' ? madeOf(data, record, id, today).last ?? '' : sort === 'stars' ? starsOf(record, id) ?? 0 : name.get(id) ?? '';
  const keys = new Map(ids.map(id => [id, key(id)]));
  return [...ids].sort((a, b) => {
    const x = keys.get(a)!, y = keys.get(b)!;
    const by = sort === 'name' ? String(x).localeCompare(String(y)) : typeof x === 'number' ? (y as number) - x : String(y).localeCompare(String(x));
    return by || at.get(a)! - at.get(b)!;
  });
}
