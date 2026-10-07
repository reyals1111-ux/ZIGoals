import {HEALTH_MEALS, healthSchema, logHealthItem, type HealthData, type HealthDiaryEntry} from '../health';
import {commitMealCopy, dailyData, diaryMealItems, previewMealCopy} from '../health-daily';
import {addLocalDays} from '../local-date';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {DEFAULT_WATER_SIZES_ML, healthQuickSchema, type HealthQuick} from './schema';

/**
 * Health quick logging (Session W Part 9). Everything here writes ordinary diary and water records through the existing
 * mutators, except the person's own water buttons and pinned items, which live in Health v4 `quick` (one stamped group;
 * the newer edit wins between devices). Nothing is guessed: a copy repeats the exact entries (their nutrition snapshots
 * and quantities), a "usual" item is one this person logged at this meal in the last 30 days, at the amount they last
 * used there.
 */
export type Meal = HealthDiaryEntry['meal'];
export const FL_OZ_ML = 29.5735295625;
const MAX_PINS = 12, USUAL_DAYS = 30;
export const quickIn = (data: HealthData): HealthQuick | undefined => healthGroupIn(data, 'quick');

/** The day before, with its entries per meal (for "Copy yesterday's …" and "Repeat yesterday"). */
export function dayBefore(data: HealthData, date: string): {date: string; meals: Record<Meal, number>; total: number} {
  const prev = addLocalDays(date, -1), meals = Object.fromEntries(HEALTH_MEALS.map(m => [m, 0])) as Record<Meal, number>;
  for (const e of data.diary) if (e.date === prev) meals[e.meal]++;
  return {date: prev, meals, total: Object.values(meals).reduce((a, b) => a + b, 0)};
}
/** One meal of the day before into the same meal of this day, as one copy operation (a second tap with the same id adds nothing). */
export function copyMealFromDayBefore(data: HealthData, date: string, meal: Meal, operationId: string, at: string): HealthData {
  if (dailyData(data).copyOperations.includes(operationId)) return data;
  const items = diaryMealItems(data, addLocalDays(date, -1), meal);
  if (!items.length) throw Error(`Nothing was logged for ${meal.toLowerCase()} the day before.`);
  return commitMealCopy(data, previewMealCopy(items, [date], meal, operationId, at), operationId);
}
/** Every meal of the day before into the same meals of this day, as one copy operation. */
export function repeatDayBefore(data: HealthData, date: string, operationId: string, at: string): HealthData {
  if (dailyData(data).copyOperations.includes(operationId)) return data;
  const prev = addLocalDays(date, -1);
  const preview = HEALTH_MEALS.flatMap((meal, m) => { const items = diaryMealItems(data, prev, meal); return items.length ? previewMealCopy(items, [date], meal, `${operationId}-m${m}`, at) : []; });
  if (!preview.length) throw Error('Nothing was logged the day before.');
  return commitMealCopy(data, preview, operationId);
}

export type QuickItem = {id: string; kind: 'food' | 'recipe'; name: string; quantityMilli: number; count: number};
const libraryItem = (data: HealthData, kind: 'food' | 'recipe', id: string) => kind === 'food' ? data.foods.find(f => f.id === id) : data.recipes.find(r => r.id === id);
/**
 * What this person usually has at this meal: items logged at it in the 30 days before `date`, most often first (then most
 * recent), at the amount last used at this meal; items already at this meal on `date`, or gone from the library, are left out.
 */
