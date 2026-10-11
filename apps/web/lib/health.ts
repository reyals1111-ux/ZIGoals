import {bodyMeasurementSchema} from "./body-measurement-schema";
import { normalizeDecimalInput } from "./decimal-input";
import {exerciseSchema} from "./health-counters";
import * as z from "zod";
import { addLocalDays } from "./local-date";
import { formatNumber } from "./visual-format";
import { healthGoalsSchema } from "./health-goals/schema";
import { habitHealthLinksSchema, habitHealthLinksV4Schema } from "./habit-health-links/schema";
import { sleepSchema } from "./sleep/schema";
import { meditationSchema } from "./meditation/schema";
import { vitalsSchema } from "./vitals/schema";
import { healthQuickSchema } from "./health-quick/schema";
import { moodsSchema } from "./moods/schema";

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
export const nutritionSchema = z.strictObject({ kcal: integer(1_000_000).nullable(), proteinMg: integer(1_000_000_000).nullable(), carbsMg: integer(1_000_000_000).nullable(), fatMg: integer(1_000_000_000).nullable(),fiberMg:integer(1_000_000_000).optional(),sugarMg:integer(1_000_000_000).optional(),saturatedFatMg:integer(1_000_000_000).optional(),sodiumMg:integer(1_000_000_000).optional(),potassiumMg:integer(1_000_000_000).optional(),calciumMg:integer(1_000_000_000).optional(),ironMg:integer(1_000_000_000).optional() });
export type Nutrition = z.infer<typeof nutritionSchema>;
export const targetsSchema = z.strictObject({
  kcal: integer(100_000, 1).nullable(), proteinMg: integer(10_000_000, 1).nullable(),
  carbsMg: integer(10_000_000, 1).nullable(), fatMg: integer(10_000_000, 1).nullable(),
  weightGrams: bodyGrams.nullable(), steps: integer(1_000_000, 1).nullable(),
});
export type HealthTargets = z.infer<typeof targetsSchema>;
const provenanceSchema=z.strictObject({provider:z.literal("Open Food Facts"),barcode:z.string().regex(/^\d{8,14}$/),apiVersion:z.literal("3.4"),observedAt:stamp,license:z.literal("ODbL-1.0 / DbCL-1.0")});
const yieldSchema=z.strictObject({quantityMilli:integer(100_000_000,1),unit:z.enum(["g","ml"])});
const measureFields={servingGrams:grams.nullable(),servingMl:grams.optional()};
const exclusiveMeasure=(value:{servingGrams:number|null;servingMl?:number})=>value.servingGrams===null||value.servingMl===undefined;
export const foodSchema = z.strictObject({ id: localId, name, brand: z.string().trim().max(80), ...measureFields, nutrients: nutritionSchema, provenance:provenanceSchema.optional(), createdAt: stamp, updatedAt: stamp }).refine(value=>exclusiveMeasure(value)&&(value.servingGrams!==null||value.servingMl!==undefined),"Choose one explicit serving measure: grams or millilitres.");
export type HealthFood = z.infer<typeof foodSchema>;
const snapshotSchema = z.strictObject({ name, ...measureFields, nutrients: nutritionSchema, provenance:provenanceSchema.optional(),recipeVersion:integer(1_000_000,1).optional(),recipeYield:yieldSchema.optional() }).refine(exclusiveMeasure,"Serving mass and volume cannot be inferred from each other.");
const ingredientSchema = z.strictObject({ foodId: localId, snapshot: snapshotSchema, quantityMilli: quantity });
export const recipeSchema = z.strictObject({ id: localId, name, portionsMilli: quantity, revision:integer(1_000_000,1).optional(),yield:yieldSchema.optional(), ingredients: z.array(ingredientSchema).min(1).max(100), createdAt: stamp, updatedAt: stamp });
export type HealthRecipe = z.infer<typeof recipeSchema>;
export const diarySchema = z.strictObject({ id: localId, sourceId: localId, sourceKind: z.enum(["food", "recipe"]), snapshot: snapshotSchema, date: healthDateSchema, meal: z.enum(HEALTH_MEALS), quantityMilli: quantity, createdAt: stamp, updatedAt: stamp });
export type HealthDiaryEntry = z.infer<typeof diarySchema>;
const weightSchema = z.strictObject({ id: localId, date: healthDateSchema, grams: bodyGrams, createdAt: stamp, updatedAt: stamp });
export type HealthWeight = z.infer<typeof weightSchema>;
const activitySchema = z.strictObject({ id: localId, date: healthDateSchema, name, steps: integer(1_000_000), minutes: integer(1440), createdAt: stamp, updatedAt: stamp }).refine(a => a.steps > 0 || a.minutes > 0);
export type HealthActivity = z.infer<typeof activitySchema>;
export const additionalNutrients=[['fiberMg','Fiber','g',1000],['sugarMg','Sugars','g',1000],['saturatedFatMg','Saturated fats','g',1000],['sodiumMg','Sodium','mg',1],['potassiumMg','Potassium','mg',1],['calciumMg','Calcium','mg',1],['ironMg','Iron','mg',1]] as const;
export function additionalNutritionSummary(values:readonly Nutrition[]){return Object.fromEntries(additionalNutrients.map(([key])=>{const known=values.flatMap(n=>n[key]===undefined?[]:[n[key]!]);return [key,{value:known.length?known.reduce((sum,n)=>sum+n,0):null,known:known.length,total:values.length}];})) as Record<typeof additionalNutrients[number][0],{value:number|null;known:number;total:number}>;}
const nutrientKeys = ["kcal", "proteinMg", "carbsMg", "fatMg"] as const;
export type CoreNutrient=typeof nutrientKeys[number];
export function summarizeNutrition(values:readonly Nutrition[]){
 const coverage={} as Record<CoreNutrient,{known:number;total:number}>,nutrients={} as Nutrition,knownNutrients={} as Nutrition;
 for(const key of nutrientKeys){const known=values.flatMap(value=>value[key]===null?[]:[value[key]]);coverage[key]={known:known.length,total:values.length};const sum=known.reduce((total,value)=>total+value,0);nutrients[key]=known.length===values.length?sum:null;knownNutrients[key]=known.length?sum:null;}
 return {nutrients,knownNutrients,coverage};
}
export const formatNutrient=(value:number|null,scale=1)=>value===null?'Unknown':formatNumber((value/scale), {maximumFractionDigits:3});
export function nutritionSummaryText(summary:ReturnType<typeof summarizeNutrition>,key:CoreNutrient,unit:string,scale=1){
 const value=summary.nutrients[key],coverage=summary.coverage[key];
 if(value!==null)return `${formatNutrient(value,scale)} ${unit}`;
 const known=summary.knownNutrients[key];return `${known===null?'Unknown':`${formatNutrient(known,scale)} ${unit} known`} · ${coverage.known}/${coverage.total} entries supplied ${key==='kcal'?'calories':key.replace('Mg','')}`;
}
const roundedRatio = (numerator: bigint, denominator: bigint) => Number((numerator * 2n + denominator) / (denominator * 2n));

