import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {scaleNutrition, type HealthData, type Nutrition} from '../health';
import {measurementHistory, readingDay} from '../body-measurements';
import type {HealthNumbers} from '../health-numbers/store';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2 (health r3; LEDGER #287, Carb Manager's goals on any health number; TIER 3 (stored format), a new
 * device record): a goal on a nutrient's daily average from the food log (protein, fibre…), on a body measurement (waist,
 * hips…) or on one of your own numbers (lib/health-numbers), at least or at most a target, over the last 7, 14 or 30
 * days. Its own key, loose and versioned, because the health goals and average goals records are strict about their
 * measures (a new measure there would make an older build refuse the whole record). Device-only.
 *
 * Health's rules: the target is the person's own (nothing is suggested); a day without a value is left out, never counted
 * as zero, and the average says how many days it rests on; today is not counted until it ends. Left out (against the
 * no-medical-advice rule): a target on ketones, glucose, insulin or HbA1c, and a BMI goal (the number is shown only).
 * Pure.
 */
export const MORE_GOALS_KEY = 'zigoals:health-goals-more:v1';
export const MORE_GOALS_MAX = 50, MORE_NAME_MAX = 60;
export const NUTRIENT_MEASURES = {
  proteinMg: {label: 'Protein', unit: 'g', scale: 1000}, fiberMg: {label: 'Fibre', unit: 'g', scale: 1000}, carbsMg: {label: 'Carbs', unit: 'g', scale: 1000},
  fatMg: {label: 'Fat', unit: 'g', scale: 1000}, sugarMg: {label: 'Sugars', unit: 'g', scale: 1000}, sodiumMg: {label: 'Sodium', unit: 'mg', scale: 1}, kcal: {label: 'Calories eaten', unit: 'kcal', scale: 1},
} as const;
export type NutrientKey = keyof typeof NUTRIENT_MEASURES;
export const BODY_MEASURES = {waist: 'Waist', hips: 'Hips', chest: 'Chest', arm: 'Arm', thigh: 'Thigh'} as const;
export type BodyKey = keyof typeof BODY_MEASURES;
/**
 * Own numbers a target is not offered for, setting one being medical advice: glucose, blood sugar, ketones, insulin, HbA1c
 * and BMI, in English and Dutch. Stems are matched anywhere in a word (review B3B-2: "Bloedglucose", "Nuchtere
 * bloedglucose", "Bloedsuikerspiegel", "Blood sugars", "Beta-hydroxybutyrate" passed a whole-word list); the short
 * abbreviations only as their own word.
 */
export const NOT_A_GOAL_STEMS = ['glucos', 'glukos', 'glycem', 'glykem', 'glycaem', 'bloodsugar', 'blood sugar', 'bloedsuiker', 'suikerspiegel', 'sugar level', 'keton', 'ketoon', 'hydroxybutyr', 'hydroxyboter', 'acetoacet', 'insulin', 'insuline', 'hemoglobin a1c', 'haemoglobin a1c', 'body mass index', 'queteletindex', 'quetelet'] as const;
export const NOT_A_GOAL_WORDS = ['bmi', 'bhb', 'hba1c', 'a1c', 'gki', 'cgm', 'bg'] as const;
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[-_./]+/g, ' ').replace(/\s+/g, ' ');
export function notAGoal(name: string): boolean {
  const t = fold(name), squashed = t.replace(/ /g, '');
  return NOT_A_GOAL_STEMS.some(stem => t.includes(stem) || squashed.includes(stem.replace(/ /g, ''))) || t.split(' ').some(w => (NOT_A_GOAL_WORDS as readonly string[]).includes(w));
}
/** Kept for callers that test a name with a pattern: the same rule as `notAGoal`. */
export const NOT_A_GOAL = {test: (name: string) => notAGoal(name)};
export const MORE_WINDOWS = [7, 14, 30] as const;

const goalSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(MORE_NAME_MAX),
  source: z.enum(['nutrient', 'body', 'number']),
  /** The nutrient key, the body measurement, or your number's name. */
  key: z.string().trim().min(1).max(60),
  /** Your number's unit, as typed there (a nutrient or a body measurement has its own). */
  unit: z.string().max(20).optional().catch(undefined),
  target: z.number().finite().positive().max(1_000_000),
  direction: z.enum(['at-least', 'at-most']),
  windowDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  status: z.enum(['active', 'closed']),
  createdAt: z.iso.datetime(),
});
export type MoreGoal = z.infer<typeof goalSchema>;
const goalsSchema = z.preprocess(v => Array.isArray(v) ? v.filter(x => goalSchema.safeParse(x).success).slice(0, MORE_GOALS_MAX) : v, z.array(goalSchema).max(MORE_GOALS_MAX));
/**
 * Session AV lane 2, round 4 (health; LEDGER #331, Noom's Maintenance Mode; TIER 3 (stored format), additive): "Keep my
 * weight between …", a band the person sets, shaded on the weight trend. A top-level part of this loose record (never a
 * new goal kind: a round 3 reader would drop a goal it cannot read, while it keeps an unknown top-level part as written).
 * Grams; low below high, at least 0.5 kg apart. Optional; a value this build cannot read is dropped on its own.
 */