export function usualForMeal(data: HealthData, date: string, meal: Meal, limit = 4): QuickItem[] {
  const from = addLocalDays(date, -USUAL_DAYS), today = new Set(data.diary.filter(e => e.date === date && e.meal === meal).map(e => `${e.sourceKind}:${e.sourceId}`));
  const seen = new Map<string, QuickItem & {last: string}>();
  for (const e of data.diary) {
    if (e.meal !== meal || e.date < from || e.date >= date) continue;
    const key = `${e.sourceKind}:${e.sourceId}`, held = seen.get(key), stamp = `${e.date}|${e.createdAt}`;
    if (!held) seen.set(key, {id: e.sourceId, kind: e.sourceKind, name: e.snapshot.name, quantityMilli: e.quantityMilli, count: 1, last: stamp});
    else { held.count++; if (stamp > held.last) { held.last = stamp; held.quantityMilli = e.quantityMilli; } }
  }
  return [...seen.entries()].filter(([key, item]) => !today.has(key) && libraryItem(data, item.kind, item.id))
    .map(([, item]) => ({...item, name: libraryItem(data, item.kind, item.id)!.name}))
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last) || a.name.localeCompare(b.name)).slice(0, limit)
    .map(item => ({id: item.id, kind: item.kind, name: item.name, quantityMilli: item.quantityMilli, count: item.count}));
}
/** The pinned items still in the library, in the order pinned, at the amount last logged anywhere (one serving if never). */
export function pinnedItems(data: HealthData): QuickItem[] {
  return (quickIn(data)?.pinned ?? []).flatMap(p => {
    const item = libraryItem(data, p.sourceKind, p.sourceId);
    if (!item) return [];
    const logged = data.diary.filter(e => e.sourceKind === p.sourceKind && e.sourceId === p.sourceId);
    const last = logged.reduce<HealthDiaryEntry | null>((best, e) => !best || `${e.date}|${e.createdAt}` > `${best.date}|${best.createdAt}` ? e : best, null);
    return [{id: p.sourceId, kind: p.sourceKind, name: item.name, quantityMilli: last?.quantityMilli ?? 1000, count: logged.length}];
  });
}
export const isPinned = (data: HealthData, kind: 'food' | 'recipe', id: string) => !!quickIn(data)?.pinned.some(p => p.sourceKind === kind && p.sourceId === id);
function quickWith(data: HealthData, patch: Partial<Pick<HealthQuick, 'waterSizesMl' | 'pinned'>>, at: string): HealthData {
  const held = quickIn(data), next = healthQuickSchema.parse({version: 1, waterSizesMl: [...(held?.waterSizesMl ?? DEFAULT_WATER_SIZES_ML)], pinned: held?.pinned ?? [], ...patch, updatedAt: at});
  return healthSchema.parse(withHealthGroup(data, 'quick', next, false));
}
/** Pins or unpins a food or recipe as a one-tap item on every meal (at most 12). */
export function setPinned(data: HealthData, kind: 'food' | 'recipe', id: string, pinned: boolean, at: string): HealthData {
  const list = (quickIn(data)?.pinned ?? []).filter(p => !(p.sourceKind === kind && p.sourceId === id));
  if (pinned) {
    if (!libraryItem(data, kind, id)) throw Error('This food or recipe is no longer in your library.');
    if (list.length >= MAX_PINS) throw Error(`You can pin up to ${MAX_PINS} items. Unpin one first.`);
    list.push({sourceId: id, sourceKind: kind});
  } else if (list.length === (quickIn(data)?.pinned.length ?? 0)) return data;
  return quickWith(data, {pinned: list}, at);
}
/** One tap: the item logged at this meal on this day, at the given amount, with its nutrition as the library has it now. */
export function logAgain(data: HealthData, item: Pick<QuickItem, 'id' | 'kind' | 'quantityMilli'>, date: string, meal: Meal, id: string, at: string): HealthData {
  return logHealthItem(data, {id, sourceId: item.id, sourceKind: item.kind, date, meal, quantityMilli: item.quantityMilli}, at);
}

export type WaterButton = {amountMilli: number; unit: 'ml' | 'fl-oz-us'; label: string};
const oz = (ml: number) => Math.round(ml / FL_OZ_ML * 10) / 10;
const ozText = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
/**
 * The water buttons in the person's unit: their own sizes (kept in millilitres; in US fl oz they show and log to a tenth),
 * or, until they choose, 250 and 500 mL (8 and 16 US fl oz), exactly as before.
 */
export function waterButtons(data: HealthData): WaterButton[] {
  const unit = dailyData(data).preferences.waterUnit, sizes = quickIn(data)?.waterSizesMl;
  if (!sizes) return unit === 'ml' ? DEFAULT_WATER_SIZES_ML.map(ml => ({amountMilli: ml * 1000, unit, label: `Add ${ml} mL`})) : [8, 16].map(v => ({amountMilli: v * 1000, unit, label: `Add ${v} US fl oz`}));
  return sizes.map(ml => unit === 'ml' ? {amountMilli: ml * 1000, unit, label: `Add ${ml} mL`} : {amountMilli: Math.round(oz(ml) * 1000), unit, label: `Add ${ozText(oz(ml))} US fl oz`});
}
/** The sizes as the person types them, in their unit ("250, 330, 500" or "8, 12"). */
export function waterSizesText(data: HealthData): string {
  const unit = dailyData(data).preferences.waterUnit;
  return waterButtons(data).map(b => unit === 'ml' ? String(b.amountMilli / 1000) : ozText(b.amountMilli / 1000)).join(', ');
}
/** Saves the person's water buttons from what they typed in their unit: one to six different sizes, 10 mL to 5 L each. */
export function saveWaterSizes(data: HealthData, typed: string, at: string): HealthData {
  const unit = dailyData(data).preferences.waterUnit, parts = typed.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
  if (!parts.length || parts.length > 6) throw Error('Enter one to six sizes, separated by commas.');
  const sizes = parts.map(p => {
    if (!/^\d+(?:[.,]\d+)?$/.test(p)) throw Error(`“${p}” is not a size. Use numbers like ${unit === 'ml' ? '250, 500' : '8, 16'}.`);
    const value = Number(p.replace(',', '.')), ml = Math.round(unit === 'ml' ? value : value * FL_OZ_ML);
    if (ml < 10 || ml > 5000) throw Error(unit === 'ml' ? 'Each size is between 10 and 5,000 mL.' : 'Each size is between 0.4 and 169 US fl oz.');
    return ml;
  });
  if (new Set(sizes).size !== sizes.length) throw Error('Each button needs a different size.');
  return quickWith(data, {waterSizesMl: sizes}, at);
}
/** Back to the usual buttons for the person's unit (250 and 500 mL, or 8 and 16 US fl oz). */
export function resetWaterSizes(data: HealthData, at: string): HealthData {
  if (!quickIn(data)) return data;
  return quickWith(data, {waterSizesMl: dailyData(data).preferences.waterUnit === 'ml' ? [...DEFAULT_WATER_SIZES_ML] : [Math.round(8 * FL_OZ_ML), Math.round(16 * FL_OZ_ML)]}, at);
}
