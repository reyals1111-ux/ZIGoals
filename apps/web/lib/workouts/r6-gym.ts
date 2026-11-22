import {ALL_EXERCISES_KEY, exerciseDefaultsSchema, MAX_FAVOURITE_EXERCISES, workoutsSchema, type ExerciseDefaults, type Workouts} from './schema';
import type {LibraryExercise} from './library';

/**
 * Session AV lane 2, round 6 (r6-body; Caliber, LEDGER #420, #421, #422, #424): the round's workout-record edits, pure —
 * a star on an exercise (Favourites first when adding one), a light week left out of the bests, "Count bests from today"
 * for one exercise or all, and an exercise's own defaults. Every edit returns a parsed record or throws a sentence.
 */
const parse = (w: Workouts) => workoutsSchema.parse(w);
const without = <T extends object>(x: T, key: string): T => { const rest = {...x} as Record<string, unknown>; delete rest[key]; return rest as T; };

/** #420: stars or unstars an exercise (a new star goes last). */
export function setFavouriteExercise(w: Workouts, exerciseId: string, on: boolean): Workouts {
  const list = (w.favouriteExercises ?? []).filter(x => x !== exerciseId);
  if (on && list.length >= MAX_FAVOURITE_EXERCISES) throw Error(`Up to ${MAX_FAVOURITE_EXERCISES} favourite exercises fit. Unstar one first.`);
  const next = on ? [...list, exerciseId] : list;
  return parse(next.length ? {...w, favouriteExercises: next} : without(w, 'favouriteExercises'));
}
export const isFavouriteExercise = (w: Pick<Workouts, 'favouriteExercises'>, exerciseId: string) => (w.favouriteExercises ?? []).includes(exerciseId);
/** The favourites among `found`, in the order they were starred, then the rest as they were. */
export function favouritesFirst<T extends Pick<LibraryExercise, 'id'>>(found: readonly T[], w: Pick<Workouts, 'favouriteExercises'>): {favourites: T[]; rest: T[]} {
  const order = w.favouriteExercises ?? [], byId = new Map(found.map(x => [x.id, x]));
  const favourites = order.map(id => byId.get(id)).filter((x): x is T => !!x);
  return {favourites, rest: found.filter(x => !order.includes(x.id))};
}

/** #421: a finished workout as a light week (its sets leave the bests, the "new best" marks and the next weights), or not. */
export function setLight(w: Workouts, workoutId: string, on: boolean): Workouts {
  const x = w.workouts.find(y => y.id === workoutId);
  if (!x) throw Error('This workout is no longer here.');
  if (!x.endedAt) throw Error('Finish the workout first.');
  return parse({...w, workouts: w.workouts.map(y => y.id !== workoutId ? y : on ? {...y, light: true} : without(y, 'light'))});
}

/** #422: "Count bests from today" for one exercise, or for every exercise (`*`); null counts every workout again. */
export function setBestsFrom(w: Workouts, exerciseId: string, day: string | null): Workouts {
  if (day !== null && !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('Not a day.');
  const map = {...(w.bestsFrom ?? {})};
  if (day) map[exerciseId] = day; else delete map[exerciseId];
  return parse(Object.keys(map).length ? {...w, bestsFrom: map} : without(w, 'bestsFrom'));
}
export {ALL_EXERCISES_KEY};

/** #424: an exercise's own defaults (null removes them); reps for weight and reps, time for a timed one. */
export function setExerciseDefaults(w: Workouts, exerciseId: string, defaults: ExerciseDefaults | null): Workouts {
  const map = {...(w.exerciseDefaults ?? {})};
  if (defaults) {
    const parsed = exerciseDefaultsSchema.safeParse(defaults);
    if (!parsed.success || parsed.data.reps !== defaults.reps || parsed.data.seconds !== defaults.seconds || parsed.data.restSeconds !== defaults.restSeconds) throw Error('Choose 1 to 20 sets, 1 to 100 reps or 1 to 3600 seconds, and a rest of 0 to 900 seconds.');
    map[exerciseId] = JSON.parse(JSON.stringify(parsed.data)) as ExerciseDefaults;
  } else delete map[exerciseId];
  return parse(Object.keys(map).length ? {...w, exerciseDefaults: map} : without(w, 'exerciseDefaults'));
}
const restText = (s: number) => s === 0 ? 'no rest timer' : s % 60 === 0 ? `${s / 60} min rest` : s > 60 ? `${Math.floor(s / 60)} min ${s % 60} s rest` : `${s} s rest`;
/** "3 × 8, 2 min rest", "3 × 45 s", "4 sets". */
export function defaultsWords(d: ExerciseDefaults): string {
  const each = d.reps !== undefined ? ` × ${d.reps}` : d.seconds !== undefined ? ` × ${d.seconds} s` : '';
  return `${each ? `${d.sets}${each}` : `${d.sets} ${d.sets === 1 ? 'set' : 'sets'}`}${d.restSeconds !== undefined ? `, ${restText(d.restSeconds)}` : ''}`;
}
