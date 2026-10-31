import {finished, inProgress} from './engine';
import type {LibraryExercise} from './library';
import {workoutsSchema, type CATEGORIES, type ExerciseEntry, type PlateSetup, type Workout, type WorkoutSet, type Workouts} from './schema';

/**
 * Session AK (4.9): the workout log's depth, pure and tested — supersets, how hard a set felt (RPE), an exercise's own
 * rest time, the warm-up and plate calculators, weekly sets and volume per muscle group, and muscle freshness. What the
 * best apps do (Strong: warm-up and plate calculators; Hevy: supersets, RPE, sets per muscle; Fitbod: muscle recovery
 * over about six days). Every number is from the person's own log; freshness is labelled an estimate wherever shown.
 */
const parse = (w: Workouts) => workoutsSchema.parse(w);
const editCurrent = (w: Workouts, change: (x: Workout) => Workout): Workouts => {
  const current = inProgress(w); if (!current) throw Error('No workout is in progress.');
  return parse({...w, workouts: w.workouts.map(x => x.id === current.id ? change(x) : x)});
};
const editEntry = (w: Workouts, entryId: string, change: (e: ExerciseEntry) => ExerciseEntry) => editCurrent(w, x => {
  if (!x.exercises.some(e => e.id === entryId)) throw Error('This exercise is no longer in the workout.');
  return {...x, exercises: x.exercises.map(e => e.id === entryId ? change(e) : e)};
});
const without = <T extends object, K extends keyof T>(o: T, key: K): Omit<T, K> => { const {[key]: _drop, ...rest} = o; void _drop; return rest; };

// ── RPE ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Rate of perceived exertion, 6 to 10 in half steps (10: nothing left; 8: about two reps left). */
export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;
export const RPE_WORDS: Record<number, string> = {6: 'easy, 4 or more reps left', 6.5: '3 to 4 reps left', 7: '3 reps left', 7.5: '2 to 3 reps left', 8: '2 reps left', 8.5: '1 to 2 reps left', 9: '1 rep left', 9.5: 'maybe 1 rep left', 10: 'nothing left'};
export const validRpe = (v: unknown): v is number => typeof v === 'number' && (RPE_VALUES as readonly number[]).includes(v);
export function setRpe(w: Workouts, entryId: string, setId: string, rpe: number | null): Workouts {
  if (rpe !== null && !validRpe(rpe)) throw Error('Choose an RPE from 6 to 10, in half steps.');
  return editEntry(w, entryId, e => {
    if (!e.sets.some(s => s.id === setId)) throw Error('This set is no longer here.');
    return {...e, sets: e.sets.map(s => s.id !== setId ? s : rpe === null ? without(s, 'rpe') as WorkoutSet : {...s, rpe})};
  });
}

// ── Supersets ──────────────────────────────────────────────────────────────────────────────────────────────────────
const newSupersetId = () => `ss-${crypto.randomUUID().slice(0, 8)}`;
/** Joins an exercise and the one after it into a superset (both groups merge when either already has one). */
export function supersetWithNext(w: Workouts, entryId: string): Workouts {
  return editCurrent(w, x => {
    const i = x.exercises.findIndex(e => e.id === entryId), here = x.exercises[i], next = x.exercises[i + 1];
    if (!here) throw Error('This exercise is no longer in the workout.');
    if (!next) throw Error('Add another exercise after this one first; a superset joins exercises done back to back.');
    const id = here.supersetId ?? next.supersetId ?? newSupersetId(), merge = new Set([here.supersetId, next.supersetId].filter(Boolean));
    return {...x, exercises: x.exercises.map((e, j) => j === i || j === i + 1 || (e.supersetId && merge.has(e.supersetId)) ? {...e, supersetId: id} : e)};
  });
}
/** Takes an exercise out of its superset; a superset left with one exercise ends. */
export function leaveSuperset(w: Workouts, entryId: string): Workouts {
  return editCurrent(w, x => {
    const target = x.exercises.find(e => e.id === entryId);
    if (!target?.supersetId) return x;
    const group = target.supersetId, left = x.exercises.filter(e => e.supersetId === group && e.id !== entryId);
    return {...x, exercises: x.exercises.map(e => e.id === entryId || (left.length < 2 && e.supersetId === group) ? without(e, 'supersetId') as ExerciseEntry : e)};
  });
}
/** "A", "B", … for each superset in the order it first appears (exercises without one are left out). */
export function supersetLabels(entries: readonly Pick<ExerciseEntry, 'id' | 'supersetId'>[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const e of entries) if (e.supersetId) counts.set(e.supersetId, (counts.get(e.supersetId) ?? 0) + 1);
  const letters = new Map<string, string>(), out = new Map<string, string>();
  for (const e of entries) {
    if (!e.supersetId || (counts.get(e.supersetId) ?? 0) < 2) continue;
    if (!letters.has(e.supersetId)) letters.set(e.supersetId, String.fromCharCode(65 + letters.size % 26));
    out.set(e.id, letters.get(e.supersetId)!);
  }
  return out;
}

