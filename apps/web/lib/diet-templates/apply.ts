import {foodSnapshot, healthSchema, newHealthId, type HealthData, type HealthFood, type Nutrition} from '../health';
import {dailyData} from '../health-daily';
import {addLocalDays, localWeekday} from '../local-date';
import type {LoadedGenericSource} from '../food-generic/load';
import {entryOf} from '../food-generic/search';
import {TEMPLATE_FOODS, type AuthoredMeal, type DietTemplate, type FoodKey, type TemplateMeal} from './templates';

/**
 * Session AK (item 20): a diet-style template into the existing planner and grocery list, in three steps.
 * 1. `templatePreview`: what the week will hold, day by day, for the person to review. Nothing is written.
 * 2. `applyTemplate`: on their confirmation, the foods it needs join the library (a food of the same name and source
 *    already there is reused), each meal becomes a saved meal named "<meal> · <template> template" (reused if it exists),
 *    and every slot of the week gets a plan through the planner's own `saveMealPlan`. The grocery list follows from the
 *    plans as always. It returns exactly what it added.
 * 3. `undoTemplate`: removes what that application added: its plans not yet logged, then its saved meals and foods that
 *    nothing else uses any more. A plan already logged as eaten, and what it uses, stays.
 */
export type GenericFood = {name: string; sourceName: string; nutrients: Nutrition};
export type SlotPlan = {date: string; meal: TemplateMeal; dish: AuthoredMeal};
export type TemplatePreview = {weekStart: string; days: {date: string; slots: SlotPlan[]}[]; foods: FoodKey[]};
export type Added = {plans: string[]; savedMeals: string[]; foods: string[]};

/** The Monday of a date's week (the planner's weeks run Monday first). */
export const mondayOf = (date: string) => addLocalDays(date, -((localWeekday(date) + 6) % 7));
export const templateMealName = (t: DietTemplate, dish: AuthoredMeal) => `${dish.name} · ${t.name} template`.slice(0, 120);
export function templatePreview(t: DietTemplate, anyDayOfWeek: string): TemplatePreview {
  const weekStart = mondayOf(anyDayOfWeek), foods = new Set<FoodKey>();
  const days = t.week.map(([b, l, d, s], i) => {
    const date = addLocalDays(weekStart, i);
    const slots: SlotPlan[] = [{date, meal: 'Breakfast', dish: t.breakfasts[b]!}, {date, meal: 'Lunch', dish: t.lunches[l]!}, {date, meal: 'Dinner', dish: t.dinners[d]!}, {date, meal: 'Snacks', dish: t.snacks[s]!}];
    for (const slot of slots) for (const [key] of slot.dish.items) foods.add(key);
    return {date, slots};
  });
  return {weekStart, days, foods: [...foods].sort()};
}
/** The library's values for each food a template needs, from the loaded offline sources; `missing` names any not found. */
export function resolveTemplateFoods(keys: readonly FoodKey[], sources: readonly LoadedGenericSource[]): {foods: Partial<Record<FoodKey, GenericFood>>; missing: FoodKey[]} {
  const foods: Partial<Record<FoodKey, GenericFood>> = {}, missing: FoodKey[] = [];
  for (const key of keys) {
    const ref = TEMPLATE_FOODS[key], loaded = sources.find(s => s.entry.source === ref.source), row = loaded?.file.foods.find(r => r[0] === ref.id);
    if (!loaded || !row) { missing.push(key); continue; }
    const e = entryOf(loaded.file, loaded.entry, row);
    foods[key] = {name: e.name, sourceName: e.sourceName, nutrients: e.nutrients};
  }
  return {foods, missing};
}
/** About how many kcal a day of the template holds, from the library's typical values (null when a value is unknown). */
export function dayKcal(dishes: readonly AuthoredMeal[], foods: Partial<Record<FoodKey, GenericFood>>): number | null {
  let total = 0;
  for (const dish of dishes) for (const [key, grams] of dish.items) { const kcal = foods[key]?.nutrients.kcal; if (kcal === null || kcal === undefined) return null; total += kcal * grams / 100; }
  return Math.round(total);
}

