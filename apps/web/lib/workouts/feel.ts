import {lastEntryFor} from './engine';
import type {Workout, Workouts} from './schema';
import type {Suggestion} from './suggest';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #372, Gentler Streak's "How I feel"): a one-tap "How do you feel today?" before
 * today's suggested workout (bodymind-r2's #240). Fresh and Normal keep the suggestion as it is; Tired makes it shorter
 * (one exercise and one set fewer each, at least three exercises and two sets) and holds every weight at what you lifted
 * last time (no increase today); Sore makes it shorter and lighter (three exercises, two sets each, about 10 % less weight,
 * rounded down to what plates make). On a tired or sore day an easy walk is offered instead. Everyday words, never a
 * symptom list or a reading of the body; the choice is kept for that suggestion only — nothing is stored. Pure.
 */
export const FEELINGS = ['fresh', 'normal', 'tired', 'sore'] as const;
export type Feeling = (typeof FEELINGS)[number];
export const FEEL_WORDS: Record<Feeling, {en: string; nl: string}> = {fresh: {en: 'Fresh', nl: 'Fris'}, normal: {en: 'Normal', nl: 'Normaal'}, tired: {en: 'Tired', nl: 'Moe'}, sore: {en: 'Sore', nl: 'Stijf'}};
/** The line under the suggestion on a tired or sore day (English; the answers carry the Dutch). */
export const EASIER_WORDS: Record<'tired' | 'sore', {en: string; nl: string}> = {
  tired: {en: 'An easier day: fewer sets and one exercise fewer, with the weights you lifted last time (no increase today).', nl: 'Een rustigere dag: minder sets en één oefening minder, met de gewichten van de vorige keer (vandaag geen verhoging).'},
  sore: {en: 'A lighter day: three exercises, two sets each, about 10 % less weight.', nl: 'Een lichtere dag: drie oefeningen, twee sets elk, ongeveer 10 % minder gewicht.'},
};
/** Down to what plates make: 2.5 kg steps from 20 kg up, 1 kg steps below. */
export const roundDownKg = (kg: number) => kg >= 20 ? Math.floor(kg / 2.5) * 2.5 : Math.floor(kg);
const heaviestLast = (w: Workouts, exerciseId: string, before?: string) => {
  const e = lastEntryFor(w, exerciseId, before), kgs = (e?.sets ?? []).filter(s => s.kind !== 'warmup' && typeof s.weightKg === 'number').map(s => s.weightKg!);
  return kgs.length ? Math.max(...kgs) : null;
};
export function adjustForFeeling(w: Workouts, s: Suggestion, feel: Feeling | null, now = new Date()): Suggestion {
  if (feel !== 'tired' && feel !== 'sore') return s;
  const keep = feel === 'sore' ? Math.min(3, s.exercises.length) : Math.max(Math.min(3, s.exercises.length), s.exercises.length - 1);
  return {...s, exercises: s.exercises.slice(0, keep).map(x => {
    const count = feel === 'sore' ? Math.min(2, x.sets.length) : Math.max(Math.min(2, x.sets.length), x.sets.length - 1), last = heaviestLast(w, x.exerciseId, now.toISOString());
    return {...x, sets: x.sets.slice(0, count).map(set => set.weightKg === undefined ? set
      : {...set, weightKg: feel === 'sore' ? roundDownKg(set.weightKg * 0.9) : last !== null ? Math.min(set.weightKg, last) : set.weightKg})};
  })};
}
/** The easy walk offered instead: a cardio workout with the library's Walking, its distance and time to fill. */
export function walkInstead(name = 'Easy walk'): Workout {
  return {id: 'suggestion-walk', name, date: '1970-01-01', type: 'cardio', startedAt: new Date(0).toISOString(),
    exercises: [{id: 'suggested-walk', exerciseId: 'walking', name: 'Walking', measure: 'distance-time', sets: [{id: 'suggested-walk-0', kind: 'normal', done: false}]}]} as Workout;
}