/** Positive integer arithmetic, rounded once to the nearest kcal or milligram. */
export function scaleNutrition(nutrients: Nutrition, quantityMilli: number): Nutrition {
  nutritionSchema.parse(nutrients);
  quantity.parse(quantityMilli);
  return nutritionSchema.parse(Object.fromEntries([...nutrientKeys,...additionalNutrients.map(([key])=>key)].filter(key=>nutrients[key]!==undefined).map(key => [key, nutrients[key]===null?null:roundedRatio(BigInt(nutrients[key]!) * BigInt(quantityMilli), 1000n)])));
}

export function recipeNutrition(recipe: HealthRecipe): Nutrition {
  recipeSchema.parse(recipe);
  return nutritionSchema.parse(Object.fromEntries([...nutrientKeys,...additionalNutrients.map(([key])=>key)].filter(key=>recipe.ingredients.every(item=>item.snapshot.nutrients[key]!==undefined)).map(key => [key,
    recipe.ingredients.some(item=>item.snapshot.nutrients[key]===null)?null:roundedRatio(recipe.ingredients.reduce((total, item) => total + BigInt(item.snapshot.nutrients[key]!) * BigInt(item.quantityMilli), 0n), BigInt(recipe.portionsMilli)),
  ])));
}

export function recipeServingGrams(recipe: HealthRecipe): number|null {
  recipeSchema.parse(recipe);
  if(recipe.yield)return recipe.yield.unit==='g'?grams.parse(roundedRatio(BigInt(recipe.yield.quantityMilli),BigInt(recipe.portionsMilli))):null;
  if(recipe.ingredients.some(item=>item.snapshot.servingGrams===null))return null;
  return grams.parse(roundedRatio(recipe.ingredients.reduce((total, item) => total + BigInt(item.snapshot.servingGrams!) * BigInt(item.quantityMilli), 0n), BigInt(recipe.portionsMilli)));
}
export function recipeServingMl(recipe:HealthRecipe):number|undefined {
 recipeSchema.parse(recipe);
 return recipe.yield?.unit==='ml'?grams.parse(roundedRatio(BigInt(recipe.yield.quantityMilli),BigInt(recipe.portionsMilli))):undefined;
}
export function foodSnapshot(food:HealthFood){return snapshotSchema.parse({name:food.name,servingGrams:food.servingGrams,...(food.servingMl!==undefined?{servingMl:food.servingMl}:{}),nutrients:{...food.nutrients},...(food.provenance?{provenance:food.provenance}:{})});}
export function recipeSnapshot(recipe:HealthRecipe){const servingMl=recipeServingMl(recipe);return snapshotSchema.parse({name:recipe.name,servingGrams:recipeServingGrams(recipe),...(servingMl!==undefined?{servingMl}:{}),nutrients:recipeNutrition(recipe),recipeVersion:recipe.revision??1,...(recipe.yield?{recipeYield:recipe.yield}:{})});}
export function formatServingMeasure(value:{servingGrams:number|null;servingMl?:number},quantityMilli=1000){return value.servingGrams!==null?`${formatNutrient(value.servingGrams*quantityMilli/1000)} g`:value.servingMl!==undefined?`${formatNutrient(value.servingMl*quantityMilli/1000)} mL`:'Serving measure unknown';}