// ── Rest ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** An exercise's own rest after a set (null goes back to the workout-wide setting). */
export function setExerciseRest(w: Workouts, entryId: string, seconds: number | null): Workouts {
  if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0 || seconds > 900)) throw Error('Choose a rest time from 0 to 15 minutes.');
  return editEntry(w, entryId, e => seconds === null ? without(e, 'restSeconds') as ExerciseEntry : {...e, restSeconds: Math.round(seconds)});
}
export const restFor = (w: Pick<Workouts, 'restSeconds'>, e: Pick<ExerciseEntry, 'restSeconds'>) => e.restSeconds ?? w.restSeconds;
/**
 * The rest after a set of this exercise: in a superset, none until the last exercise of the round (the next exercise is
 * the break), then the longest rest any member asks for.
 */
export function restAfter(w: Pick<Workouts, 'restSeconds'>, workout: Pick<Workout, 'exercises'>, entryId: string): number {
  const e = workout.exercises.find(x => x.id === entryId);
  if (!e) return w.restSeconds;
  if (!e.supersetId) return restFor(w, e);
  const group = workout.exercises.filter(x => x.supersetId === e.supersetId);
  if (group.length < 2) return restFor(w, e);
  return group.at(-1)!.id === entryId ? Math.max(...group.map(x => restFor(w, x))) : 0;
}

// ── Plates ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BAR_CHOICES = {kg: [20, 15, 10], lb: [45, 35]} as const;
export function defaultPlates(unit: 'kg' | 'lb'): PlateSetup {
  return unit === 'kg'
    ? {unit, bar: 20, plates: [[25, 4], [20, 2], [15, 2], [10, 2], [5, 2], [2.5, 2], [1.25, 2]].map(([size, pairs]) => ({size: size!, pairs: pairs!}))}
    : {unit, bar: 45, plates: [[45, 4], [35, 2], [25, 2], [10, 2], [5, 2], [2.5, 2]].map(([size, pairs]) => ({size: size!, pairs: pairs!}))};
}
/** The saved bar and plates when they are in the unit the page shows, else the standard set for that unit. */
export const platesFor = (w: Workouts, unit: 'kg' | 'lb'): PlateSetup => w.plates?.unit === unit ? w.plates : defaultPlates(unit);
export function savePlates(w: Workouts, setup: PlateSetup): Workouts {
  if (!(setup.bar >= 0 && setup.bar <= 100)) throw Error('Enter a bar weight from 0 to 100.');
  const plates = setup.plates.filter(p => p.size > 0 && p.pairs > 0);
  if (plates.length > 12) throw Error('Up to 12 plate sizes fit.');
  if (plates.some(p => !(p.size <= 100) || !Number.isInteger(p.pairs) || p.pairs > 20)) throw Error('Plates go from 0.1 to 100, with up to 20 pairs of each.');
  return parse({...w, plates: {unit: setup.unit, bar: setup.bar, plates: [...plates].sort((a, b) => b.size - a.size)}});
}
export type PlateLoad = {perSide: number[]; total: number; exact: boolean; belowBar: boolean};
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
/**
 * The plates for each side of the bar, in the setup's own unit: the load closest to the target the plates allow (a tie
 * goes to the lighter), with the fewest plates. `exact` is false when the plates cannot make the target.
 */