export function applyTemplate(data: HealthData, t: DietTemplate, anyDayOfWeek: string, foods: Partial<Record<FoodKey, GenericFood>>, at: string, newId: () => string = newHealthId): {data: HealthData; added: Added; preview: TemplatePreview} {
  const preview = templatePreview(t, anyDayOfWeek), added: Added = {plans: [], savedMeals: [], foods: []};
  const missing = preview.foods.filter(k => !foods[k]);
  if (missing.length) throw Error('The food library could not give every food of this template. Nothing was added.');
  // Everything is built first and checked once at the end (the whole journal's schema), so a large journal stays quick.
  const newFoods: HealthFood[] = [], byKey = new Map<FoodKey, HealthFood>();
  for (const key of preview.foods) {
    const g = foods[key]!, brand = g.sourceName.slice(0, 80), name = g.name.slice(0, 120);
    // One library food per generic food, reused when the library already has it (same name and source, per 100 g).
    const have = data.foods.find(f => f.name === name && f.brand === brand && f.servingGrams === 100);
    if (have) { byKey.set(key, have); continue; }
    const food: HealthFood = {id: newId(), name, brand, servingGrams: 100, nutrients: {...g.nutrients}, createdAt: at, updatedAt: at};
    newFoods.push(food); byKey.set(key, food); added.foods.push(food.id);
  }
  const daily = dailyData(data), savedMeals = [...daily.savedMeals], plans = [...daily.plans];
  const mealOf = new Map<string, (typeof savedMeals)[number]>();
  for (const slot of preview.days.flatMap(d => d.slots)) {
    const name = templateMealName(t, slot.dish);
    let meal = mealOf.get(name) ?? savedMeals.find(m => m.name === name);
    if (!meal) {
      // A food is kept per 100 g, so a portion of `grams` is grams × 10 thousandths of a serving.
      const items = slot.dish.items.map(([key, grams]) => { const food = byKey.get(key)!, snapshot = foodSnapshot(food); return {sourceId: food.id, sourceKind: 'food' as const, quantityMilli: Math.round(grams * 10), snapshot, groceries: [{foodId: food.id, name: food.name, grams, basis: JSON.stringify(snapshot)}]}; });
      meal = {id: newId(), name, items, createdAt: at};
      savedMeals.push(meal); added.savedMeals.push(meal.id);
    }
    mealOf.set(name, meal);
    // The plan exactly as the planner's own saveMealPlan writes it (its test compares the two).
    const id = newId();
    plans.push({id, savedMealId: meal.id, date: slot.date, meal: slot.meal, name: meal.name, items: structuredClone(meal.items), createdAt: at});
    added.plans.push(id);
  }
  const next = healthSchema.parse({...data, foods: [...data.foods, ...newFoods], daily: {...daily, savedMeals, plans}});
  return {data: next, added, preview};
}

/** Takes back one application: its unlogged plans, then its saved meals and foods that nothing else uses. */
export function undoTemplate(data: HealthData, added: Added): {data: HealthData; kept: number} {
  const daily = dailyData(data), dropPlans = new Set(added.plans);
  const plans = daily.plans.filter(p => !dropPlans.has(p.id) || !!p.loggedAt), kept = plans.filter(p => dropPlans.has(p.id)).length;
  const usedMeals = new Set(plans.map(p => p.savedMealId));
  const savedMeals = daily.savedMeals.filter(m => !added.savedMeals.includes(m.id) || usedMeals.has(m.id));
  const used = new Set<string>([
    ...data.diary.map(e => e.sourceId), ...data.recipes.flatMap(r => r.ingredients.map(i => i.foodId)),
    ...savedMeals.flatMap(m => m.items.map(i => i.sourceId)), ...plans.flatMap(p => p.items.map(i => i.sourceId)),
    ...daily.favorites.map(f => f.sourceId),
  ]);
  const foods = data.foods.filter(f => !added.foods.includes(f.id) || used.has(f.id));
  return {data: healthSchema.parse({...data, foods, daily: {...daily, plans, savedMeals}}), kept};
}