export const healthTimezoneSchema = z.string().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}, "Choose a valid IANA timezone, for example Europe/Brussels.");
export const mealItemSchema = diarySchema.pick({ sourceId: true, sourceKind: true, snapshot: true, quantityMilli: true }).extend({
  // Ingredient evidence is captured only when known, never reconstructed from an edited recipe.
  groceries: z.array(z.strictObject({ foodId: localId, name, grams: z.number().finite().positive().max(100_000_000).nullable(), millilitres:z.number().finite().positive().max(100_000_000).optional(), basis: z.string().max(2000) }).refine(value=>(value.grams===null)!==(value.millilitres===undefined),"Choose one ingredient measure.")).max(100).optional(),
});
export const savedMealSchema = z.strictObject({ id: localId, name, items: z.array(mealItemSchema).min(1).max(100), createdAt: stamp });
export const mealPlanSchema = z.strictObject({ id: localId, savedMealId: localId, name, date: healthDateSchema, meal: z.enum(HEALTH_MEALS), items: z.array(mealItemSchema).min(1).max(100), createdAt: stamp, loggedAt: stamp.optional() });
export const waterSchema = z.strictObject({ id: localId, date: healthDateSchema, amountMilli: integer(10_000_000, 1), unit: z.enum(["ml", "fl-oz-us"]), createdAt: stamp, updatedAt: stamp });
export const groceryEditSchema=z.strictObject({from:healthDateSchema,to:healthDateSchema,key:z.string().min(1).max(5000),planIds:z.array(localId).min(1).max(5000),name,quantityMilli:integer(100_000_000_000,1).nullable(),unit:z.enum(['g','ml','item']),checked:z.boolean()}).refine(value=>value.from<=value.to&&new Set(value.planIds).size===value.planIds.length,'Invalid grocery plan scope.');
export const healthDailySchema = z.strictObject({
  version: z.literal(1),
  favorites: z.array(z.strictObject({ sourceId: localId, sourceKind: z.enum(["food", "recipe"]) })).max(1500),
  savedMeals: z.array(savedMealSchema).max(500), plans: z.array(mealPlanSchema).max(5000),
  water: z.array(waterSchema).max(20_000), waterOperations: z.array(localId).max(30_000), copyOperations: z.array(localId).max(20_000),
  preferences: z.strictObject({ timezone: healthTimezoneSchema.nullable(), waterUnit: z.enum(["ml", "fl-oz-us"]), waterTargetMl: integer(100_000, 1).nullable(), weightUnit: z.enum(["kg", "lb"]) }),
  groceryNotes: z.string().max(10_000), groceryEdits:z.array(groceryEditSchema).max(1000).optional(),
});
export type HealthDaily = z.infer<typeof healthDailySchema>;
export type SavedMeal = z.infer<typeof savedMealSchema>;
export type MealItem = z.infer<typeof mealItemSchema>;
export type WaterEntry = z.infer<typeof waterSchema>;

