import type {HealthData, HealthDiaryEntry} from '../health';
import {commitMealCopy, dailyData, diaryMealItems, previewMealCopy, saveMealFromDiary} from '../health-daily';
import {diaryDayIssue} from '../health-day';
import {updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {isInvisibleName} from '../visible-text';
import {DEVICE_RECORD_EVENT} from './day-target';
import {EXTRA_MEAL_NAME_MAX, isExtraChoice, sectionOf, storedMealOf, type DiaryMeal, type ExtraMealKey, type ExtraMeals, type MealChoice} from './extra-meals-lite';
import {FOOD_PLUS, foodPlusSchema, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #197): the writes behind the two extra diary meals (lib/food-plus/extra-meals-lite.ts
 * says the model). Every function validates the whole food-plus record it returns; nothing here touches the strict diary
 * except through its own functions (an entry in an extra meal is an ordinary Snacks entry).
 */
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
type Part = NonNullable<FoodPlus['extraMeals']>;
const withPart = (r: FoodPlus, part: Part): FoodPlus => {
  const slots = part.slots && Object.keys(part.slots).length ? part.slots : undefined, entries = part.entries && Object.keys(part.entries).length ? part.entries : undefined;
  const {extraMeals: _old, ...rest} = r; void _old;
  return foodPlusSchema.parse(slots || entries ? {...rest, extraMeals: {...(r.extraMeals ?? {}), slots, entries}} : rest);
};

export type ExtraSlotIssue = {field: 'name' | 'time' | 'kcal'; message: string};
/**
 * Names an extra meal (and its usual time, calorie target and the meal it shows after), or takes it off with a blank
 * name. Taking it off keeps which entries were in it, so its entries show in Snacks until it is named again.
 */
export function setExtraSlot(r: FoodPlus, key: ExtraMealKey, input: {name: string; time: string; kcal: string; after: DiaryMeal}): {ok: true; value: FoodPlus} | {ok: false; issue: ExtraSlotIssue} {
  const name = input.name.replace(/\s+/g, ' ').trim(), time = input.time.trim(), kcalText = input.kcal.trim().replace(/[.,\s](?=\d{3}\b)/g, '');
  if (name && isInvisibleName(name)) return {ok: false, issue: {field: 'name', message: 'Type a name with letters or numbers, or leave it blank.'}};
  if (name.length > EXTRA_MEAL_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${EXTRA_MEAL_NAME_MAX} characters or fewer.`}};
  if (!name && (time || kcalText)) return {ok: false, issue: {field: 'name', message: 'Give this meal a name first; its time and target belong to it.'}};
  if (time && !CLOCK.test(time)) return {ok: false, issue: {field: 'time', message: 'Enter a time like 15:30, or leave it blank.'}};
  if (kcalText && (!/^\d+$/.test(kcalText) || Number(kcalText) < 1 || Number(kcalText) > 10_000)) return {ok: false, issue: {field: 'kcal', message: 'Enter a calorie target from 1 to 10,000 kcal for this meal, or leave it blank.'}};
  const slots = {...(r.extraMeals?.slots ?? {})};
  if (name) slots[key] = {name, after: input.after, ...(time ? {time} : {}), ...(kcalText ? {kcal: Number(kcalText)} : {})};
  else delete slots[key];
  return {ok: true, value: withPart(r, {...r.extraMeals, slots})};
}

/** Puts entries in an extra meal (`key`) or back in their stored meal (null). With `liveIds`, tags of gone entries are dropped. */
export function tagEntries(r: FoodPlus, ids: readonly string[], key: ExtraMealKey | null, liveIds?: ReadonlySet<string>): FoodPlus {
  const entries: Record<string, string> = {...(r.extraMeals?.entries ?? {})};
  for (const id of ids) { if (key) entries[id] = key; else delete entries[id]; }
  if (liveIds) for (const id of Object.keys(entries)) if (!ids.includes(id) && !liveIds.has(id)) delete entries[id];
  return withPart(r, {...r.extraMeals, entries});
}
/** Several tags at once (a copied day's entries keep their extra meal). */
export function tagEach(r: FoodPlus, tags: Readonly<Record<string, ExtraMealKey>>): FoodPlus {
  return Object.keys(tags).length ? withPart(r, {...r.extraMeals, entries: {...(r.extraMeals?.entries ?? {}), ...tags}}) : r;
}

/** Writes tags on this device and tells every reader on the page; false when the device would not keep them. */
export function writeExtraTags(change: (r: FoodPlus) => FoodPlus, storage: Pick<Storage, 'getItem' | 'setItem'> = getAppStorage()): boolean {
  try {
    updateDeviceRecord(storage, FOOD_PLUS, change);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DEVICE_RECORD_EVENT, {detail: FOOD_PLUS.key}));
    return true;
  } catch { return false; }
}

/**
 * After a copy of a day's or a meal's entries ("Repeat yesterday", "Copy yesterday's snacks"), the extra meal of each
 * copied Snacks entry, for its copy: the new Snacks entries on `to` are paired, in order, with the Snacks entries of
 * `from`, and only when every pair is the same food at the same amount (so a one-tap log is never taken for a copy).
 */
export function carriedTags(before: HealthData, after: HealthData, from: string, to: string, storedTags: Readonly<Record<string, string>>): Record<string, ExtraMealKey> {
  const had = new Set(before.diary.map(e => e.id)), same = (a: HealthDiaryEntry, b: HealthDiaryEntry) => a.sourceId === b.sourceId && a.sourceKind === b.sourceKind && a.quantityMilli === b.quantityMilli && JSON.stringify(a.snapshot) === JSON.stringify(b.snapshot);
  const added = after.diary.filter(e => !had.has(e.id) && e.date === to && e.meal === 'Snacks');
  const source = before.diary.filter(e => e.date === from && e.meal === 'Snacks');
  if (!added.length || added.length !== source.length || !added.every((e, i) => same(e, source[i]!))) return {};
  const out: Record<string, ExtraMealKey> = {};
  added.forEach((e, i) => { const tag = storedTags[source[i]!.id]; if (tag === 'extra1' || tag === 'extra2') out[e.id] = tag; });
  return out;
}

/** "Save this meal" for the entries one Diary section shows (Snacks without its extra meals, or one extra meal). */
export function saveMealFromEntries(data: HealthData, id: string, name: string, date: string, entryIds: readonly string[], at: string): HealthData {
  const ids = new Set(entryIds), saved = saveMealFromDiary({...data, diary: data.diary.filter(e => ids.has(e.id))}, id, name, date, 'All', at);
  return {...data, daily: saved.daily};
}

/**
 * "Copy a meal to another day or meal" between Diary sections: the entries the `from` section shows (Snacks without its
 * extra meals, or one extra meal), copied exactly as logged into the stored meal of `to` (the same copy write as
 * lib/health-quick/quick.ts copyMealTo, once per operation id). Returns the copies' ids, for their extra-meal tag when
 * `to` is one. Snacks and an extra meal on the same day may copy into each other (they are different sections).
 */
export function copySection(data: HealthData, x: ExtraMeals, from: {date: string; choice: MealChoice}, to: {date: string; choice: MealChoice}, operationId: string, at: string, today: string): {data: HealthData; added: string[]} {
  if (dailyData(data).copyOperations.includes(operationId)) return {data, added: []};
  if (from.date === to.date && from.choice === to.choice) throw Error('Choose another day or another meal to copy to.');
  const issue = diaryDayIssue(to.date, today);
  if (issue) throw Error(issue);
  const shown = new Set(data.diary.filter(e => e.date === from.date && sectionOf(e, x) === from.choice).map(e => e.id));
  const items = diaryMealItems({...data, diary: data.diary.filter(e => shown.has(e.id))}, from.date, storedMealOf(from.choice));
  if (!items.length) throw Error('Nothing was logged for that meal on that day.');
  const next = commitMealCopy(data, previewMealCopy(items, [to.date], storedMealOf(to.choice), operationId, at), operationId);
  const had = new Set(data.diary.map(e => e.id));
  return {data: next, added: isExtraChoice(to.choice) ? next.diary.filter(e => !had.has(e.id)).map(e => e.id) : []};
}