export function plateLoad(target: number, setup: PlateSetup): PlateLoad {
  const bar = setup.bar;
  if (!Number.isFinite(target) || target <= bar) return {perSide: [], total: bar, exact: Number.isFinite(target) && Math.abs(target - bar) < 1e-9, belowBar: !(target >= bar)};
  const plates = setup.plates.filter(p => p.size > 0 && p.pairs > 0).sort((a, b) => b.size - a.size);
  const scaled = plates.map(p => Math.round(p.size * 1000)), step = scaled.reduce((g, n) => gcd(g, n), 0) || 1;
  const goal = Math.round((target - bar) / 2 * 1000 / step), biggest = Math.max(0, ...scaled.map(n => n / step)), limit = goal + biggest;
  // Reachable per-side loads (in steps) and the fewest plates for each; bounded by the goal plus one plate.
  let states = new Map<number, number[]>([[0, []]]);
  plates.forEach((p, i) => {
    const units = scaled[i]! / step, next = new Map(states);
    for (const [sum, list] of states) for (let k = 1; k <= p.pairs && sum + k * units <= limit; k++) {
      const s = sum + k * units, have = next.get(s);
      if (!have || have.length > list.length + k) next.set(s, [...list, ...Array<number>(k).fill(p.size)]);
    }
    states = next;
  });
  let best = 0;
  for (const s of states.keys()) { const d = Math.abs(s - goal), b = Math.abs(best - goal); if (d < b || (d === b && s < best)) best = s; }
  const perSide = states.get(best)!, side = perSide.reduce((t, x) => t + x, 0), total = Math.round((bar + 2 * side) * 1000) / 1000;
  return {perSide, total, exact: Math.abs(total - target) < 1e-6, belowBar: false};
}

// ── Warm-up ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** The ramp: the empty bar for 10, then 40 % × 5, 60 % × 3 and 80 % × 1 of the working weight. */
export const WARMUP_STEPS: readonly {share: number; reps: number}[] = [{share: 0, reps: 10}, {share: 0.4, reps: 5}, {share: 0.6, reps: 3}, {share: 0.8, reps: 1}];
/**
 * Warm-up sets for a working weight, in the setup's unit, each rounded to what the bar and plates can load. A step that
 * rounds to the bar, to the step before or to the working weight itself is left out.
 */
export function warmupRamp(working: number, setup: PlateSetup): {weight: number; reps: number}[] {
  if (!Number.isFinite(working) || working <= setup.bar) return [];
  const out: {weight: number; reps: number}[] = [];
  for (const step of WARMUP_STEPS) {
    const weight = step.share === 0 ? setup.bar : plateLoad(working * step.share, setup).total;
    if (weight >= working || out.some(s => Math.abs(s.weight - weight) < 1e-9) || (step.share > 0 && weight <= setup.bar)) continue;
    out.push({weight, reps: step.reps});
  }
  return out;
}
/**
 * Puts warm-up sets (weights in kg) before an exercise's working sets, replacing the warm-ups not yet ticked; ticked
 * warm-ups stay. Up to 50 sets fit in one exercise.
 */
export function addWarmups(w: Workouts, entryId: string, ramp: readonly {weightKg: number; reps: number}[]): Workouts {
  return editEntry(w, entryId, e => {
    if (e.measure !== 'weight-reps') throw Error('Warm-up sets need an exercise with weight and reps.');
    const kept = e.sets.filter(s => s.kind !== 'warmup' || s.done), done = kept.filter(s => s.kind === 'warmup'), rest = kept.filter(s => s.kind !== 'warmup');
    const fresh: WorkoutSet[] = ramp.map(r => ({id: `set-${crypto.randomUUID()}`, kind: 'warmup', weightKg: Math.round(r.weightKg * 1000) / 1000, reps: r.reps, done: false}));
    const sets = [...done, ...fresh, ...rest];
    if (sets.length > 50) throw Error('Up to 50 sets fit in one exercise.');
    return {...e, sets};
  });
}
/** The heaviest working weight typed so far in an exercise (kg), the one the ramp builds up to. */
export const workingWeightKg = (e: Pick<ExerciseEntry, 'sets'>) => Math.max(0, ...e.sets.filter(s => s.kind !== 'warmup' && s.weightKg !== undefined).map(s => s.weightKg!)) || null;

