import { z } from "zod";
import { addLocalDays } from "./local-date";

export const HEALTH_STORAGE_KEY = "zigoals:health:v1";
export const HEALTH_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
const localId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
const name = z.string().trim().min(1).max(120);
const stamp = z.iso.datetime();
export const healthDateSchema = z.iso.date().refine(d => d >= "1900-01-01" && d <= "2199-12-31");
const integer = (max: number, min = 0) => z.number().int().min(min).max(max);
const quantity = integer(1_000_000, 1);
const grams = integer(100_000, 1);
const bodyGrams = integer(1_000_000, 1);
export const nutritionSchema = z.strictObject({ kcal: integer(1_000_000), proteinMg: integer(1_000_000_000), carbsMg: integer(1_000_000_000), fatMg: integer(1_000_000_000) });
export type Nutrition = z.infer<typeof nutritionSchema>;
export const targetsSchema = z.strictObject({
  kcal: integer(100_000, 1).nullable(), proteinMg: integer(10_000_000, 1).nullable(),
  carbsMg: integer(10_000_000, 1).nullable(), fatMg: integer(10_000_000, 1).nullable(),
  weightGrams: bodyGrams.nullable(), steps: integer(1_000_000, 1).nullable(),
});
export type HealthTargets = z.infer<typeof targetsSchema>;
export const foodSchema = z.strictObject({ id: localId, name, brand: z.string().trim().max(80), servingGrams: grams, nutrients: nutritionSchema, createdAt: stamp, updatedAt: stamp });
export type HealthFood = z.infer<typeof foodSchema>;
const snapshotSchema = z.strictObject({ name, servingGrams: grams, nutrients: nutritionSchema });
const ingredientSchema = z.strictObject({ foodId: localId, snapshot: snapshotSchema, quantityMilli: quantity });
export const recipeSchema = z.strictObject({ id: localId, name, portionsMilli: quantity, ingredients: z.array(ingredientSchema).min(1).max(100), createdAt: stamp, updatedAt: stamp });
export type HealthRecipe = z.infer<typeof recipeSchema>;
export const diarySchema = z.strictObject({ id: localId, sourceId: localId, sourceKind: z.enum(["food", "recipe"]), snapshot: snapshotSchema, date: healthDateSchema, meal: z.enum(HEALTH_MEALS), quantityMilli: quantity, createdAt: stamp, updatedAt: stamp });
export type HealthDiaryEntry = z.infer<typeof diarySchema>;
const weightSchema = z.strictObject({ id: localId, date: healthDateSchema, grams: bodyGrams, createdAt: stamp, updatedAt: stamp });
export type HealthWeight = z.infer<typeof weightSchema>;
const activitySchema = z.strictObject({ id: localId, date: healthDateSchema, name, steps: integer(1_000_000), minutes: integer(1440), createdAt: stamp, updatedAt: stamp }).refine(a => a.steps > 0 || a.minutes > 0);
export type HealthActivity = z.infer<typeof activitySchema>;
const nutrientKeys = ["kcal", "proteinMg", "carbsMg", "fatMg"] as const;
const zeroNutrition = (): Nutrition => ({ kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0 });
const roundedRatio = (numerator: bigint, denominator: bigint) => Number((numerator * 2n + denominator) / (denominator * 2n));

/** Positive integer arithmetic, rounded once to the nearest kcal or milligram. */
export function scaleNutrition(nutrients: Nutrition, quantityMilli: number): Nutrition {
  nutritionSchema.parse(nutrients);
  quantity.parse(quantityMilli);
  return nutritionSchema.parse(Object.fromEntries(nutrientKeys.map(key => [key, roundedRatio(BigInt(nutrients[key]) * BigInt(quantityMilli), 1000n)])));
}

export function recipeNutrition(recipe: HealthRecipe): Nutrition {
  recipeSchema.parse(recipe);
  return nutritionSchema.parse(Object.fromEntries(nutrientKeys.map(key => [key,
    roundedRatio(recipe.ingredients.reduce((total, item) => total + BigInt(item.snapshot.nutrients[key]) * BigInt(item.quantityMilli), 0n), BigInt(recipe.portionsMilli)),
  ])));
}

