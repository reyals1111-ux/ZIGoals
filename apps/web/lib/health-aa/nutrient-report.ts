import {addLocalDays} from '../local-date';
import {additionalNutrients, scaleNutrition, type HealthData, type HealthDiaryEntry} from '../health';
import {VITAMINS, VITAMIN_SCALE, entryVitamins, vitaminTarget, type HealthVitamins} from '../health-vitamins/schema';
import {EXTRA_REFERENCE, EXTRA_SCALE, NUTRIENT_EXTRAS, entryExtras, type NutrientExtras} from '../health-vitamins/extras';
import {MICRO_DIRECTION, microTarget, type MicroTargets} from './micro';

/**
 * Session AK (task 4.4, COMPETITORS N2): one report of every nutrient the app knows, read from the diary and the two
 * device records beside it: the seven of the nutrition format (fibre, sugars, saturated fat, sodium, potassium, calcium,
 * iron), the vitamins (A, C, D, E, K, B12, folate) and the extras (magnesium, zinc, B1, B2, B3, B6, omega-3) where a
 * source gave them. For a day: the total where entries carry a value. For a window: the average over the days that carry
 * one (a day without a value is left out, never read as 0). "Top sources": which foods gave the most of one nutrient over
 * 7, 30 or 90 days, with their share and the days. Reference values are general guidance (the person's own targets for
 * the seven and the vitamins), never advice. A nutrient with no value anywhere in the window is hidden.
 */
export type ReportGroup = 'Energy and macros' | 'Carbs and fats' | 'Minerals' | 'Vitamins' | 'More';
export type ReportNutrient = {key: string; label: string; unit: string; group: ReportGroup; /** stored units per shown unit */ scale: number; reference: number | null; direction: 'at-least' | 'at-most' | null};
export type ReportContext = {data: Pick<HealthData, 'diary' | 'recipes'>; vitamins: HealthVitamins; extras: NutrientExtras; micro: MicroTargets};
const MACROS: ReportNutrient[] = [
  {key: 'kcal', label: 'Calories', unit: 'kcal', group: 'Energy and macros', scale: 1, reference: null, direction: null},
  {key: 'proteinMg', label: 'Protein', unit: 'g', group: 'Energy and macros', scale: 1000, reference: null, direction: null},
  {key: 'carbsMg', label: 'Carbs', unit: 'g', group: 'Energy and macros', scale: 1000, reference: null, direction: null},
  {key: 'fatMg', label: 'Fat', unit: 'g', group: 'Energy and macros', scale: 1000, reference: null, direction: null},
];
export function reportNutrients(ctx: Pick<ReportContext, 'vitamins' | 'micro'>): ReportNutrient[] {
  return [
    ...MACROS,
    ...additionalNutrients.map(([key, label, unit, scale]) => ({key, label, unit, group: (scale === 1000 ? 'Carbs and fats' : 'Minerals') as ReportGroup, scale, reference: microTarget(ctx.micro, key), direction: MICRO_DIRECTION[key]})),
    ...VITAMINS.map(([key, label, unit]) => ({key: `vitamin:${key}`, label, unit, group: 'Vitamins' as ReportGroup, scale: VITAMIN_SCALE, reference: vitaminTarget(ctx.vitamins, key), direction: 'at-least' as const})),
    ...NUTRIENT_EXTRAS.map(([key, label, unit]) => ({key: `extra:${key}`, label, unit, group: (key === 'magnesiumMg' || key === 'zincMg' ? 'Minerals' : key === 'omega3Mg' ? 'More' : 'Vitamins') as ReportGroup, scale: EXTRA_SCALE, reference: EXTRA_REFERENCE[key], direction: 'at-least' as const})),
  ];
}
/** Every known value of one entry, by report key, in stored units. */
export function entryNutrients(ctx: ReportContext, entry: HealthDiaryEntry): Record<string, number> {
  const out: Record<string, number> = {};
  const n = scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli) as Record<string, number | null | undefined>;
  for (const [k, v] of Object.entries(n)) if (typeof v === 'number') out[k] = v;
  for (const [k, v] of Object.entries(entryVitamins(ctx.vitamins, ctx.data, entry))) if (typeof v === 'number') out[`vitamin:${k}`] = v;
  for (const [k, v] of Object.entries(entryExtras(ctx.extras, ctx.data, entry))) if (typeof v === 'number') out[`extra:${k}`] = v;
  return out;
}
export type NutrientDayRow = ReportNutrient & {total: number | null; known: number; entries: number};
/** One day's totals; `total` is null when no entry carries the nutrient. */
export function nutrientDay(ctx: ReportContext, date: string): NutrientDayRow[] {
  const entries = ctx.data.diary.filter(d => d.date === date), values = entries.map(e => entryNutrients(ctx, e));
  return reportNutrients(ctx).map(def => {
    let total: number | null = null, known = 0;
    for (const v of values) if (v[def.key] !== undefined) { known++; total = (total ?? 0) + v[def.key]!; }
    return {...def, total, known, entries: entries.length};
  });
}
export type NutrientAverageRow = ReportNutrient & {average: number | null; daysWithValue: number; loggedDays: number; days: number};
/** The average a day over the `days` ending on `end`, over the days that carry the nutrient. */
export function nutrientAverages(ctx: ReportContext, end: string, days = 7): NutrientAverageRow[] {
  const first = addLocalDays(end, -(days - 1));
  const totals = new Map<string, Map<string, number>>(), logged = new Set<string>();
  for (const e of ctx.data.diary) {
    if (e.date < first || e.date > end) continue;
    logged.add(e.date);
    for (const [k, v] of Object.entries(entryNutrients(ctx, e))) { const byDay = totals.get(k) ?? new Map<string, number>(); byDay.set(e.date, (byDay.get(e.date) ?? 0) + v); totals.set(k, byDay); }
  }
  return reportNutrients(ctx).map(def => {
    const byDay = totals.get(def.key);
    const values = byDay ? [...byDay.values()] : [];
    return {...def, average: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null, daysWithValue: values.length, loggedDays: logged.size, days};
  });
}
/** Hides the nutrients no entry gave a value for. */
export const withData = <T extends {key: string; total?: number | null; average?: number | null}>(rows: readonly T[]): T[] => rows.filter(r => (r.total ?? r.average ?? null) !== null);