// ── Muscle groups ──────────────────────────────────────────────────────────────────────────────────────────────────
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;
export type MuscleGroup = typeof MUSCLE_GROUPS[number];
/** Which muscle groups an exercise category works. A full-body exercise works legs, back, shoulders and core. */
export const CATEGORY_MUSCLES: Record<typeof CATEGORIES[number], readonly MuscleGroup[]> = {
  Chest: ['Chest'], Back: ['Back'], Legs: ['Legs'], Shoulders: ['Shoulders'], Arms: ['Arms'], Core: ['Core'],
  'Full body': ['Legs', 'Back', 'Shoulders', 'Core'], Cardio: [], Mobility: [],
};
type CategoryLookup = (exerciseId: string) => typeof CATEGORIES[number] | null;
export const categoryLookup = (library: readonly Pick<LibraryExercise, 'id' | 'category'>[]): CategoryLookup => {
  const map = new Map(library.map(e => [e.id, e.category]));
  return id => map.get(id) ?? null;
};
const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
const working = (s: WorkoutSet) => s.kind !== 'warmup';
export type MuscleWeekRow = {muscle: MuscleGroup; sets: number; volumeKg: number};
/**
 * Sets and volume (weight × reps, weighted lifts only) per muscle group from Monday to `today`. A set counts once for
 * each muscle group its exercise works; a full-body set's volume is shared among its groups. Warm-ups are left out.
 * `unmapped` counts working sets whose exercise has no known group (cardio and mobility are not counted at all).
 */
export function weeklyMuscleVolume(w: Workouts, lookup: CategoryLookup, today: string): {from: string; rows: MuscleWeekRow[]; unmapped: number} {
  const n = dayNumber(today), weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const from = new Date((n - weekday) * DAY).toISOString().slice(0, 10);
  const rows = new Map<MuscleGroup, MuscleWeekRow>(MUSCLE_GROUPS.map(m => [m, {muscle: m, sets: 0, volumeKg: 0}]));
  let unmapped = 0;
  for (const x of finished(w)) {
    if (x.date < from || x.date > today) continue;
    for (const e of x.exercises) {
      const sets = e.sets.filter(working), category = lookup(e.exerciseId);
      if (!sets.length) continue;
      if (!category) { unmapped += sets.length; continue; }
      const groups = CATEGORY_MUSCLES[category];
      const volume = e.measure === 'weight-reps' ? sets.reduce((t, s) => t + (s.weightKg ?? 0) * (s.reps ?? 0), 0) : 0;
      for (const g of groups) { const r = rows.get(g)!; r.sets += sets.length; r.volumeKg += volume / groups.length; }
    }
  }
  return {from, rows: [...rows.values()].map(r => ({...r, volumeKg: Math.round(r.volumeKg * 10) / 10})), unmapped};
}

/** Muscle freshness, an estimate: a muscle group recovers fully over this many days after training it. */
export const RECOVERY_DAYS = 6;
/** How much one working set tires a muscle group, in points of 100 (a session's total is capped at 100). */
export const FATIGUE_PER_SET = 12;
export type Freshness = {muscle: MuscleGroup; lastDate: string | null; daysSince: number | null; freshness: number | null};
/**
 * Per muscle group: when it was last trained, days since, and an estimated freshness from 0 to 100. Each session tires a
 * group by its working sets × 12 (at most 100), and that recovers in a straight line over 6 days; freshness is 100 less
 * what is still to recover. A group never trained in the log has no freshness (unknown, not 100).
 */
export function muscleFreshness(w: Workouts, lookup: CategoryLookup, now: Date, today: string): Freshness[] {
  const last = new Map<MuscleGroup, string>(), tired = new Map<MuscleGroup, number>(MUSCLE_GROUPS.map(m => [m, 0]));
  for (const x of finished(w)) {
    if (x.date > today) continue;
    const ended = Date.parse(x.endedAt!), age = Math.max(0, (now.getTime() - ended) / DAY), left = Math.max(0, 1 - age / RECOVERY_DAYS);
    const sets = new Map<MuscleGroup, number>();
    for (const e of x.exercises) {
      const category = lookup(e.exerciseId); if (!category) continue;
      const n = e.sets.filter(working).length; if (!n) continue;
      for (const g of CATEGORY_MUSCLES[category]) sets.set(g, (sets.get(g) ?? 0) + n);
    }
    for (const [g, n] of sets) {
      if (!last.has(g) || x.date > last.get(g)!) last.set(g, x.date);
      if (left > 0) tired.set(g, tired.get(g)! + Math.min(100, n * FATIGUE_PER_SET) * left);
    }
  }
  return MUSCLE_GROUPS.map(muscle => {
    const date = last.get(muscle) ?? null;
    return {muscle, lastDate: date, daysSince: date === null ? null : Math.max(0, dayNumber(today) - dayNumber(date)), freshness: date === null ? null : Math.round(Math.max(0, 100 - tired.get(muscle)!))};
  });
}
