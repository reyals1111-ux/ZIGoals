import {addLocalDays, localWeekday} from '../local-date';
import {foodSnapshot, healthSchema, newHealthId, HEALTH_MEALS, type HealthData, type HealthDiaryEntry} from '../health';
import {dailyData, saveMealFromRecipe, saveMealPlan} from '../health-daily';

/**
 * N5: the week's meal plan from recipes and foods. A plan needs a saved meal (the existing record), so planning a recipe
 * or a food directly first saves a reusable meal of it (once per source; later plans reuse it), then plans it through
 * the existing `saveMealPlan`. The grocery list and one-tap logging are the existing `groceryList` and `logMealPlan`.
 */
export type Meal = HealthDiaryEntry['meal'];
export const weekDays = (anchor: string) => { const start = addLocalDays(anchor, -((localWeekday(anchor) + 6) % 7)); return Array.from({length: 7}, (_, i) => addLocalDays(start, i)); };
export function planFromRecipe(data: HealthData, recipeId: string, date: string, meal: Meal, at: string, planId = newHealthId()): HealthData {
  const existing = dailyData(data).savedMeals.find(m => m.items.length === 1 && m.items[0]!.sourceKind === 'recipe' && m.items[0]!.sourceId === recipeId && m.items[0]!.quantityMilli === 1000);
  let next = data, savedMealId = existing?.id;
  if (!savedMealId) { savedMealId = newHealthId(); next = saveMealFromRecipe(next, savedMealId, recipeId, 1000, at); }
  return saveMealPlan(next, {id: planId, savedMealId, date, meal}, at);
}
export function planFromFood(data: HealthData, foodId: string, quantityMilli: number, date: string, meal: Meal, at: string, planId = newHealthId()): HealthData {
  const food = data.foods.find(f => f.id === foodId); if (!food) throw new Error('Food unavailable.');
  const daily = dailyData(data);
  const existing = daily.savedMeals.find(m => m.items.length === 1 && m.items[0]!.sourceKind === 'food' && m.items[0]!.sourceId === foodId && m.items[0]!.quantityMilli === quantityMilli);
  let next = data, savedMealId = existing?.id;
  if (!savedMealId) {
    savedMealId = newHealthId();
    const snapshot = foodSnapshot(food);
    const groceries = [{foodId: food.id, name: food.name, ...(food.servingGrams !== null ? {grams: food.servingGrams * quantityMilli / 1000} : {grams: null, millilitres: (food.servingMl ?? 0) * quantityMilli / 1000}), basis: JSON.stringify(snapshot)}];
    next = healthSchema.parse({...data, daily: {...daily, savedMeals: [...daily.savedMeals, {id: savedMealId, name: `${food.name}${quantityMilli !== 1000 ? ` × ${quantityMilli / 1000}` : ''}`, items: [{sourceId: food.id, sourceKind: 'food', quantityMilli, snapshot, groceries}], createdAt: at}]}});
  }
  return saveMealPlan(next, {id: planId, savedMealId, date, meal}, at);
}
export type PlannedSlot = {date: string; meal: Meal; plans: ReturnType<typeof dailyData>['plans']};
export function weekPlan(data: HealthData, anchor: string): {days: string[]; slots: PlannedSlot[]} {
  const days = weekDays(anchor), plans = dailyData(data).plans;
  return {days, slots: days.flatMap(date => HEALTH_MEALS.map(meal => ({date, meal, plans: plans.filter(p => p.date === date && p.meal === meal)})))};
}