export type TopSource = {id: string; kind: 'food' | 'recipe'; name: string; amount: number; share: number; entries: number; days: string[]};
export type TopSources = {key: string; days: number; total: number; known: number; entries: number; sources: TopSource[]};
/** The foods that gave the most of one nutrient over the `days` ending on `end` (by source; the newest name shown). */
export function topSources(ctx: ReportContext, key: string, end: string, days: 7 | 30 | 90 = 7, limit = 5): TopSources {
  const first = addLocalDays(end, -(days - 1));
  const groups = new Map<string, TopSource & {last: string}>();
  let total = 0, known = 0, entries = 0;
  for (const e of ctx.data.diary) {
    if (e.date < first || e.date > end) continue;
    entries++;
    const v = entryNutrients(ctx, e)[key];
    if (v === undefined) continue;
    known++; total += v;
    if (v <= 0) continue;
    const id = `${e.sourceKind}:${e.sourceId}`, g = groups.get(id) ?? {id: e.sourceId, kind: e.sourceKind, name: e.snapshot.name, amount: 0, share: 0, entries: 0, days: [], last: ''};
    g.amount += v; g.entries++; if (!g.days.includes(e.date)) g.days.push(e.date);
    if (e.date >= g.last) { g.last = e.date; g.name = e.snapshot.name; }
    groups.set(id, g);
  }
  const sources = [...groups.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)).slice(0, limit)
    .map(g => ({id: g.id, kind: g.kind, name: g.name, amount: g.amount, entries: g.entries, share: total > 0 ? g.amount / total : 0, days: [...g.days].sort()}));
  return {key, days, total, known, entries, sources};
}
/** "about 82 % of your general-guidance value" — a plain share, null without a reference. */
export const referenceShare = (value: number | null, reference: number | null) => value === null || !reference ? null : Math.round(value / reference * 100);
