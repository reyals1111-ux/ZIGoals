import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * The Life review's own record (Session AA-Cloud Part 5, `[TIER 3] (storage)`): the period last shown and the one focus
 * the person chose for each period, on this device only (loose, versioned, its own key, never synced; #32–#37 never
 * read it). It extends the weekly review's key (`zigoals:weekly-review:v1`), which it never writes: the six-step
 * reflection keeps its own words there. The figures of a period are never stored; they are read again each time.
 */
export const LIFE_REVIEW_KEY = 'zigoals:life-review:v1';
export const MAX_FOCUS = 400;
const periodKey = z.string().regex(/^(week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2})$/);
export const MAX_VALUES = 3;
const valueWord = z.string().trim().min(1).max(40);
/** A starting list for the values step; the person may write their own. */
export const VALUE_SUGGESTIONS = ['Health', 'Family', 'Friendship', 'Growth', 'Learning', 'Calm', 'Freedom', 'Security', 'Creativity', 'Adventure', 'Kindness', 'Faith'] as const;
export const lifeReviewSchema = z.looseObject({
  version: z.literal(1),
  period: z.enum(['week', 'month']).optional(),
  focus: z.record(periodKey, z.looseObject({text: z.string().trim().min(1).max(280), setAt: z.iso.datetime()})).refine(f => Object.keys(f).length <= MAX_FOCUS, `Up to ${MAX_FOCUS} periods.`),
  /** Session AI (feature 9, GO14; `TIER 3 (stored format)`, additive and optional): up to three values in the person's words. */
  values: z.array(valueWord).max(MAX_VALUES).optional(),
  /** Each week's values check: how much the week reflected each value, 1–5 (the person's own rating, never computed). */
  valueChecks: z.record(periodKey, z.looseObject({ratings: z.record(valueWord, z.number().int().min(1).max(5)), at: z.iso.datetime()})).refine(f => Object.keys(f).length <= MAX_FOCUS, `Up to ${MAX_FOCUS} periods.`).optional(),
});
export type LifeReviewRecord = z.infer<typeof lifeReviewSchema>;
export const emptyLifeReview = (): LifeReviewRecord => ({version: 1, focus: {}});
export const LIFE_REVIEW: DeviceRecordSpec<LifeReviewRecord> = {key: LIFE_REVIEW_KEY, schema: lifeReviewSchema, empty: emptyLifeReview};

/** Sets (or, with empty text, clears) the period's focus; the oldest periods go first past the cap. */
export function setFocus(state: LifeReviewRecord, key: string, text: string, at: string): LifeReviewRecord {
  const focus = {...state.focus};
  if (text.trim()) focus[key] = {text: text.trim(), setAt: at}; else delete focus[key];
  const keys = Object.keys(focus).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_FOCUS))) delete focus[old];
  return lifeReviewSchema.parse({...state, focus});
}
export const setPeriod = (state: LifeReviewRecord, period: 'week' | 'month'): LifeReviewRecord => lifeReviewSchema.parse({...state, period});
/** The focus chosen for the period before this one, to come back to. */
export function previousFocus(state: LifeReviewRecord, key: string): {key: string; text: string} | null {
  const kind = key.split(':')[0], earlier = Object.keys(state.focus).filter(k => k.startsWith(`${kind}:`) && k < key).sort().at(-1);
  return earlier ? {key: earlier, text: state.focus[earlier]!.text} : null;
}
/** Sets the person's values (up to three, their words, duplicates dropped regardless of case); an empty list clears them. */
export function setValues(state: LifeReviewRecord, values: readonly string[]): LifeReviewRecord {
  const seen = new Set<string>(), clean = values.map(v => v.trim()).filter(v => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
  if (clean.length > MAX_VALUES) throw Error(`Choose up to ${MAX_VALUES} values.`);
  const next = {...state}; if (clean.length) next.values = clean; else delete next.values;
  return lifeReviewSchema.parse(next);
}
/** Rates how much a week reflected one value (1–5); the oldest weeks go first past the cap. */
export function rateValue(state: LifeReviewRecord, key: string, value: string, rating: number, at: string): LifeReviewRecord {
  if (!(state.values ?? []).includes(value)) throw Error('That value is not one of yours.');
  const checks = {...state.valueChecks ?? {}}, week = checks[key];
  checks[key] = {ratings: {...week?.ratings ?? {}, [value]: rating}, at};
  const keys = Object.keys(checks).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_FOCUS))) delete checks[old];
  return lifeReviewSchema.parse({...state, valueChecks: checks});
}
