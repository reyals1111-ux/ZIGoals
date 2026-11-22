import {lastEntryFor} from './engine';
import {platesFor} from './depth';
import type {Workout, Workouts} from './schema';
import type {Suggestion} from './suggest';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #372, Gentler Streak's "How I feel"): a one-tap "How do you feel today?" before
 * today's suggested workout (bodymind-r2's #240). Fresh and Normal keep the suggestion as it is; Tired makes it shorter
 * (one exercise and one set fewer each, at least three exercises and two sets) and holds every weight at what you lifted
 * last time (no increase today); Sore makes it shorter and lighter (three exercises, two sets each, about 10 % less weight,
 * rounded down to what the person's own plates make, in their unit). On a tired or sore day an easy walk is offered instead. Everyday words, never a
 * symptom list or a reading of the body; the choice is kept for that suggestion only — nothing is stored. Pure.
 */
export const FEELINGS = ['fresh', 'normal', 'tired', 'sore'] as const;
export type Feeling = (typeof FEELINGS)[number];
export const FEEL_WORDS: Record<Feeling, {en: string; nl: string}> = {fresh: {en: 'Fresh', nl: 'Fris'}, normal: {en: 'Normal', nl: 'Normaal'}, tired: {en: 'Tired', nl: 'Moe'}, sore: {en: 'Sore', nl: 'Stijf'}};
/** How a tired or sore day works, in general (the answers; review B5J-5: "up to", since a short suggestion keeps its length). */
export const EASIER_WORDS: Record<'tired' | 'sore', {en: string; nl: string}> = {
  tired: {en: 'An easier day: up to one exercise and one set fewer, with the weights you lifted last time (no increase today).', nl: 'Een rustigere dag: tot één oefening en één set minder, met de gewichten van de vorige keer (vandaag geen verhoging).'},
  sore: {en: 'A lighter day: up to three exercises, up to two sets each, about 10 % less weight.', nl: 'Een lichtere dag: tot drie oefeningen, tot twee sets elk, ongeveer 10 % minder gewicht.'},
};
const KG_PER_LB = 0.45359237;
/**
 * Review B5J-4: down to what the person's own plates make, in their own unit — the smallest plate on each side (or on the
 * one horn) from the saved plate set, else the standard set (2.5 kg, 5 lb); below the bar, whole steps of 1 kg or 2.5 lb.
 * The result is in kg, as sets are kept.
 */
export function roundDownKg(kg: number, w?: Workouts, unit: 'kg' | 'lb' = 'kg'): number {
  const setup = platesFor(w ?? {plates: undefined} as Workouts, unit), smallest = Math.min(...setup.plates.filter(p => p.pairs > 0).map(p => p.size));
  const one = setup.oneSide === true, base = one ? setup.start ?? 0 : setup.bar, step = Number.isFinite(smallest) ? smallest * (one ? 1 : 2) : unit === 'kg' ? 2.5 : 5;
  const value = unit === 'lb' ? kg / KG_PER_LB : kg;
  const down = value >= base && base > 0 ? base + Math.floor((value - base) / step + 1e-9) * step : Math.floor(value / (unit === 'kg' ? 1 : 2.5) + 1e-9) * (unit === 'kg' ? 1 : 2.5);
  return Math.round((unit === 'lb' ? down * KG_PER_LB : down) * 1000) / 1000;
}
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
/** Review B5J-5: the line under the suggestion says only what changed from the suggestion as made. */
export function easierLine(before: Suggestion, after: Suggestion, feel: 'tired' | 'sore'): string {
  const fewerEx = after.exercises.length < before.exercises.length, fewerSets = after.exercises.some((x, i) => x.sets.length < before.exercises[i]!.sets.length);
  const lighter = after.exercises.some((x, i) => x.sets.some((set, j) => set.weightKg !== undefined && set.weightKg < (before.exercises[i]!.sets[j]!.weightKg ?? 0)));
  if (feel === 'sore') {
    const parts = [fewerEx ? `${NUMBER_WORDS[after.exercises.length] ?? after.exercises.length} exercises` : null, fewerSets ? (after.exercises.every(x => x.sets.length <= 2) ? 'two sets each' : 'fewer sets') : null, lighter ? 'about 10 % less weight' : null].filter(Boolean);
    return parts.length ? `A lighter day: ${parts.join(', ')}.` : 'A lighter day: this suggestion is already short and light, so it stays as it is.';
  }
  const parts = [fewerEx ? 'one exercise fewer' : null, fewerSets ? 'fewer sets' : null, lighter ? 'the weights you lifted last time (no increase today)' : null].filter(Boolean);
  return parts.length ? `An easier day: ${parts.join(', ')}.` : 'An easier day: this suggestion is already short and no weight goes up, so it stays as it is.';
}
const heaviestLast = (w: Workouts, exerciseId: string, before?: string) => {
  const e = lastEntryFor(w, exerciseId, before), kgs = (e?.sets ?? []).filter(s => s.kind !== 'warmup' && typeof s.weightKg === 'number').map(s => s.weightKg!);
  return kgs.length ? Math.max(...kgs) : null;
};
export function adjustForFeeling(w: Workouts, s: Suggestion, feel: Feeling | null, now = new Date(), unit: 'kg' | 'lb' = 'kg'): Suggestion {
  if (feel !== 'tired' && feel !== 'sore') return s;
  const keep = feel === 'sore' ? Math.min(3, s.exercises.length) : Math.max(Math.min(3, s.exercises.length), s.exercises.length - 1);
  return {...s, exercises: s.exercises.slice(0, keep).map(x => {
    const count = feel === 'sore' ? Math.min(2, x.sets.length) : Math.max(Math.min(2, x.sets.length), x.sets.length - 1), last = heaviestLast(w, x.exerciseId, now.toISOString());
    return {...x, sets: x.sets.slice(0, count).map(set => set.weightKg === undefined ? set
      : {...set, weightKg: feel === 'sore' ? roundDownKg(set.weightKg * 0.9, w, unit) : last !== null ? Math.min(set.weightKg, last) : set.weightKg})};
  })};
}
/** The easy walk offered instead: a cardio workout with the library's Walking, its distance and time to fill. */
export function walkInstead(name = 'Easy walk'): Workout {
  return {id: 'suggestion-walk', name, date: '1970-01-01', type: 'cardio', startedAt: new Date(0).toISOString(),
    exercises: [{id: 'suggested-walk', exerciseId: 'walking', name: 'Walking', measure: 'distance-time', sets: [{id: 'suggested-walk-0', kind: 'normal', done: false}]}]} as Workout;
}