export function recipeServingGrams(recipe: HealthRecipe): number {
  recipeSchema.parse(recipe);
  return grams.parse(roundedRatio(recipe.ingredients.reduce((total, item) => total + BigInt(item.snapshot.servingGrams) * BigInt(item.quantityMilli), 0n), BigInt(recipe.portionsMilli)));
}

export const healthTimezoneSchema = z.string().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}, "Choose a valid IANA timezone, for example Europe/Brussels.");
export const mealItemSchema = diarySchema.pick({ sourceId: true, sourceKind: true, snapshot: true, quantityMilli: true }).extend({
  // Ingredient evidence is captured only when known, never reconstructed from an edited recipe.
  groceries: z.array(z.strictObject({ foodId: localId, name, grams: z.number().finite().positive().max(100_000_000), basis: z.string().max(2000) })).max(100).optional(),
});
export const savedMealSchema = z.strictObject({ id: localId, name, items: z.array(mealItemSchema).min(1).max(100), createdAt: stamp });
export const mealPlanSchema = z.strictObject({ id: localId, savedMealId: localId, name, date: healthDateSchema, meal: z.enum(HEALTH_MEALS), items: z.array(mealItemSchema).min(1).max(100), createdAt: stamp, loggedAt: stamp.optional() });
export const waterSchema = z.strictObject({ id: localId, date: healthDateSchema, amountMilli: integer(10_000_000, 1), unit: z.enum(["ml", "fl-oz-us"]), createdAt: stamp, updatedAt: stamp });
export const healthDailySchema = z.strictObject({
  version: z.literal(1),
  favorites: z.array(z.strictObject({ sourceId: localId, sourceKind: z.enum(["food", "recipe"]) })).max(1500),
  savedMeals: z.array(savedMealSchema).max(500), plans: z.array(mealPlanSchema).max(5000),
  water: z.array(waterSchema).max(20_000), waterOperations: z.array(localId).max(30_000), copyOperations: z.array(localId).max(20_000),
  preferences: z.strictObject({ timezone: healthTimezoneSchema.nullable(), waterUnit: z.enum(["ml", "fl-oz-us"]), waterTargetMl: integer(100_000, 1).nullable(), weightUnit: z.enum(["kg", "lb"]) }),
  groceryNotes: z.string().max(10_000),
});
export type HealthDaily = z.infer<typeof healthDailySchema>;
export type SavedMeal = z.infer<typeof savedMealSchema>;
export type MealItem = z.infer<typeof mealItemSchema>;
export type WaterEntry = z.infer<typeof waterSchema>;

export const healthSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal("zigoals-health"), targets: targetsSchema, daily: healthDailySchema.optional(),
  foods: z.array(foodSchema).max(1000), recipes: z.array(recipeSchema).max(500),
  diary: z.array(diarySchema).max(10_000), weights: z.array(weightSchema).max(5000), activity: z.array(activitySchema).max(10_000),
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  for (const list of [data.foods, data.recipes, data.diary, data.weights, data.activity, data.daily?.water ?? [], data.daily?.savedMeals ?? [], data.daily?.plans ?? []]) {
    for (const item of list) {
      if (ids.has(item.id)) ctx.addIssue({ code: "custom", message: "Duplicate health record ID." });
      ids.add(item.id);
    }
  }
  const dates = new Set<string>();
  for (const item of data.weights) {
    if (dates.has(item.date)) ctx.addIssue({ code: "custom", message: "Only one weight reading is allowed per date." });
    dates.add(item.date);
  }
  try {
    for (const recipe of data.recipes) { recipeNutrition(recipe); recipeServingGrams(recipe); }
    for (const entry of data.diary) scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    for (const meal of [...(data.daily?.savedMeals ?? []), ...(data.daily?.plans ?? [])]) {
      for (const entry of meal.items) scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    }
    for (const list of [data.daily?.waterOperations ?? [], data.daily?.copyOperations ?? []]) {
      if (new Set(list).size !== list.length) throw Error("Duplicate operation.");
    }
  } catch { ctx.addIssue({ code: "custom", message: "Nutrition or serving totals exceed the supported range." }); }
});
export type HealthData = z.infer<typeof healthSchema>;

