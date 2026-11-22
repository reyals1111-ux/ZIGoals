import {foodPlusSchema, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #200; Yazio's recipes with a cooking mode): a recipe's method on this device, a step a
 * line (`zigoals:food-plus:v1` `steps`, keyed by recipe id), from a built-in recipe, an import, or typed. Pure.
 */
/** The method kept with a recipe (one line per step), or the steps taken off with an empty list. */
export function setRecipeSteps(record: FoodPlus, recipeId: string, steps: readonly string[], liveRecipeIds?: ReadonlySet<string>): FoodPlus {
  const lines = steps.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60).map(s => s.slice(0, 600));
  const map: Record<string, string[]> = {...record.steps};
  if (lines.length) map[recipeId] = lines; else delete map[recipeId];
  if (liveRecipeIds) for (const id of Object.keys(map)) if (id !== recipeId && !liveRecipeIds.has(id)) delete map[id];
  const {steps: _s, ...rest} = record; void _s;
  return foodPlusSchema.parse(Object.keys(map).length ? {...rest, steps: map} : rest);
}
/** Method text as typed ("1. Chop…", one per line, or blank lines between) into steps. */
export const stepsFromText = (text: string): string[] => text.split(/\r?\n/).map(l => l.replace(/^\s*(?:\d{1,2}[.)]|[-•*·])\s*/, '').trim()).filter(Boolean).slice(0, 60);