const healthFields = {
  kind: z.literal("zigoals-health"), measurements:z.array(bodyMeasurementSchema).max(20000).optional(), targets: targetsSchema, daily: healthDailySchema.optional(),
  foods: z.array(foodSchema).max(1000), recipes: z.array(recipeSchema).max(500),
  diary: z.array(diarySchema).max(10_000), weights: z.array(weightSchema).max(5000), activity: z.array(activitySchema).max(10_000),
  // Additive (UI design pass): quick exercise counters. Absent in older data; see lib/health-counters.ts.
  exercise: exerciseSchema.optional(),
};
/**
 * Health v2 (Session P, read support only): the synced home of fasting sessions. PR 3 keeps them in the device-only key
 * `zigoals:fasting:v1`; once every device reads v2 they can move here unchanged. Hours and a target only: no streaks,
 * no "longest fast", no calories (owner decision P5).
 */
export const fastingSessionSchema = z.strictObject({ id: z.string().min(1).max(100), startedAt: stamp, endedAt: stamp.nullable(), targetHours: integer(24, 1), timeZone: healthTimezoneSchema, habitId: z.uuid().optional(), note: z.string().max(500).optional(), stoppedBy: z.enum(["person", "limit"]).optional() })
  .refine((s) => s.endedAt === null || s.endedAt >= s.startedAt, "A fast ends after it starts.");
export const fastingSchema = z.strictObject({ version: z.literal(1), sessions: z.array(fastingSessionSchema).max(2000) }).refine((f) => new Set(f.sessions.map((s) => s.id)).size === f.sessions.length, "Duplicate fasting session.");
type HealthFields = z.infer<z.ZodObject<typeof healthFields>>;
const healthRules = (data: HealthFields, ctx: z.core.$RefinementCtx) => {
  const ids = new Set<string>();
  for (const list of [data.foods, data.recipes, data.diary, data.weights, data.activity, data.measurements??[], data.daily?.water ?? [], data.daily?.savedMeals ?? [], data.daily?.plans ?? [], data.exercise?.counters ?? [], data.exercise?.days ?? []]) {
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
    for (const recipe of data.recipes) { recipeNutrition(recipe); recipeServingGrams(recipe); recipeServingMl(recipe); }
    for (const entry of data.diary) scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    for (const meal of [...(data.daily?.savedMeals ?? []), ...(data.daily?.plans ?? [])]) {
      for (const entry of meal.items) scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    }
    for (const list of [data.daily?.waterOperations ?? [], data.daily?.copyOperations ?? []]) {
      if (new Set(list).size !== list.length) throw Error("Duplicate operation.");
    }
  } catch { ctx.addIssue({ code: "custom", message: "Nutrition or serving totals exceed the supported range." }); }
};
/** Health v1 as every build since Session C reads it; exported for the read-support proofs (old reads new). */
export const healthV1Schema = z.strictObject({ schemaVersion: z.literal(1), ...healthFields }).superRefine(healthRules);
/** Health v2: v1's fields plus the optional `fasting` group. Written only once PR 3's fasting sessions move here. */
export const healthV2Schema = z.strictObject({ schemaVersion: z.literal(2), ...healthFields, fasting: fastingSchema.optional() }).superRefine(healthRules);
/** The Health readers of builds #27 and #28 (R1): v2 and v1. Exported for the old-reads-new proofs of Health v3. */
export const healthR1Schema = z.union([healthV2Schema, healthV1Schema]);
export const MAX_REVIEW_HEALTH_NOTES = 520;
/**
 * The weekly review's Health note, one per week keyed by the week's first day (Session U Part 9). The review itself lives
 * in settings v2; only the words a person wrote about their health live here, under the Health consent.
 */
