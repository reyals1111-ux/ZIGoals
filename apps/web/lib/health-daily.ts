import { csvSafeCell } from './export/csv-safe';
import {journalTimeZone} from './journal-zone';
import {formatNumber} from './visual-format';
import {additionalNutrients,groceryEditSchema} from './health';
import {
  healthSchema, healthDateSchema, healthTimezoneSchema, savedMealSchema, mealItemSchema,
  diarySchema, waterSchema, recipeSnapshot, recipeServingGrams, recipeServingMl, parseHealthNumber,
  type HealthData, type HealthDaily, type HealthDiaryEntry, type MealItem, type WaterEntry,
} from "./health";

export function dailyData(data: HealthData): HealthDaily {
  return data.daily ?? { version: 1, favorites: [], savedMeals: [], plans: [], water: [], waterOperations: [], copyOperations: [], preferences: { timezone: null, waterUnit: "ml", waterTargetMl: null, weightUnit: "kg" }, groceryNotes: "" };
}
function changeDaily(data: HealthData, daily: HealthDaily): HealthData { return healthSchema.parse({ ...data, daily }); }
export function saveHealthPreferences(data: HealthData, preferences: HealthDaily["preferences"]): HealthData {
  return changeDaily(data, { ...dailyData(data), preferences });
}
export function setFavorite(data: HealthData, sourceKind: "food" | "recipe", sourceId: string, favorite: boolean): HealthData {
  const state = dailyData(data);
  const favorites = state.favorites.filter(f => f.sourceId !== sourceId || f.sourceKind !== sourceKind);
  if (favorite) {
    if (!(sourceKind === "food" ? data.foods : data.recipes).some(f => f.id === sourceId)) throw Error("Item unavailable.");
    favorites.push({ sourceId, sourceKind });
  }
  return changeDaily(data, { ...state, favorites });
}
export function quickPicks(data: HealthData, mode: "recent" | "frequent" | "favorites" | "all", query = "") {
  const counts = new Map<string, { count: number; last: string; quantityMilli: number }>();
  for (const entry of data.diary) {
    const key = `${entry.sourceKind}:${entry.sourceId}`;
    const previous = counts.get(key);
    counts.set(key, { count: (previous?.count ?? 0) + 1, last: previous && previous.last > entry.createdAt ? previous.last : entry.createdAt, quantityMilli: previous && previous.last > entry.createdAt ? previous.quantityMilli : entry.quantityMilli });
  }
  const favorites = dailyData(data).favorites;
  const words = query.slice(0, 200).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return [...data.foods.map(f => ({ id: f.id, name: f.name, brand: f.brand, kind: "food" as const, servingGrams: f.servingGrams,servingMl:f.servingMl })), ...data.recipes.map(r => ({ id: r.id, name: r.name, brand: "", kind: "recipe" as const, servingGrams: recipeServingGrams(r),servingMl:recipeServingMl(r) }))]
    .map(item => ({ ...item, count: counts.get(`${item.kind}:${item.id}`)?.count ?? 0, last: counts.get(`${item.kind}:${item.id}`)?.last ?? "", quantityMilli: counts.get(`${item.kind}:${item.id}`)?.quantityMilli ?? 1000, favorite: favorites.some(f => f.sourceId === item.id && f.sourceKind === item.kind) }))
    .filter(item => words.every(w => `${item.name} ${item.brand}`.toLocaleLowerCase().includes(w)) && (mode === "all" || mode === "favorites" ? mode === "all" || item.favorite : item.count > 0))
    .sort((a, b) => (mode === "frequent" ? b.count - a.count : 0) || (mode === "recent" || mode === "frequent" ? b.last.localeCompare(a.last) : 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .slice(0, 30);
}
export function diaryMealItems(data: HealthData, date: string, meal: HealthDiaryEntry["meal"] | "All"): MealItem[] {
  healthDateSchema.parse(date);
  return data.diary.filter(e => e.date === date && (meal === "All" || e.meal === meal)).map(e => ({ sourceId: e.sourceId, sourceKind: e.sourceKind, snapshot: structuredClone(e.snapshot), quantityMilli: e.quantityMilli,
    ...(e.sourceKind === "food" && (e.snapshot.servingGrams!==null||e.snapshot.servingMl!==undefined) ? { groceries: [{ foodId: e.sourceId, name: e.snapshot.name, ...ingredientMeasure(e.snapshot,e.quantityMilli/1000), basis: JSON.stringify(e.snapshot) }] } : {}),
  }));
}
export function saveMealFromDiary(data: HealthData, id: string, name: string, date: string, meal: HealthDiaryEntry["meal"] | "All", at: string): HealthData {
  return addSavedMeal(data, { id, name, items: diaryMealItems(data, date, meal), createdAt: at });
}
function addSavedMeal(data: HealthData, draft: unknown) {
  const meal = savedMealSchema.parse(draft);
  const state = dailyData(data);
  const old = state.savedMeals.find(m => m.id === meal.id);
  if (old) { if (JSON.stringify({ ...old, createdAt: meal.createdAt }) !== JSON.stringify(meal)) throw Error("Saved meal operation changed."); return data; }
  return changeDaily(data, { ...state, savedMeals: [...state.savedMeals, meal] });
}
export function saveMealFromRecipe(data: HealthData, id: string, recipeId: string, quantityMilli: number, at: string): HealthData {
  const recipe = data.recipes.find(r => r.id === recipeId);
  if (!recipe) throw Error("Recipe unavailable.");
  return addSavedMeal(data, { id, name: recipe.name, items: [{ sourceId: recipe.id, sourceKind: "recipe", quantityMilli,
    snapshot: recipeSnapshot(recipe),
    groceries: recipe.ingredients.map(i => ({ foodId: i.foodId, name: i.snapshot.name, ...ingredientMeasure(i.snapshot,i.quantityMilli/1000*quantityMilli/recipe.portionsMilli), basis: JSON.stringify(i.snapshot) })),
  }], createdAt: at });
}
export function removeSavedMeal(data: HealthData, id: string): HealthData {
  return changeDaily(data, { ...dailyData(data), savedMeals: dailyData(data).savedMeals.filter(m => m.id !== id) });
}
export function previewMealCopy(items: MealItem[], dates: string[], meal: HealthDiaryEntry["meal"], operationId: string, at: string): HealthDiaryEntry[] {
  if (dates.length < 1 || dates.length > 7 || new Set(dates).size !== dates.length || !items.length || items.length > 100) throw Error("Choose one to seven distinct dates and a meal with entries.");
  return dates.flatMap((date, d) => items.map((item, i) => {
    const parsed = mealItemSchema.parse(item);
    return diarySchema.parse({ id: `${operationId}-${d}-${i}`, sourceId: parsed.sourceId, sourceKind: parsed.sourceKind, snapshot: parsed.snapshot, quantityMilli: parsed.quantityMilli, date, meal, createdAt: at, updatedAt: at });
  }));
}
export function commitMealCopy(data: HealthData, preview: HealthDiaryEntry[], operationId: string): HealthData {
  const state = dailyData(data);
  if (state.copyOperations.includes(operationId)) return data;
  if (preview.length < 1 || preview.length > 700 || preview.some(e => !e.id.startsWith(`${operationId}-`))) throw Error("Copy preview is invalid.");
  return healthSchema.parse({ ...data, diary: [...data.diary, ...preview], daily: { ...state, copyOperations: [...state.copyOperations, operationId] } });
}
export function saveMealPlan(data: HealthData, draft: { id: string; savedMealId: string; date: string; meal: HealthDiaryEntry["meal"] }, at: string): HealthData {
  const state = dailyData(data);
  const meal = state.savedMeals.find(m => m.id === draft.savedMealId);
  if (!meal) throw Error("Saved meal unavailable.");
  const old = state.plans.find(p => p.id === draft.id);
  if (old) {
    if (old.savedMealId !== draft.savedMealId || old.date !== draft.date || old.meal !== draft.meal) throw Error("Plan operation changed. Remove it and create a new plan.");
    return data;
  }
  return changeDaily(data, { ...state, plans: [...state.plans, { ...draft, name: meal.name, items: structuredClone(meal.items), createdAt: at }] });
}
export function removeMealPlan(data: HealthData, id: string): HealthData {
  return changeDaily(data, { ...dailyData(data), plans: dailyData(data).plans.filter(p => p.id !== id) });
}
export function logMealPlan(data: HealthData, id: string, at: string): HealthData {
  const plan = dailyData(data).plans.find(p => p.id === id);
  if (!plan) throw Error("Plan unavailable.");
  if (plan.loggedAt) return data;
  const updated = commitMealCopy(data, previewMealCopy(plan.items, [plan.date], plan.meal, id, at), id);
  return changeDaily(updated, { ...dailyData(updated), plans: dailyData(updated).plans.map(p => p.id === id ? { ...p, loggedAt: at } : p) });
}
function ingredientMeasure(snapshot:{servingGrams:number|null;servingMl?:number},factor:number){
 if(snapshot.servingGrams!==null)return {grams:snapshot.servingGrams*factor};
 if(snapshot.servingMl!==undefined)return {grams:null,millilitres:snapshot.servingMl*factor};
 throw Error('Ingredient serving measure unavailable.');
}
export function groceryList(data: HealthData, from: string, to: string) {
  validateRange(from, to);
  const result = new Map<string, { key: string; name: string; grams: number | null; millilitres:number|null; planIds:string[]; note: string }>();
  for (const plan of dailyData(data).plans.filter(p => p.date >= from && p.date <= to && !p.loggedAt)) {
    for (const item of plan.items) {
      if (!item.groceries) {
        const key = `unresolved:${item.sourceId}:${JSON.stringify(item.snapshot)}`;
        result.set(key, { key, name: item.snapshot.name, grams: null, millilitres:null,planIds:[...new Set([...(result.get(key)?.planIds??[]),plan.id])].sort(),note: "Ingredient quantities unavailable in this saved diary snapshot. Add them manually." });
      } else for (const ingredient of item.groceries) {
        const key = `${ingredient.foodId}:${ingredient.grams===null?"ml":"g"}:${ingredient.basis}`;
        const old = result.get(key);
        result.set(key, { key, name: ingredient.name, planIds:[...new Set([...(old?.planIds??[]),plan.id])].sort(), grams: ingredient.grams===null?null:(old?.grams ?? 0) + ingredient.grams, millilitres:ingredient.millilitres===undefined?null:(old?.millilitres??0)+ingredient.millilitres,note: "Recorded ingredient measure; no mass or volume conversion." });
      }
    }
  }
  return [...result.values()].map(row=>{
   const edit=dailyData(data).groceryEdits?.find(e=>e.from===from&&e.to===to&&e.key===row.key&&JSON.stringify(e.planIds)===JSON.stringify(row.planIds));
   return {...row,name:edit?.name??row.name,checked:edit?.checked??false,manual:edit?.quantityMilli?{quantityMilli:edit.quantityMilli,unit:edit.unit}:null};
 }).sort((a, b) => a.name.localeCompare(b.name));
}
export function saveGroceryEdit(data:HealthData,from:string,to:string,key:string,expectedPlanIds:string[],edit:{name:string;quantityMilli:number|null;unit:'g'|'ml'|'item';checked:boolean}):HealthData {
 const row=groceryList(data,from,to).find(row=>row.key===key);
 if(!row||JSON.stringify(row.planIds)!==JSON.stringify(expectedPlanIds))throw Error('These planned ingredients changed. Review the current grocery list again.');
 const parsed=groceryEditSchema.parse({from,to,key,planIds:row.planIds,...edit});
 const daily=dailyData(data),existing=daily.groceryEdits??[];
 const groceryEdits=[...existing.filter(e=>e.planIds.every(id=>daily.plans.some(p=>p.id===id&&!p.loggedAt))&&!(e.from===from&&e.to===to&&e.key===key)),parsed];
 if(groceryEdits.length>1000)throw Error('Grocery correction capacity reached. Remove old planning data before adding a new list.');
 return changeDaily(data,{...daily,groceryEdits});
}
export function saveGroceryNotes(data: HealthData, groceryNotes: string): HealthData { return changeDaily(data, { ...dailyData(data), groceryNotes }); }
export function addWater(data: HealthData, draft: Pick<WaterEntry, "id" | "date" | "amountMilli" | "unit">, at: string): HealthData {
  const item = waterSchema.parse({ ...draft, createdAt: at, updatedAt: at });
  const state = dailyData(data);
  if (state.waterOperations.includes(item.id)) {
    const old = state.water.find(w => w.id === item.id);
    if (old && (old.amountMilli !== item.amountMilli || old.date !== item.date || old.unit !== item.unit)) throw Error("Water operation already accepted. Use Edit to correct it.");
    return data;
  }
  return changeDaily(data, { ...state, water: [...state.water, item], waterOperations: [...state.waterOperations, item.id] });
}
export function editWater(data: HealthData, id: string, patch: Pick<WaterEntry, "date" | "amountMilli" | "unit">, at: string): HealthData {
  const state = dailyData(data);
  if (!state.water.some(w => w.id === id)) throw Error("Water entry unavailable.");
  return changeDaily(data, { ...state, water: state.water.map(w => w.id === id ? { ...w, ...patch, updatedAt: at } : w) });
}
export function removeWater(data: HealthData, id: string): HealthData { return changeDaily(data, { ...dailyData(data), water: dailyData(data).water.filter(w => w.id !== id) }); }
/** Water entries for Activity (Session X P2.1: the Health filter left water out), as the journal shows them. */
export function getWaterActivities(data: HealthData): { id: string; category: "HEALTH"; title: string; detail: string; at: string; href: string }[] {
  return dailyData(data).water.map(w => ({ id: w.id, category: "HEALTH" as const, title: "Water logged", detail: `${formatNumber(w.amountMilli / 1000, { maximumFractionDigits: 2 })} ${w.unit === "ml" ? "mL" : "fl oz"} · ${w.date}`, at: w.updatedAt, href: "/app/health#water" }));
}
export function waterSummary(data: HealthData, date: string) {
  healthDateSchema.parse(date);
  const entries = dailyData(data).water.filter(w => w.date === date);
  const millilitres = Math.round(entries.reduce((sum, w) => sum + w.amountMilli / 1000 * (w.unit === "ml" ? 1 : 29.5735295625), 0) * 1000) / 1000;
  return { entries: entries.length, millilitres, targetMl: dailyData(data).preferences.waterTargetMl };
}
/** The Health journal's zone: the Health zone (an override), then the journal zone (Session W Part 17, T2-A), then the device's. */
export function healthZone(timezone: string | null): string {
  return healthTimezoneSchema.parse(timezone ?? journalTimeZone() ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
}
/** The Health journal's day, in its zone (healthZone). */
export function healthDay(timezone: string | null, now = new Date()): string {
  const zone = healthZone(timezone);
  const parts = new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return healthDateSchema.parse(`${get("year")}-${get("month")}-${get("day")}`);
}
export function bodyWeightGrams(raw: string, unit: "kg" | "lb") {
  const milli = parseHealthNumber(raw, 1000, 1, unit === "kg" ? 1_000_000 : 2_204_622);
  const result = unit === "kg" ? milli : Math.round(milli * 0.45359237);
  if (result < 1 || result > 1_000_000) throw Error("Weight outside supported range.");
  return result;
}
export function servingsFromGrams(raw: string, servingGrams: number|null) {
  const milliGrams = parseHealthNumber(raw, 1000, 1, 100_000_000);
  if (typeof servingGrams!=="number" || !Number.isSafeInteger(servingGrams) || servingGrams < 1) throw Error("Serving weight missing.");
  const result = Math.round(milliGrams / servingGrams);
  if (result < 1 || result > 1_000_000) throw Error("Servings outside supported range.");
  return result;
}
export function servingsFromMeasure(raw:string,snapshot:{servingGrams:number|null;servingMl?:number},unit:'g'|'ml'){
 const amount=unit==='g'?snapshot.servingGrams:snapshot.servingMl;
 if(amount===null||amount===undefined)throw Error(`This serving has no measured ${unit==='g'?'weight':'volume'}. Use servings or the recorded unit; density is not inferred.`);
 return servingsFromGrams(raw,amount);
}
function validateRange(from: string, to: string) { healthDateSchema.parse(from); healthDateSchema.parse(to); if (from > to) throw Error("End date precedes start date."); }
const csvCell = (value: string | number) => csvSafeCell(value);
export function exportHealthCsv(data: HealthData, from: string, to: string): string {
  validateRange(from, to); healthSchema.parse(data);
  const rows: (string | number)[][] = [["record_id", "date", "kind", "name", "meal", "quantity", "unit", "serving_weight_g", "kcal_per_serving", "protein_mg_per_serving", "carbs_mg_per_serving", "fat_mg_per_serving", "source", "created_at_utc", "updated_at_utc"]];
  const inRange = (item: { date: string }) => item.date >= from && item.date <= to;
  for (const e of data.diary.filter(inRange)) rows.push([e.id, e.date, "diary", e.snapshot.name, e.meal, e.quantityMilli / 1000, "servings", e.snapshot.servingGrams??"unknown", e.snapshot.nutrients.kcal??"unknown", e.snapshot.nutrients.proteinMg??"unknown", e.snapshot.nutrients.carbsMg??"unknown", e.snapshot.nutrients.fatMg??"unknown", `manual ${e.sourceKind} snapshot`, e.createdAt, e.updatedAt]);
  for (const w of data.weights.filter(inRange)) rows.push([w.id, w.date, "weight", "Body weight", "", w.grams, "g", "", "", "", "", "", "manual", w.createdAt, w.updatedAt]);
  for (const a of data.activity.filter(inRange)) for (const unit of ["steps", "minutes"] as const) rows.push([a.id, a.date, "activity", a.name, "", a[unit], unit, "", "", "", "", "", "manual", a.createdAt, a.updatedAt]);
  for (const w of dailyData(data).water.filter(inRange)) rows.push([w.id, w.date, "water", "Water", "", w.amountMilli / 1000, w.unit, "", "", "", "", "", "manual", w.createdAt, w.updatedAt]);
  rows[0]!.push("serving_volume_ml","recipe_version","recipe_yield_quantity","recipe_yield_unit",...additionalNutrients.map(([key])=>key.replace(/Mg$/, "_mg_per_serving")));
  const diaryById=new Map(data.diary.map(e=>[e.id,e]));for(const row of rows.slice(1)){const entry=row[2]==='diary'?diaryById.get(String(row[0])):undefined;row.push(entry?.snapshot.servingMl??"",entry?.snapshot.recipeVersion??"",entry?.snapshot.recipeYield?entry.snapshot.recipeYield.quantityMilli/1000:"",entry?.snapshot.recipeYield?.unit??"",...additionalNutrients.map(([key])=>entry?.snapshot.nutrients[key]??""));}
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