export function createEmptyHealth(): HealthData {
  return { schemaVersion: 1, kind: "zigoals-health", targets: { kcal: null, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: null, steps: null }, foods: [], recipes: [], diary: [], weights: [], activity: [] };
}
export function newHealthId(): string { return `health_${crypto.randomUUID()}`; }

/** Parse decimal form values without exponent syntax, implicit defaults, or lost precision. */
export function parseHealthNumber(raw: string, scale: 1 | 1000, min: number, max: number): number {
  const value = raw.trim();
  const pattern = scale === 1 ? /^\d+$/ : /^\d+(?:\.\d{1,3})?$/;
  if (!pattern.test(value) || value.length > 18) throw new Error("Enter a number within the displayed range.");
  const [whole = "0", fraction = ""] = value.split(".");
  const result = BigInt(whole) * BigInt(scale) + (scale === 1000 ? BigInt(fraction.padEnd(3, "0")) : 0n);
  if (result < BigInt(min) || result > BigInt(max)) throw new Error("Enter a number within the displayed range.");
  return Number(result);
}
export const formatHealthGrams = (mg: number) => (mg / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(existing => existing.id === item.id) ? items.map(existing => existing.id === item.id ? item : existing) : [...items, item];
}
export function saveFood(data: HealthData, food: HealthFood): HealthData {
  const parsed = foodSchema.parse(food);
  const old = data.foods.find(f => f.id === parsed.id);
  return healthSchema.parse({ ...data, foods: upsert(data.foods, { ...parsed, createdAt: old?.createdAt ?? parsed.createdAt }) });
}
const recipeDraftSchema = z.strictObject({ id: localId, name, portionsMilli: quantity, items: z.array(z.strictObject({ foodId: localId, quantityMilli: quantity })).min(1).max(100) });
export type RecipeDraft = z.infer<typeof recipeDraftSchema>;
export function saveRecipe(data: HealthData, draft: RecipeDraft, at: string): HealthData {
  const parsed = recipeDraftSchema.parse(draft);
  const old = data.recipes.find(r => r.id === parsed.id);
  const recipe: HealthRecipe = { id: parsed.id, name: parsed.name, portionsMilli: parsed.portionsMilli, ingredients: parsed.items.map(item => {
    const food = data.foods.find(f => f.id === item.foodId);
    if (!food) throw new Error("A recipe ingredient is no longer in your food library. Choose it again.");
    return { foodId: food.id, quantityMilli: item.quantityMilli, snapshot: { name: food.name, servingGrams: food.servingGrams, nutrients: { ...food.nutrients } } };
  }), createdAt: old?.createdAt ?? at, updatedAt: at };
  return healthSchema.parse({ ...data, recipes: upsert(data.recipes, recipe) });
}

const logDraftSchema = diarySchema.pick({ id: true, sourceId: true, sourceKind: true, date: true, meal: true, quantityMilli: true });
export type HealthLogDraft = z.infer<typeof logDraftSchema>;
export function logHealthItem(data: HealthData, draft: HealthLogDraft, at: string): HealthData {
  const parsed = logDraftSchema.parse(draft);
  const source = parsed.sourceKind === "food" ? data.foods.find(f => f.id === parsed.sourceId) : data.recipes.find(r => r.id === parsed.sourceId);
  if (!source) throw new Error("This food or recipe is no longer available. Choose it again.");
  const snapshot = "ingredients" in source ? { name: source.name, servingGrams: recipeServingGrams(source), nutrients: recipeNutrition(source) } : { name: source.name, servingGrams: source.servingGrams, nutrients: { ...source.nutrients } };
  return healthSchema.parse({ ...data, diary: [...data.diary, { ...parsed, snapshot, createdAt: at, updatedAt: at }] });
}
const diaryEditSchema = diarySchema.pick({ date: true, meal: true, quantityMilli: true });
export function editDiaryEntry(data: HealthData, id: string, edit: z.infer<typeof diaryEditSchema>, at: string): HealthData {
  if (!data.diary.some(e => e.id === id)) throw new Error("This diary entry was removed. Refresh and try again.");
  const parsed = diaryEditSchema.parse(edit);
  return healthSchema.parse({ ...data, diary: data.diary.map(entry => entry.id === id ? { ...entry, ...parsed, updatedAt: at } : entry) });
}
export function removeHealthItem(data: HealthData, collection: "foods" | "recipes" | "diary" | "weights" | "activity", id: string): HealthData {
  return healthSchema.parse({ ...data, [collection]: data[collection].filter(item => item.id !== id) });
}
export function setHealthTargets(data: HealthData, targets: HealthTargets): HealthData {
  return healthSchema.parse({ ...data, targets: targetsSchema.parse(targets) });
}
const weightDraftSchema = weightSchema.pick({ id: true, date: true, grams: true });
export function saveWeight(data: HealthData, draft: z.infer<typeof weightDraftSchema>, at: string): HealthData {
  const parsed = weightDraftSchema.parse(draft);
  const old = data.weights.find(w => w.date === parsed.date);
  const weight = { ...parsed, id: old?.id ?? parsed.id, createdAt: old?.createdAt ?? at, updatedAt: at };
  return healthSchema.parse({ ...data, weights: upsert(data.weights, weight) });
}
export function saveActivity(data: HealthData, draft: Pick<HealthActivity, "id" | "date" | "name" | "steps" | "minutes">, at: string): HealthData {
  const old = data.activity.find(a => a.id === draft.id);
  const item = activitySchema.parse({ ...draft, createdAt: old?.createdAt ?? at, updatedAt: at });
  return healthSchema.parse({ ...data, activity: upsert(data.activity, item) });
}

