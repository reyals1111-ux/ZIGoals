import {recipeNutrition, type HealthData, type HealthRecipe, type HealthTargets} from '../health';
import {dailyData, saveMealFromRecipe, saveMealPlan} from '../health-daily';

/**
 * Session AV lane 2 (food, LEDGER #89; MyFitnessPal's Meal Planner): a day planned from your own recipes to fit your
 * targets. Breakfast, lunch and dinner each get one recipe at ½, 1, 1½ or 2 servings, the three chosen together so the
 * day comes closest to the calorie target and, where you set them, the protein, carbs and fat targets (the day's own,
 * so a weekday target counts). Only recipes whose calories are known take part (unknown is never 0). It plans nothing
 * by itself: "Plan this day" writes ordinary saved meals and plans, logged only when eaten. Pure. Grocery delivery stays
 * Carried (needs an outside service); the plan's groceries are in the planner's list as always.
 */
export const FIT_SLOTS = ['Breakfast', 'Lunch', 'Dinner'] as const;
export const FIT_PORTIONS = [500, 1000, 1500, 2000] as const;
export const MAX_FIT_RECIPES = 30;
export type FitPick = {meal: (typeof FIT_SLOTS)[number]; recipe: HealthRecipe; portionsMilli: number; kcal: number; proteinMg: number | null; carbsMg: number | null; fatMg: number | null};
export type FitPlan = {picks: FitPick[]; kcal: number; proteinMg: number | null; carbsMg: number | null; fatMg: number | null; score: number};
type Candidate = {recipe: HealthRecipe; kcal: number; proteinMg: number | null; carbsMg: number | null; fatMg: number | null};
/** The recipes that can take part: calories known per serving, the most recently changed first, at most 30. */
export function fitCandidates(data: HealthData): Candidate[] {
  return [...data.recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).flatMap(recipe => { const n = recipeNutrition(recipe); return n.kcal !== null && n.kcal > 0 ? [{recipe, kcal: n.kcal, proteinMg: n.proteinMg, carbsMg: n.carbsMg, fatMg: n.fatMg}] : []; }).slice(0, MAX_FIT_RECIPES);
}
/** The best plans for one day's targets, best first (distinct recipe sets), or [] with fewer than three recipes or no calorie target. */
export function fitPlans(data: HealthData, targets: Pick<HealthTargets, 'kcal' | 'proteinMg' | 'carbsMg' | 'fatMg'>, limit = 3): FitPlan[] {
  const c = fitCandidates(data), target = targets.kcal;
  if (c.length < 3 || !target) return [];
  const macros = (['proteinMg', 'carbsMg', 'fatMg'] as const).filter(k => targets[k] !== null && targets[k]! > 0);
  const best: FitPlan[] = [];
  const consider = (plan: FitPlan) => {
    const key = plan.picks.map(p => p.recipe.id).sort().join('|');
    const same = best.findIndex(b => b.picks.map(p => p.recipe.id).sort().join('|') === key);
    if (same >= 0) { if (best[same]!.score <= plan.score) return; best.splice(same, 1); }
    best.push(plan); best.sort((a, b) => a.score - b.score); if (best.length > limit) best.pop();
  };
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) for (let k = j + 1; k < c.length; k++) {
    // The lightest of the three is breakfast, the heaviest dinner (by a serving's calories).
    const three = [c[i]!, c[j]!, c[k]!].sort((x, y) => x.kcal - y.kcal || x.recipe.name.localeCompare(y.recipe.name));
    for (const p0 of FIT_PORTIONS) for (const p1 of FIT_PORTIONS) for (const p2 of FIT_PORTIONS) {
      const portions = [p0, p1, p2], kcal = three.reduce((t, r, n) => t + r.kcal * portions[n]! / 1000, 0);
      let score = Math.abs(kcal - target) / target * 3;
      const sums = {} as Record<'proteinMg' | 'carbsMg' | 'fatMg', number | null>;
      for (const m of ['proteinMg', 'carbsMg', 'fatMg'] as const) sums[m] = three.every(r => r[m] !== null) ? three.reduce((t, r, n) => t + r[m]! * portions[n]! / 1000, 0) : null;
      for (const m of macros) score += sums[m] === null ? 0.5 : Math.abs(sums[m]! - targets[m]!) / targets[m]!;
      if (best.length === limit && score >= best[best.length - 1]!.score) continue;
      consider({picks: three.map((r, n) => ({meal: FIT_SLOTS[n]!, recipe: r.recipe, portionsMilli: portions[n]!, kcal: Math.round(r.kcal * portions[n]! / 1000), proteinMg: r.proteinMg === null ? null : Math.round(r.proteinMg * portions[n]! / 1000), carbsMg: r.carbsMg === null ? null : Math.round(r.carbsMg * portions[n]! / 1000), fatMg: r.fatMg === null ? null : Math.round(r.fatMg * portions[n]! / 1000)})),
        kcal: Math.round(kcal), proteinMg: sums.proteinMg === null ? null : Math.round(sums.proteinMg), carbsMg: sums.carbsMg === null ? null : Math.round(sums.carbsMg), fatMg: sums.fatMg === null ? null : Math.round(sums.fatMg), score});
    }
  }
  return best;
}
/** Writes the plan for a date: a saved meal per pick (one already made from that recipe at that amount is reused) and a plan per slot. */
export function applyFitPlan(data: HealthData, plan: FitPlan, date: string, at: string, newId: () => string): HealthData {
  let next = data;
  for (const pick of plan.picks) {
    const existing = dailyData(next).savedMeals.find(m => m.items.length === 1 && m.items[0]!.sourceKind === 'recipe' && m.items[0]!.sourceId === pick.recipe.id && m.items[0]!.quantityMilli === pick.portionsMilli);
    let mealId = existing?.id;
    if (!mealId) { mealId = newId(); next = saveMealFromRecipe(next, mealId, pick.recipe.id, pick.portionsMilli, at); }
    if (dailyData(next).plans.some(p => p.date === date && p.meal === pick.meal && p.savedMealId === mealId)) continue;
    next = saveMealPlan(next, {id: newId(), savedMealId: mealId, date, meal: pick.meal}, at);
  }
  return next;
}