export const reviewHealthNotesSchema = z.strictObject({ version: z.literal(1), notes: z.record(z.iso.date(), z.string().min(1).max(2000)) })
  .refine((r) => Object.keys(r.notes).length <= MAX_REVIEW_HEALTH_NOTES, `Up to ${MAX_REVIEW_HEALTH_NOTES} weekly Health notes.`);
export type ReviewHealthNotes = z.infer<typeof reviewHealthNotesSchema>;
/**
 * Health v3 (Session U Part 9, docs/product/SYNC_HOMES.md): v2 plus the Health-describing records of Session P that
 * sync only inside Health, under the Health consent: health goals (`healthGoals`), habit-health links with their
 * automatic check-in markers (`habitLinks`) and the weekly review's Health notes (`reviewNotes`). Each group is
 * byte-for-byte its device key's record. A section becomes v3 only when one of these groups is first written; builds
 * #27/#28 refuse v3 and keep its bytes.
 */
export const healthV3Schema = z.strictObject({ schemaVersion: z.literal(3), ...healthFields, fasting: fastingSchema.optional(), healthGoals: healthGoalsSchema.optional(), habitLinks: habitHealthLinksSchema.optional(), reviewNotes: reviewHealthNotesSchema.optional() }).superRefine(healthRules);
/** The Health readers of builds #29–#31 (v3, v2, v1), kept as the exact objects above for the old-reads-new proofs of Health v4. */
export const healthR3Schema = z.union([healthV3Schema, healthV2Schema, healthV1Schema]);
/**
 * Health v4 (Session W, docs/product/SYNC_HOMES.md): v3 plus the groups of the new Health features, each its own strict
 * `version: 1` record with caps: `sleep` (nights and naps), `meditation` (sessions, goal, bells), `vitals` (daily
 * resting heart rate and energy from imports and device links), `quick` (water buttons, pinned items) and `moods` (the
 * wrap-up's mood). `habitLinks` may hold the sleep and meditation measures here, and only here. A section becomes v4 only
 * when one of these is first written (`lib/vault/w-homes.ts`); builds #29–#31 refuse v4 and keep its bytes. The new
 * groups have their own ids, outside `healthRules`' cross-list check.
 */
export const HEALTH_V4_GROUPS = ["sleep", "meditation", "vitals", "quick", "moods"] as const;
export const healthV4Schema = z.strictObject({ schemaVersion: z.literal(4), ...healthFields, fasting: fastingSchema.optional(), healthGoals: healthGoalsSchema.optional(), habitLinks: habitHealthLinksV4Schema.optional(), reviewNotes: reviewHealthNotesSchema.optional(), sleep: sleepSchema.optional(), meditation: meditationSchema.optional(), vitals: vitalsSchema.optional(), quick: healthQuickSchema.optional(), moods: moodsSchema.optional() }).superRefine(healthRules);
/** One wide type for every version this build reads (an older record is a v4 record without the newer groups). */
export type HealthData = Omit<z.infer<typeof healthV4Schema>, "schemaVersion"> & { schemaVersion: 1 | 2 | 3 | 4 };
export const healthSchema: z.ZodType<HealthData> = z.union([healthV4Schema, healthV3Schema, healthV2Schema, healthV1Schema]);

export function createEmptyHealth(): HealthData {
  return { schemaVersion: 1, kind: "zigoals-health", targets: { kcal: null, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: null, steps: null }, foods: [], recipes: [], diary: [], weights: [], activity: [] };
}
export function newHealthId(): string { return `health_${crypto.randomUUID()}`; }

