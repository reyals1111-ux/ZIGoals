import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {ACTIVITY_EXTRAS_KEY_LITERAL} from '../aw-kcal-keys';
import {readFormNumber} from '../decimal-input';
import {formatNumber} from '../visual-format';

/**
 * Session AW (kcal; owner decision 1a, ADR-046; TIER 3 (stored formats): a NEW additive key): what a person typed beside
 * a Health activity — its distance, how hard it felt and the calories they entered — kept in its own record keyed by
 * the activity's id. `activitySchema` (lib/health.ts) is strict, so a field there would make builds #37–#59 refuse the
 * whole Health record; this record is ignored by them, and the activity reads as before. Loose and versioned; every
 * field optional and bounded; a value this build cannot read is dropped on read, never a reason to refuse the record.
 *
 * ZIGoals never estimates the calories an activity burned (owner decision 1a): `kcal` is only ever the number the person
 * typed, and every place that shows it says so ("you entered"). Pure.
 */
export const ACTIVITY_EXTRAS_KEY = ACTIVITY_EXTRAS_KEY_LITERAL;
export const EFFORTS = ['easy', 'moderate', 'hard'] as const;
export type Effort = typeof EFFORTS[number];
export const EFFORT_WORDS: Readonly<Record<Effort, {en: string; nl: string}>> = {easy: {en: 'Easy', nl: 'Rustig'}, moderate: {en: 'Moderate', nl: 'Gemiddeld'}, hard: {en: 'Hard', nl: 'Zwaar'}};
export const MAX_DISTANCE_KM = 1000;
export const MAX_ENTERED_KCAL = 10_000;
export const MAX_ACTIVITY_EXTRAS = 10_000;
/** The words beside a figure the person typed, and beside one a file brought in. */
export const ENTERED_WORDS = {en: 'you entered', nl: 'door jou ingevuld'} as const;
export const FILE_WORDS = {en: 'from your file', nl: 'uit je bestand'} as const;
const extraSchema = z.looseObject({
  distanceKm: z.number().finite().gt(0).max(MAX_DISTANCE_KM).optional().catch(undefined),
  effort: z.enum(EFFORTS).optional().catch(undefined),
  kcal: z.number().int().min(1).max(MAX_ENTERED_KCAL).optional().catch(undefined),
});
export type ActivityExtra = z.infer<typeof extraSchema>;
/** What this build writes: each value checked, never quietly dropped (a read is tolerant; a write is not). */
const extraWriteSchema = z.strictObject({distanceKm: z.number().finite().gt(0).max(MAX_DISTANCE_KM).optional(), effort: z.enum(EFFORTS).optional(), kcal: z.number().int().min(1).max(MAX_ENTERED_KCAL).optional()});
export const activityExtrasSchema = z.looseObject({
  version: z.literal(1),
  items: z.record(z.string().regex(/^health_[a-z0-9-]{8,80}$/), extraSchema).refine(items => Object.keys(items).length <= MAX_ACTIVITY_EXTRAS, `At most ${MAX_ACTIVITY_EXTRAS}.`),
});
export type ActivityExtras = z.infer<typeof activityExtrasSchema>;
export const emptyActivityExtras = (): ActivityExtras => ({version: 1, items: {}});
export const ACTIVITY_EXTRAS: DeviceRecordSpec<ActivityExtras> = {key: ACTIVITY_EXTRAS_KEY, schema: activityExtrasSchema, empty: emptyActivityExtras};

