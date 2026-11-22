import type {HealthTargets} from '../health';
import {dayTargets, type WeekdayTargets} from './day-target';
import {foodPlusSchema, WEEKDAY_KEYS, type DayTarget, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #88, #97, #107): writing the targets by weekday, and the sugar alcohols per food. Pure.
 * A blank field keeps the Targets' own value for that day; nothing is suggested.
 */
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
export type WeekdayDraft = Record<WeekdayKey, {kcal: string; proteinG: string; carbsG: string; fatG: string}>;
export const WEEKDAY_ORDER: readonly WeekdayKey[] = ['1', '2', '3', '4', '5', '6', '0'];
export type WeekdayIssue = {day: WeekdayKey; field: keyof WeekdayDraft[WeekdayKey]; message: string};
const FIELDS = {kcal: [1, 100_000, 'kcal'], proteinG: [0, 5000, 'g protein'], carbsG: [0, 5000, 'g carbs'], fatG: [0, 5000, 'g fat']} as const;
export const emptyWeekdayDraft = (record: FoodPlus | null | undefined): WeekdayDraft =>
  Object.fromEntries(WEEKDAY_KEYS.map(k => { const d = record?.weekdays?.[k]; return [k, {kcal: d?.kcal?.toString() ?? '', proteinG: d?.proteinG?.toString() ?? '', carbsG: d?.carbsG?.toString() ?? '', fatG: d?.fatG?.toString() ?? ''}]; })) as WeekdayDraft;
/** The draft as a record, or the first field that does not read (whole numbers only, in range). */
export function saveWeekdays(record: FoodPlus, draft: WeekdayDraft): {ok: true; value: FoodPlus} | {ok: false; issue: WeekdayIssue} {
  const weekdays: Partial<Record<WeekdayKey, DayTarget>> = {};
  for (const day of WEEKDAY_ORDER) {
    const row: DayTarget = {};
    for (const field of Object.keys(FIELDS) as (keyof typeof FIELDS)[]) {
      const text = draft[day][field].trim().replace(/[\s.,](?=\d{3}\b)/g, '');
      if (!text) continue;
      const [min, max, unit] = FIELDS[field];
      if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) return {ok: false, issue: {day, field, message: `Enter a whole number from ${min} to ${max.toLocaleString('en-US')} ${unit}, or leave it blank.`}};
      row[field] = Number(text);
    }
    if (Object.keys(row).length) weekdays[day] = row;
  }
  const {weekdays: _old, ...rest} = record; void _old;
  return {ok: true, value: foodPlusSchema.parse(Object.keys(weekdays).length ? {...rest, weekdays} : rest)};
}
/** Monday's row copied to Tuesday–Friday (MyFitnessPal's "apply to weekdays"). */
export const mondayToWeekdays = (draft: WeekdayDraft): WeekdayDraft => ({...draft, '2': {...draft['1']}, '3': {...draft['1']}, '4': {...draft['1']}, '5': {...draft['1']}});
/** The week's calories by these targets, Monday to Sunday (null when a day has no calorie target at all). */
export function weekCalories(base: HealthTargets, weekdays: WeekdayTargets, monday: string): number | null {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${monday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
    const kcal = dayTargets(base, d.toISOString().slice(0, 10), weekdays).kcal;
    if (kcal === null) return null;
    sum += kcal;
  }
  return sum;
}
/** Sets (grams, up to one decimal) or clears (blank) a library food's sugar alcohols per serving. */
export function setSugarAlcohol(record: FoodPlus, foodId: string, grams: string, liveFoodIds?: ReadonlySet<string>): FoodPlus {
  const text = grams.trim().replace(',', '.');
  const map: Record<string, number> = {...record.sugarAlcohols};
  if (!text) delete map[foodId];
  else {
    if (!/^\d+(?:\.\d)?$/.test(text) || Number(text) > 1000) throw new Error('Enter 0 to 1,000 g of sugar alcohols, with up to one decimal, or leave it blank.');
    map[foodId] = Math.round(Number(text) * 1000);
  }
  if (liveFoodIds) for (const id of Object.keys(map)) if (id !== foodId && !liveFoodIds.has(id)) delete map[id];
  const {sugarAlcohols: _old, ...rest} = record; void _old;
  return foodPlusSchema.parse(Object.keys(map).length ? {...rest, sugarAlcohols: map} : rest);
}