export function searchFoods(foods: HealthFood[], query: string): HealthFood[] {
  const words = query.slice(0, 200).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return foods.filter(food => words.every(word => `${food.name} ${food.brand}`.toLocaleLowerCase().includes(word))).sort((a, b) => a.name.localeCompare(b.name));
}
export function dailyHealthSummary(data: HealthData, date: string) {
  healthDateSchema.parse(date);
  const entries = data.diary.filter(e => e.date === date);
  const activity = data.activity.filter(a => a.date === date);
  const nutrients = entries.reduce((total, entry) => {
    const value = scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    for (const key of nutrientKeys) total[key] += value[key];
    return total;
  }, zeroNutrition());
  return { nutrients, entries: entries.length, steps: activity.reduce((total, a) => total + a.steps, 0), minutes: activity.reduce((total, a) => total + a.minutes, 0) };
}
export function healthHistory(data: HealthData, endDate: string, days = 7) {
  healthDateSchema.parse(endDate);
  integer(366, 1).parse(days);
  return Array.from({ length: days }, (_, i) => addLocalDays(endDate, i - days + 1))
    .filter(date => date >= "1900-01-01")
    .map(date => ({ date, ...dailyHealthSummary(data, date), weightGrams: data.weights.find(w => w.date === date)?.grams ?? null }));
}
export function weightTrend(data: HealthData, endDate: string) {
  healthDateSchema.parse(endDate);
  const start = addLocalDays(endDate, -29);
  const readings = data.weights.filter(w => w.date <= endDate && w.date >= start).sort((a, b) => a.date.localeCompare(b.date));
  const first = readings[0];
  const last = readings.at(-1);
  return { readings, count: readings.length, latestGrams: last?.grams ?? null, changeGrams: last && first && readings.length > 1 ? last.grams - first.grams : null, averageGrams: readings.length ? Math.round(readings.reduce((total, w) => total + w.grams, 0) / readings.length) : null };
}
export function getHealthActivities(data: HealthData): { id: string; category: "HEALTH"; title: string; detail: string; at: string; href: string }[] {
  return [
    ...data.diary.map(e => ({ id: e.id, category: "HEALTH" as const, title: `${e.meal} logged`, detail: `${e.snapshot.name} · ${e.date}`, at: e.updatedAt, href: "/app/health" })),
    ...data.weights.map(w => ({ id: w.id, category: "HEALTH" as const, title: "Weight recorded", detail: `${formatHealthGrams(w.grams)} kg · ${w.date}`, at: w.updatedAt, href: "/app/health" })),
    ...data.activity.map(a => ({ id: a.id, category: "HEALTH" as const, title: a.name, detail: `${a.steps.toLocaleString()} steps · ${a.date}`, at: a.updatedAt, href: "/app/health" })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
