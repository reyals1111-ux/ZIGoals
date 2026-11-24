import {describe, expect, it} from 'vitest';
import {createEmptyHealth, saveFood, saveRecipe, type HealthData} from '../health';
import {dailyData} from '../health-daily';
import {applyFitPlan, fitCandidates, fitPlans} from './fit-plan';
import {av2FoodAnswer} from '../ai/local-answers/av2-food';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';

/** Session AV lane 2 (food, LEDGER #89; MyFitnessPal's Meal Planner): a day from your own recipes that fits your targets. */
const AT = '2026-11-23T08:00:00.000Z';
function withRecipes(specs: [string, number, number][]): HealthData {
  let h = createEmptyHealth();
  specs.forEach(([name, kcal, proteinG], i) => {
    const foodId = `health_fit-food-${String(i).padStart(3, '0')}`;
    h = saveFood(h, {id: foodId, name: `${name} base`, brand: '', servingGrams: 100, nutrients: {kcal, proteinMg: proteinG * 1000, carbsMg: 30_000, fatMg: 10_000}, createdAt: AT, updatedAt: AT});
    h = saveRecipe(h, {id: `health_fit-recipe-${String(i).padStart(3, '0')}`, name, portionsMilli: 1000, items: [{foodId, quantityMilli: 1000}]}, AT);
  });
  return h;
}
describe('a day that fits the targets', () => {
  it('needs three recipes with known calories and a calorie target', () => {
    const two = withRecipes([['Fictional oats', 300, 10], ['Fictional soup', 500, 20]]);
    expect(fitPlans(two, {kcal: 2000, proteinMg: null, carbsMg: null, fatMg: null})).toEqual([]);
    const three = withRecipes([['Fictional oats', 300, 10], ['Fictional soup', 500, 20], ['Fictional curry', 700, 35]]);
    expect(fitPlans(three, {kcal: null, proteinMg: null, carbsMg: null, fatMg: null})).toEqual([]);
    expect(fitCandidates(three)).toHaveLength(3);
  });
  it('comes close to the calories, then the protein target; breakfast is the lightest; distinct plans, best first', () => {
    const h = withRecipes([['Fictional oats', 300, 10], ['Fictional soup', 450, 15], ['Fictional curry', 700, 40], ['Fictional salad', 400, 35], ['Fictional pasta', 650, 20]]);
    const plans = fitPlans(h, {kcal: 2000, proteinMg: 130_000, carbsMg: null, fatMg: null});
    expect(plans).toHaveLength(3);
    expect(Math.abs(plans[0]!.kcal - 2000)).toBeLessThanOrEqual(150);
    expect(plans[0]!.picks.map(p => p.meal)).toEqual(['Breakfast', 'Lunch', 'Dinner']);
    expect(plans[0]!.picks[0]!.kcal / plans[0]!.picks[0]!.portionsMilli).toBeLessThanOrEqual(plans[0]!.picks[2]!.kcal / plans[0]!.picks[2]!.portionsMilli);
    expect(plans[0]!.score).toBeLessThanOrEqual(plans[1]!.score);
    const sets = plans.map(p => p.picks.map(x => x.recipe.id).sort().join());
    expect(new Set(sets).size).toBe(3);
    // A protein target pulls the high-protein recipes in.
    const noProtein = fitPlans(h, {kcal: 2000, proteinMg: null, carbsMg: null, fatMg: null})[0]!;
    expect(plans[0]!.proteinMg!).toBeGreaterThanOrEqual(noProtein.proteinMg!);
  });
  it('"Plan this day" writes saved meals (reused) and plans for each slot, logged only when eaten', () => {
    const h = withRecipes([['Fictional oats', 300, 10], ['Fictional soup', 450, 15], ['Fictional curry', 700, 40]]);
    const plan = fitPlans(h, {kcal: 1800, proteinMg: null, carbsMg: null, fatMg: null})[0]!;
    let n = 0; const newId = () => `health_fit-op-${String(++n).padStart(4, '0')}`;
    const once = applyFitPlan(h, plan, '2026-11-24', AT, newId);
    expect(dailyData(once).plans.map(p => [p.date, p.meal])).toEqual([['2026-11-24', 'Breakfast'], ['2026-11-24', 'Lunch'], ['2026-11-24', 'Dinner']]);
    expect(dailyData(once).plans.every(p => !p.loggedAt)).toBe(true);
    expect(once.diary).toEqual([]);
    const twice = applyFitPlan(once, plan, '2026-11-24', AT, newId);
    expect(dailyData(twice).plans).toHaveLength(3);
    const other = applyFitPlan(twice, plan, '2026-11-25', AT, newId);
    expect(dailyData(other).savedMeals).toHaveLength(3);
    expect(dailyData(other).plans).toHaveLength(6);
  });
  it('NOVA and ZIGi say the plan in English and Dutch', () => {
    const s = showcaseAll(), h = withRecipes([['Fictional oats', 300, 10], ['Fictional soup', 450, 15], ['Fictional curry', 700, 40]]);
    s.health = {...s.health!, foods: [...s.health!.foods, ...h.foods], recipes: [...s.health!.recipes, ...h.recipes]};
    const en = av2FoodAnswer('plan my meals for tomorrow to fit my targets', zigiEnv(s));
    expect(en && 'text' in en ? en.text : '').toMatch(/^A day from your recipes for .*, \d+ kcal against your 2,200:\n• Breakfast: /);
    // Lead (batch 2, deliberate): the Dutch request names the targets, as "plan my meals for next week" alone is a plan for the person's own AI.
    const nl = av2FoodAnswer('plan mijn maaltijden voor morgen binnen mijn doelen', zigiEnv(s));
    expect(nl && 'text' in nl ? nl.text : '').toMatch(/^Een dag uit je recepten voor .*\n• Ontbijt: /);
    for (const q of ['plan my day', 'what meals are planned this week']) expect(av2FoodAnswer(q, zigiEnv(s)), q).toBeNull();
  });
});
