import {freshnessWithRecovery, type MuscleRecovery} from '../muscle-freshness/model';
import {categoryLookup, CATEGORY_MUSCLES, MUSCLE_GROUPS, type MuscleGroup} from './depth';
import {finished} from './engine';
import {availableWith} from './equipment';
import {EXERCISES, type LibraryExercise} from './library';
import {targetFor, type Target} from './progression';
import type {Place} from './places-schema';
import type {Measure, Workout, Workouts, WorkoutTemplate} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #240, Fitbod's workout made for today): "Suggest a workout", pure. No programme is
 * written for the person and nothing is invented: it picks 4–6 of the built-in exercises for today's freshest muscle groups
 * (the freshness estimate of lib/muscle-freshness/model.ts, with the person's own recovery days), only what the chosen
 * place's equipment allows, preferring exercises already in the person's log; the length (30, 45 or 60 minutes) sets how
 * many exercises and groups. Sets, weights and reps come from the person's own last sessions through a progression rule:
 * a routine's own rule where the exercise is in one, else a rep range of 8 to 12 (one more rep each time; at 12 on every
 * set, +2.5 kg). An exercise new to the log gets no weight, only a starting number of reps. It is a suggestion to edit
 * before starting, never a plan; nothing is stored until it is started (an ordinary workout). Never calories.
 */
export const LENGTHS = [30, 45, 60] as const;
export type Length = typeof LENGTHS[number];
const SHAPE: Record<Length, {exercises: number; groups: number; sets: number}> = {30: {exercises: 4, groups: 2, sets: 3}, 45: {exercises: 5, groups: 3, sets: 3}, 60: {exercises: 6, groups: 3, sets: 4}};
export const FRESH_ENOUGH = 60, DEFAULT_RULE = {kind: 'double' as const, minReps: 8, maxReps: 12, stepKg: 2.5};
const STRENGTH = new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body']);
export type SuggestedSet = {weightKg?: number; reps?: number; seconds?: number};
export type Suggested = {exerciseId: string; name: string; measure: Measure; group: MuscleGroup; sets: SuggestedSet[]; from: Target['why'] | 'new'; lastDate?: string; rule: 'routine' | 'default' | null};
export type Suggestion = {minutes: Length; place: string | null; groups: {muscle: MuscleGroup; freshness: number | null}[]; tired: boolean; exercises: Suggested[]};

/** The sets for one exercise from the person's last sessions and a progression rule; blank reps for a new one. */
export function setsFor(w: Workouts, e: Pick<LibraryExercise, 'id' | 'measure'>, count: number, before?: string): Pick<Suggested, 'sets' | 'from' | 'lastDate' | 'rule'> {
  const own = w.templates.find(t => t.progression && t.exercises.some(x => x.exerciseId === e.id));
  const planned = {exerciseId: e.id, name: e.id, measure: e.measure, sets: Array.from({length: count}, () => ({kind: 'normal' as const}))};
  const routine: Pick<WorkoutTemplate, 'id' | 'exercises' | 'progression'> = own ? {...own, exercises: own.exercises.map(x => x.exerciseId === e.id ? {...x, sets: planned.sets} : x)} : {id: 'suggestion', exercises: [planned], progression: DEFAULT_RULE};
  const t = e.measure === 'distance-time' ? null : targetFor(w, routine, e.id, before);
  if (t) return {sets: t.sets.slice(0, count), from: t.why, lastDate: t.lastDate, rule: own ? 'routine' : 'default'};
  const blank: SuggestedSet = e.measure === 'time' ? {seconds: 30} : e.measure === 'distance-time' ? {} : {reps: 10};
  return {sets: Array.from({length: count}, () => ({...blank})), from: 'new', rule: null};
}

export function suggestWorkout(input: {w: Workouts; library: readonly Pick<LibraryExercise, 'id' | 'category'>[]; now: Date; today: string; recovery?: MuscleRecovery | null; place: Place | null; minutes: Length; skip?: readonly string[]}): Suggestion {
  const {w, now, today, place, minutes} = input, shape = SHAPE[minutes];
  const fresh = freshnessWithRecovery(w, categoryLookup(input.library), now, today, input.recovery ?? null);
  const byGroup = new Map(fresh.map(f => [f.muscle, f.freshness]));
  const ranked = [...MUSCLE_GROUPS].sort((a, b) => (byGroup.get(b) ?? 100) - (byGroup.get(a) ?? 100) || MUSCLE_GROUPS.indexOf(a) - MUSCLE_GROUPS.indexOf(b));
  const logged = new Map<string, number>();
  for (const x of finished(w)) for (const e of x.exercises) logged.set(e.exerciseId, (logged.get(e.exerciseId) ?? 0) + 1);
  const have = place ? place.equipment : null, skip = new Set(input.skip ?? []);
  const options = (g: MuscleGroup) => EXERCISES.filter(e => STRENGTH.has(e.category) && CATEGORY_MUSCLES[e.category].includes(g) && availableWith(e.id, have) && !skip.has(e.id))
    .sort((a, b) => Number(b.category === g) - Number(a.category === g) || (logged.get(b.id) ?? 0) - (logged.get(a.id) ?? 0) || EXERCISES.indexOf(a) - EXERCISES.indexOf(b));
  const groups = ranked.filter(g => options(g).length).slice(0, shape.groups);
  const chosen: {e: LibraryExercise; g: MuscleGroup}[] = [];
  for (let round = 0; chosen.length < shape.exercises && round < 6; round++) for (const g of groups) {
    if (chosen.length >= shape.exercises) break;
    const next = options(g).find(e => !chosen.some(c => c.e.id === e.id));
    if (next) chosen.push({e: next, g});
  }
  return {
    minutes, place: place?.name ?? null, groups: groups.map(g => ({muscle: g, freshness: byGroup.get(g) ?? null})),
    tired: groups.length > 0 && (byGroup.get(groups[0]!) ?? 100) < FRESH_ENOUGH,
    exercises: chosen.map(({e, g}, i) => ({exerciseId: e.id, name: e.name, measure: e.measure, group: g, ...setsFor(w, e, i < 2 ? shape.sets : Math.min(3, shape.sets), now.toISOString())})),
  };
}
/** Replaces one suggested exercise by another of the same group (Replace), its sets from the person's own log. */
export function swapSuggested(w: Workouts, s: Suggestion, exerciseId: string, by: Pick<LibraryExercise, 'id' | 'name' | 'measure'>, now: Date): Suggestion {
  return {...s, exercises: s.exercises.map(x => x.exerciseId === exerciseId ? {...x, exerciseId: by.id, name: by.name, measure: by.measure, ...setsFor(w, by, x.sets.length, now.toISOString())} : x)};
}
/** Removes one suggested exercise (the person edits before starting). */
export const dropSuggested = (s: Suggestion, exerciseId: string): Suggestion => ({...s, exercises: s.exercises.filter(x => x.exerciseId !== exerciseId)});
/** The suggestion as the workout `startWorkout` repeats: a name and the exercises with their sets to fill. */
export function suggestionAsWorkout(s: Suggestion, name = 'Suggested workout'): Workout {
  return {id: 'suggestion', name, date: '1970-01-01', type: 'strength', startedAt: new Date(0).toISOString(), exercises: s.exercises.map((x, i) => ({id: `suggested-${i}`, exerciseId: x.exerciseId, name: x.name, measure: x.measure, sets: x.sets.map((set, j) => ({id: `suggested-${i}-${j}`, kind: 'normal' as const, done: false, ...set}))}))} as Workout;
}