export type ActivityExtraDraft = {distanceKm?: number | null; effort?: Effort | null; kcal?: number | null};
/** Sets an activity's extras to exactly the fields given (a correction replaces them); none left removes its entry. */
export function withActivityExtra(record: ActivityExtras, id: string, draft: ActivityExtraDraft): ActivityExtras {
  const next: ActivityExtra = {...(draft.distanceKm ? {distanceKm: Math.round(draft.distanceKm * 1000) / 1000} : {}), ...(draft.effort ? {effort: draft.effort} : {}), ...(draft.kcal ? {kcal: draft.kcal} : {})};
  const items = {...record.items};
  if (Object.keys(next).length) items[id] = extraWriteSchema.parse(next); else delete items[id];
  return activityExtrasSchema.parse({...record, items});
}
/** Removes an activity's extras (the activity was removed). */
export const withoutActivityExtra = (record: ActivityExtras, id: string): ActivityExtras => { if (!(id in record.items)) return record; const items = {...record.items}; delete items[id]; return {...record, items}; };
/** An activity's extras, or null when it has none (or none that this build reads). */
export function extraOf(record: ActivityExtras | null | undefined, id: string): ActivityExtra | null {
  const x = record?.items[id];
  return x && (x.distanceKm !== undefined || x.effort !== undefined || x.kcal !== undefined) ? x : null;
}
/** Only the entries of activities that still exist (an entry left behind by another device's removal is never counted). */
export function liveExtras(record: ActivityExtras | null | undefined, activityIds: Iterable<string>): Map<string, ActivityExtra> {
  const out = new Map<string, ActivityExtra>();
  for (const id of activityIds) { const x = extraOf(record, id); if (x) out.set(id, x); }
  return out;
}

/** Distance in the unit the person uses for their body (Health's weight unit): miles with pounds, kilometres with kilograms. */
export type DistanceUnit = 'km' | 'mi';
export const KM_PER_MI = 1.609344;
export const distanceUnitFor = (weightUnit: 'kg' | 'lb'): DistanceUnit => weightUnit === 'lb' ? 'mi' : 'km';
const inUnit = (km: number, unit: DistanceUnit) => Math.round((unit === 'mi' ? km / KM_PER_MI : km) * 100) / 100;
/** "4.2 km", "2.61 mi": at most two decimals. */
export const distanceShown = (km: number, unit: DistanceUnit) => `${formatNumber(inUnit(km, unit), {maximumFractionDigits: 2})} ${unit}`;
/** A correction's prefill: the distance as shown, without grouping ("2.61"). */
export const distancePrefill = (km: number | undefined, unit: DistanceUnit) => km === undefined ? '' : String(inUnit(km, unit));
/** A typed distance in kilometres (blank is none); throws an Error whose message can be shown as is. */
export function readDistance(text: string, unit: DistanceUnit): number | null {
  if (!text.trim()) return null;
  const max = unit === 'mi' ? Math.floor(MAX_DISTANCE_KM / KM_PER_MI) : MAX_DISTANCE_KM;
  const refuse = () => new Error(`Enter a distance greater than 0 and at most ${formatNumber(max)} ${unit}, or leave it blank.`);
  let value: number;
  try { value = readFormNumber(text, {max, positive: true}); } catch { throw refuse(); }
  const km = Math.round((unit === 'mi' ? value * KM_PER_MI : value) * 1000) / 1000;
  if (!(km > 0)) throw refuse(); // a distance that rounds to nothing (under a metre) is refused, never dropped
  return km;
}
/** Typed calories, a whole number (blank is none); throws an Error whose message can be shown as is. */
export function readEnteredKcal(text: string): number | null {
  if (!text.trim()) return null;
  try { return readFormNumber(text, {min: 1, max: MAX_ENTERED_KCAL, whole: true}); } catch { throw new Error(`Enter calories as a whole number from 1 to ${formatNumber(MAX_ENTERED_KCAL)}, or leave it blank.`); }
}
export const readEffort = (value: string): Effort | null => (EFFORTS as readonly string[]).includes(value) ? value as Effort : null;
/** "320 kcal · you entered": a calorie figure always says where it came from. */
export const enteredKcalText = (kcal: number) => `${formatNumber(kcal)} kcal · ${ENTERED_WORDS.en}`;
/** The parts of an activity's row beyond its steps and minutes: "4.2 km", "Easy effort", "320 kcal · you entered". */
export function extraParts(extra: ActivityExtra | null, unit: DistanceUnit): string[] {
  if (!extra) return [];
  return [extra.distanceKm !== undefined ? distanceShown(extra.distanceKm, unit) : null, extra.effort ? `${EFFORT_WORDS[extra.effort].en} effort` : null, extra.kcal !== undefined ? enteredKcalText(extra.kcal) : null].filter((p): p is string => p !== null);
}