export const BAND_MIN_GRAMS = 20_000, BAND_MAX_GRAMS = 500_000, BAND_MIN_WIDTH = 500;
export const weightBandSchema = z.looseObject({lowGrams: z.number().int().min(BAND_MIN_GRAMS).max(BAND_MAX_GRAMS), highGrams: z.number().int().min(BAND_MIN_GRAMS).max(BAND_MAX_GRAMS), createdAt: z.iso.datetime()})
  .refine(b => b.highGrams - b.lowGrams >= BAND_MIN_WIDTH, 'The band is at least 0.5 kg wide.');
export type WeightBand = z.infer<typeof weightBandSchema>;
export const moreGoalsSchema = z.looseObject({version: z.literal(1), goals: goalsSchema.default([]), weightBand: weightBandSchema.optional().catch(undefined)});
export type MoreGoals = z.infer<typeof moreGoalsSchema>;
export const emptyMoreGoals = (): MoreGoals => ({version: 1, goals: []});
export const MORE_GOALS: DeviceRecordSpec<MoreGoals> = {key: MORE_GOALS_KEY, schema: moreGoalsSchema, empty: emptyMoreGoals};

export type MoreGoalDraft = {name: string; source: MoreGoal['source']; key: string; unit?: string; target: string; direction: MoreGoal['direction']; windowDays: number};
export type MoreGoalIssue = {field: 'name' | 'key' | 'target'; message: string};
/** The unit a goal is measured in. */
export const unitOf = (g: Pick<MoreGoal, 'source' | 'key' | 'unit'>): string => g.source === 'nutrient' ? NUTRIENT_MEASURES[g.key as NutrientKey]?.unit ?? '' : g.source === 'body' ? 'cm' : g.unit ?? '';
/** What a goal measures, in words: "Protein", "Waist", "Resting pulse". */
export const measureWord = (g: Pick<MoreGoal, 'source' | 'key'>): string => g.source === 'nutrient' ? NUTRIENT_MEASURES[g.key as NutrientKey]?.label ?? g.key : g.source === 'body' ? BODY_MEASURES[g.key as BodyKey] ?? g.key : g.key;
/** Adds a goal from the form, or says which field to fix. */
export function addMoreGoal(rec: MoreGoals, d: MoreGoalDraft, id: string, now: string): {ok: true; value: MoreGoals; goal: MoreGoal} | {ok: false; issue: MoreGoalIssue} {
  const key = d.key.trim();
  if (d.source === 'nutrient' && !Object.hasOwn(NUTRIENT_MEASURES, key)) return {ok: false, issue: {field: 'key', message: 'Choose what the goal is on.'}};
  if (d.source === 'body' && !Object.hasOwn(BODY_MEASURES, key)) return {ok: false, issue: {field: 'key', message: 'Choose what the goal is on.'}};
  if (d.source === 'number' && (!key || key.length > 60)) return {ok: false, issue: {field: 'key', message: 'Choose one of your numbers.'}};
  if (d.source === 'number' && notAGoal(key)) return {ok: false, issue: {field: 'key', message: `A target for ${key} is not offered: setting one is medical advice. Its readings stay in Your numbers.`}};
  const text = d.target.trim().replace(',', '.'), target = Number(text);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !(target > 0) || target > 1_000_000) return {ok: false, issue: {field: 'target', message: 'Enter your target as a number above 0, like 100 or 85.5.'}};
  const name = d.name.trim() || `${measureWord({source: d.source, key})} ${d.direction === 'at-least' ? 'at least' : 'at most'} ${text}${d.source === 'number' && d.unit ? ` ${d.unit}` : d.source !== 'number' ? ` ${unitOf({source: d.source, key})}` : ''}`;
  if (name.length > MORE_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${MORE_NAME_MAX} characters or fewer.`}};
  if (rec.goals.length >= MORE_GOALS_MAX) return {ok: false, issue: {field: 'name', message: `Up to ${MORE_GOALS_MAX} of these goals: remove one first.`}};
  const windowDays = (MORE_WINDOWS as readonly number[]).includes(d.windowDays) ? d.windowDays as 7 | 14 | 30 : 7;
  const goal: MoreGoal = {id, name, source: d.source, key, ...(d.source === 'number' && d.unit?.trim() ? {unit: d.unit.trim().slice(0, 20)} : {}), target, direction: d.direction, windowDays, status: 'active', createdAt: now};
  return {ok: true, value: moreGoalsSchema.parse({...rec, goals: [...rec.goals, goal]}), goal};
}
export const setMoreGoalStatus = (rec: MoreGoals, id: string, status: MoreGoal['status']): MoreGoals => moreGoalsSchema.parse({...rec, goals: rec.goals.map(g => g.id === id ? {...g, status} : g)});
export const removeMoreGoal = (rec: MoreGoals, id: string): MoreGoals => moreGoalsSchema.parse({...rec, goals: rec.goals.filter(g => g.id !== id)});
export const restoreMoreGoal = (rec: MoreGoals, goal: MoreGoal, at: number): MoreGoals => rec.goals.some(g => g.id === goal.id) ? rec : moreGoalsSchema.parse({...rec, goals: [...rec.goals.slice(0, at), goal, ...rec.goals.slice(at)]});

export type MoreProgress = {average: number | null; days: number; from: string; to: string; met: boolean | null; percent: number | null};
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
/** A day's nutrient from the food log in the goal's unit, or null when nothing is logged or an entry's value is unknown. */
export function nutrientOn(data: HealthData, date: string, key: NutrientKey): number | null {
  const entries = data.diary.filter(e => e.date === date);
  if (!entries.length) return null;
  let sum = 0;
  for (const e of entries) { const v = scaleNutrition(e.snapshot.nutrients, e.quantityMilli)[key as keyof Nutrition]; if (v === null || v === undefined) return null; sum += v; }
  return sum / NUTRIENT_MEASURES[key].scale;
}
/** The average over the window (the last N days before today), the days it rests on, and whether it meets the target. */
export function moreGoalProgress(goal: MoreGoal, data: HealthData | null, numbers: HealthNumbers | null, today: string): MoreProgress {
  // The nutrient window is the last N full days (today counts once it ends); a measurement's or a number's is the last N
  // days through today (review B3B-1: it took N + 1 days).
  const to = addLocalDays(today, -1), from = addLocalDays(today, -goal.windowDays), since = addLocalDays(today, -(goal.windowDays - 1)), values: number[] = [];
  if (goal.source === 'nutrient' && data) for (let d = from; d <= to; d = addLocalDays(d, 1)) { const v = nutrientOn(data, d, goal.key as NutrientKey); if (v !== null) values.push(v); }
  if (goal.source === 'body' && data) {
    // The body measurements of the window, each day's latest (a day measured twice counts once), in cm.
    const byDay = new Map<string, number>();
    for (const r of measurementHistory(data, goal.key as BodyKey).readings) { const day = readingDay(r) /* review B3B-11: the day of the zone it was entered in */; if (day >= since && day <= today) byDay.set(day, r.canonical / 10_000); }
    values.push(...byDay.values());
  }
  if (goal.source === 'number' && numbers) {
    const name = goal.key.toLocaleLowerCase('en'), unit = (goal.unit ?? '').toLocaleLowerCase('en');
    for (const e of numbers.entries) if (e.kind === 'lab' && e.value !== undefined && e.name?.toLocaleLowerCase('en') === name && (e.unit ?? '').toLocaleLowerCase('en') === unit && e.date >= since && e.date <= today) values.push(e.value);
  }
  const average = avg(values);
  const met = average === null ? null : goal.direction === 'at-least' ? average >= goal.target : average <= goal.target;
  const percent = average === null ? null : goal.direction === 'at-least' ? Math.min(100, Math.round(average / goal.target * 100)) : met ? 100 : Math.max(0, Math.round(goal.target / average * 100));
  return {average, days: values.length, from: goal.source === 'nutrient' ? from : since, to: goal.source === 'nutrient' ? to : today, met, percent};
}
const round = (n: number, unit: string) => unit === 'kcal' || unit === 'mg' ? Math.round(n) : Math.round(n * 10) / 10;
/** "Protein: 92 g a day on average over 6 of the last 7 days. Your goal: at least 100 g." */
export function moreGoalLine(goal: MoreGoal, p: MoreProgress, fmt: (n: number) => string = String): string {
  const unit = unitOf(goal), word = measureWord(goal), aim = `Your goal: ${goal.direction === 'at-least' ? 'at least' : 'at most'} ${fmt(goal.target)}${unit ? ` ${unit}` : ''}.`;
  const span = goal.source === 'nutrient' ? `the last ${goal.windowDays} full days` : `the last ${goal.windowDays} days`;
  if (p.average === null) return goal.source === 'nutrient' ? `No day in ${span} has ${word.toLowerCase()} known for every food logged yet. ${aim}` : goal.source === 'body' ? `No ${word.toLowerCase()} measurement in ${span} yet: add one in Health → Measurements. ${aim}` : `No ${word} reading in ${span} yet: add one in Your numbers. ${aim}`;
  const per = goal.source === 'nutrient' ? ' a day' : '';
  return `${word}: ${fmt(round(p.average, unit))}${unit ? ` ${unit}` : ''}${per} on average over ${p.days} ${goal.source === 'nutrient' ? `of ${span}` : p.days === 1 ? `reading in ${span}` : `readings in ${span}`}. ${aim}${p.met ? ' Met.' : ''}`;
}