/** A decimal comma ("72,5") is read as a decimal point only when it cannot be a thousands separator (shared rule). */
function decimalComma(value: string, scale: 1 | 1000): string {
  if (!value.includes(",") || scale === 1) return value;
  return normalizeDecimalInput(value);
}
/** Parse decimal form values without exponent syntax, implicit defaults, or lost precision. */
export function parseHealthNumber(raw: string, scale: 1 | 1000, min: number, max: number): number {
  const value = decimalComma(raw.trim(), scale);
  const pattern = scale === 1 ? /^\d+$/ : /^\d+(?:\.\d{1,3})?$/;
  if (!pattern.test(value) || value.length > 18) throw new Error("Enter a number within the displayed range.");
  const [whole = "0", fraction = ""] = value.split(".");
  const result = BigInt(whole) * BigInt(scale) + (scale === 1000 ? BigInt(fraction.padEnd(3, "0")) : 0n);
  if (result < BigInt(min) || result > BigInt(max)) throw new Error("Enter a number within the displayed range.");
  return Number(result);
}
export const formatHealthGrams = (mg: number|null) => formatNutrient(mg,1000);

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(existing => existing.id === item.id) ? items.map(existing => existing.id === item.id ? item : existing) : [...items, item];
}
export function saveFood(data: HealthData, food: HealthFood): HealthData {
  const parsed = foodSchema.parse(food);
  const old = data.foods.find(f => f.id === parsed.id);
  return healthSchema.parse({ ...data, foods: upsert(data.foods, { ...parsed, createdAt: old?.createdAt ?? parsed.createdAt }) });
}
const recipeDraftSchema = z.strictObject({ id: localId, name, portionsMilli: quantity, yield:yieldSchema.optional(), items: z.array(z.strictObject({ foodId: localId, quantityMilli: quantity })).min(1).max(100) });
export type RecipeDraft = z.infer<typeof recipeDraftSchema>;
export function saveRecipe(data: HealthData, draft: RecipeDraft, at: string): HealthData {
  const parsed = recipeDraftSchema.parse(draft);
  const old = data.recipes.find(r => r.id === parsed.id);
  const recipe: HealthRecipe = { id: parsed.id, name: parsed.name, portionsMilli: parsed.portionsMilli, revision:(old?.revision??(old?1:0))+1,...(parsed.yield?{yield:parsed.yield}:{}), ingredients: parsed.items.map(item => {
    const food = data.foods.find(f => f.id === item.foodId);
    if (!food) throw new Error("A recipe ingredient is no longer in your food library. Choose it again.");
    return { foodId: food.id, quantityMilli: item.quantityMilli, snapshot: foodSnapshot(food) };
  }), createdAt: old?.createdAt ?? at, updatedAt: at };
  return healthSchema.parse({ ...data, recipes: upsert(data.recipes, recipe) });
}

const logDraftSchema = diarySchema.pick({ id: true, sourceId: true, sourceKind: true, date: true, meal: true, quantityMilli: true });
export type HealthLogDraft = z.infer<typeof logDraftSchema>;
export function logHealthItem(data: HealthData, draft: HealthLogDraft, at: string): HealthData {
  const parsed = logDraftSchema.parse(draft);
  const source = parsed.sourceKind === "food" ? data.foods.find(f => f.id === parsed.sourceId) : data.recipes.find(r => r.id === parsed.sourceId);
  if (!source) throw new Error("This food or recipe is no longer available. Choose it again.");
  const snapshot = "ingredients" in source ? recipeSnapshot(source) : foodSnapshot(source);
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
  const nutrition=summarizeNutrition(entries.map(entry=>scaleNutrition(entry.snapshot.nutrients,entry.quantityMilli)));
  return { ...nutrition, entries: entries.length, steps: activity.reduce((total, a) => total + a.steps, 0), minutes: activity.reduce((total, a) => total + a.minutes, 0) };
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
    ...data.activity.map(a => ({ id: a.id, category: "HEALTH" as const, title: a.name, detail: `${formatNumber(a.steps)} steps · ${a.date}`, at: a.updatedAt, href: "/app/health" })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
