import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AH Part 6 (DE8; N-083, N-084, N-085): the workout log, `TIER 3 (stored format)`. A new device-only key, loose and
 * versioned, so a later field never makes this build refuse the record and older builds simply do not read it. Weights
 * are kept in kilograms (three decimals); the page shows the Health weight unit. A workout without `endedAt` is the one
 * in progress (it survives a reload). Templates ("routines") keep exercises and planned sets only.
 */
export const WORKOUTS_KEY = 'zigoals:workouts:v1';
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const SET_KINDS = ['warmup', 'normal', 'drop', 'failure'] as const;
export const MEASURES = ['weight-reps', 'reps', 'time', 'distance-time'] as const;
export const WORKOUT_TYPES = ['strength', 'cardio', 'mobility', 'sport', 'other'] as const;
export const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body', 'Cardio', 'Mobility'] as const;
/**
 * Session AK (4.9; TIER 3 (stored format), additive): an exercise may belong to a superset (exercises sharing one
 * `supersetId` are done back to back) and may keep its own rest time (seconds; 0 = no rest timer for it). Both optional
 * and tolerant, on loose records, so older builds keep them and never refuse the log.
 */
const entryExtras = {
  supersetId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/).optional().catch(undefined),
  restSeconds: z.number().int().min(0).max(900).optional().catch(undefined),
  /**
   * Session AV lane 2 (body; LEDGER #202, Strong's assisted and weighted bodyweight; TIER 3 (stored format), additive): a
   * reps exercise done with added weight (a belt, a vest) or with help (an assisted machine, a band). The measure stays
   * `reps` (a new MEASURES value would make older builds refuse the log); each set keeps `addedKg` or `assistKg`.
   */
  load: z.enum(['weighted', 'assisted']).optional().catch(undefined),
};
export const setSchema = z.looseObject({
  id,
  kind: z.enum(SET_KINDS).default('normal'),
  reps: z.number().int().min(0).max(1000).optional(),
  weightKg: z.number().finite().min(0).max(1000).optional(),
  distanceKm: z.number().finite().min(0).max(1000).optional(),
  seconds: z.number().int().min(0).max(86_400).optional(),
  done: z.boolean().default(false),
  /**
   * Session AK (4.9; TIER 3 (stored format), additive): how hard the set felt, RPE 6 to 10 in half steps. Optional and
   * tolerant: an unreadable value is dropped, never a reason to refuse the record; older builds keep it untouched (loose).
   */
  rpe: z.number().min(6).max(10).multipleOf(0.5).optional().catch(undefined),
  /** Session AV lane 2 (body; LEDGER #202; additive): weight added to a bodyweight set, or the help taken off it, in kg. */
  addedKg: z.number().finite().min(0).max(500).optional().catch(undefined),
  assistKg: z.number().finite().min(0).max(500).optional().catch(undefined),
});
export const exerciseEntrySchema = z.looseObject({
  id, exerciseId: z.string().min(1).max(80), name: z.string().trim().min(1).max(80),
  measure: z.enum(MEASURES).default('weight-reps'),
  sets: z.array(setSchema).max(50),
  note: z.string().max(500).optional(),
  ...entryExtras,
});
export const workoutSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(80), date: day, type: z.enum(WORKOUT_TYPES).default('strength'),
  startedAt: z.iso.datetime({offset: true}), endedAt: z.iso.datetime({offset: true}).optional(),
  exercises: z.array(exerciseEntrySchema).max(40),
  notes: z.string().max(1000).optional(),
  /** The Health activity this workout wrote its minutes to, so editing or removing it keeps them in step. */
  activityId: z.string().max(120).optional(),
  templateId: id.optional(),
  /** Session AV lane 2 (body; LEDGER #203, Nike Run Club's shoe tagging; additive): the shoes this run was in. */
  shoeId: id.optional().catch(undefined),
  /**
   * Session AJ (item 27, D12; TIER 3 (stored format)): a workout imported from a GPX or TCX file keeps its summary here,
   * never the route's points. Optional and tolerant: an unreadable value is dropped, never a reason to refuse the record.
   */
  imported: z.looseObject({
    source: z.enum(['gpx', 'tcx']),
    importId: z.string().regex(/^[A-Za-z0-9-]{1,60}$/),
    sport: z.string().max(40),
    distanceKm: z.number().finite().min(0).max(2000).optional(),
    elevationM: z.number().finite().min(0).max(20_000).optional(),
    avgHr: z.number().int().min(20).max(250).optional(),
    durationSeconds: z.number().int().min(0).max(172_800),
  }).optional().catch(undefined),
  /**
   * Session AK (4.7, A15; TIER 3 (stored format), additive): a workout brought in from a FIT file, a Strava export or
   * another app (Strong, Hevy). `imported.source` above is an enum older builds check, so a new source there would make
   * them drop the summary; the new sources live in this NEW optional key instead. The summary only, never points.
   */
  fileImport: z.looseObject({
    source: z.string().regex(/^[a-z0-9-]{1,20}$/),
    importId: z.string().regex(/^[A-Za-z0-9-]{1,80}$/),
    sport: z.string().max(40).optional(),
    distanceKm: z.number().finite().min(0).max(2000).optional(),
    elevationM: z.number().finite().min(0).max(20_000).optional(),
    avgHr: z.number().int().min(20).max(250).optional(),
    durationSeconds: z.number().int().min(0).max(172_800).optional(),
  }).optional().catch(undefined),
  /**
   * Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak's workout journal; TIER 3 (stored format), additive): up to
   * four photos of a finished workout, by id — the photos themselves stay in this browser's IndexedDB
   * (`zigoals-workout-photos-v1`, lib/workouts/photos.ts), never uploaded — and a star that puts it in Favourites. Both
   * optional and tolerant on the loose workout: an unreadable value is dropped alone; older builds keep them untouched.
   */
  photos: z.array(z.string().regex(/^wph-[A-Za-z0-9-]{8,80}$/)).max(4).optional().catch(undefined),
  star: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2, round 6 (body; LEDGER #421, Caliber's deload week; TIER 3 (stored format), additive): "Light week
   * (not in my bests)" on a finished workout — its sets stay in the history, the calendar and the volume, but the bests,
   * the "new best" marks and the progression's next weights leave it out. Optional and tolerant on the loose workout.
   */
  light: z.boolean().optional().catch(undefined),
});
/**
 * Session AV lane 2 (body; TIER 3 (stored format), additive; Hevy's routine folders and notes, MacroFactor's progression):
 * a routine may sit in a folder, keep a note, name the ready-made routine it was copied from (`guideId`, so its written
 * form tips stay at hand) and keep a progression rule — `double`: when every working set reached `maxReps`, the next
 * session adds `stepKg` and starts again at `minReps`; `linear`: every session adds `stepKg` once all working sets were
 * done. All optional and tolerant (an unreadable value is dropped, never a reason to refuse the log); older builds keep
 * them untouched (loose objects).
 */
export const PROGRESSION_KINDS = ['double', 'linear'] as const;
export const progressionSchema = z.looseObject({
  kind: z.enum(PROGRESSION_KINDS),
  minReps: z.number().int().min(1).max(50).optional(),
  maxReps: z.number().int().min(1).max(50).optional(),
  stepKg: z.number().finite().min(0.25).max(20),
}).refine(p => p.kind !== 'double' || (p.minReps !== undefined && p.maxReps !== undefined && p.minReps < p.maxReps), 'A double progression needs a rep range, lowest first.');
export type Progression = z.infer<typeof progressionSchema>;
export const templateSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(80), type: z.enum(WORKOUT_TYPES).default('strength'),
  exercises: z.array(z.looseObject({exerciseId: z.string().min(1).max(80), name: z.string().trim().min(1).max(80), measure: z.enum(MEASURES).default('weight-reps'),
    sets: z.array(setSchema.omit({id: true, done: true})).max(50), ...entryExtras})).max(40),
  createdAt: z.iso.datetime({offset: true}),
  folder: z.string().trim().min(1).max(40).optional().catch(undefined),
  note: z.string().max(500).optional().catch(undefined),
  guideId: z.string().regex(/^[a-z0-9-]{1,60}$/).optional().catch(undefined),
  progression: progressionSchema.optional().catch(undefined),
  /**
   * Session AV lane 2, round 5 (gym; LEDGER #373, Bevel's Auto Update Template; TIER 3 (stored format), additive): "Keep my
   * last weights" — finishing a workout started from this routine writes its done sets' weights and reps back into it.
   * Optional and tolerant on the loose routine; older builds keep it untouched and simply do not write back.
   */
  keepWeights: z.boolean().optional().catch(undefined),
});
/**
 * Session AV lane 2 (body; TIER 3 (stored format), additive; Strava's goals): a distance goal for a week, a month or a
 * year, for one sport or for all of them. Counted from the person's own log (distance sets and imported files).
 */
export const GOAL_SPORTS = ['run', 'ride', 'swim', 'walk', 'any'] as const;
export const GOAL_PERIODS = ['week', 'month', 'year'] as const;
export const distanceGoalSchema = z.looseObject({id, sport: z.enum(GOAL_SPORTS), period: z.enum(GOAL_PERIODS), km: z.number().finite().min(1).max(100_000), createdAt: z.iso.datetime({offset: true})});
export type DistanceGoal = z.infer<typeof distanceGoalSchema>;
const exerciseKey = z.string().min(1).max(80).refine(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'Not an exercise id.');
/** Session AV lane 2, round 6 (LEDGER #420, #422, #424): the limits and item shapes of the round's three workout-record parts. */
export const MAX_FAVOURITE_EXERCISES = 100, ALL_EXERCISES_KEY = '*';
const bestsFromDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const exerciseDefaultsSchema = z.looseObject({
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100).optional().catch(undefined),
  seconds: z.number().int().min(1).max(3600).optional().catch(undefined),
  restSeconds: z.number().int().min(0).max(900).optional().catch(undefined),
});
export type ExerciseDefaults = z.infer<typeof exerciseDefaultsSchema>;
/** A record's readable entries only (at most `max`), so one bad entry is dropped alone; anything else is no record. */
function keepValid(v: unknown, item: z.ZodType, max: number): unknown {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k, x]) => exerciseKey.safeParse(k).success && item.safeParse(x).success).slice(0, max));
}
export const customExerciseSchema = z.looseObject({id, name: z.string().trim().min(1).max(80), category: z.enum(CATEGORIES), measure: z.enum(MEASURES), load: entryExtras.load});
/**
 * Session AV lane 2 (body; LEDGER #203; TIER 3 (stored format), additive): a pair of shoes — its name, the distance it had
 * before it was added here, the distance to retire it at, and when it was retired (kept for its history).
 */
export const shoeSchema = z.looseObject({id, name: z.string().trim().min(1).max(60), startKm: z.number().finite().min(0).max(20_000), retireKm: z.number().finite().min(50).max(20_000), createdAt: z.iso.datetime({offset: true}), retiredAt: z.iso.datetime({offset: true}).optional().catch(undefined)});
export type Shoe = z.infer<typeof shoeSchema>;
export const workoutsSchema = z.looseObject({
  version: z.literal(1),
  workouts: z.array(workoutSchema).max(3000),
  templates: z.array(templateSchema).max(50),
  exercises: z.array(customExerciseSchema).max(200),
  /** Seconds of rest after a finished set; 0 turns the rest timer off. */
  restSeconds: z.number().int().min(0).max(900).default(90),
  /**
   * Session AK (4.9; TIER 3 (stored format), additive): the plate calculator's bar and plates, in the unit they are
   * written in (kg or lb). Optional and tolerant; without it the calculator starts from a standard gym set.
   */
  plates: z.looseObject({
    unit: z.enum(['kg', 'lb']),
    bar: z.number().finite().min(0).max(100),
    plates: z.array(z.looseObject({size: z.number().finite().min(0.1).max(100), pairs: z.number().int().min(0).max(20)})).max(12),
    /**
     * Session AV lane 2, round 5 (gym; LEDGER #378, Bevel's single-sided plate calculator; TIER 3 (stored format), additive):
     * "Loaded on one side" — every plate goes on one horn of a machine or sled — and that machine's or sled's own weight,
     * which takes the bar's place (0–500, in the setup's unit). Each optional and tolerant on its own: a bad value is
     * dropped alone, never the bar and plates; older builds keep both untouched and count plates for each side as before.
     */
    oneSide: z.boolean().optional().catch(undefined),
    start: z.number().finite().min(0).max(500).optional().catch(undefined),
  }).optional().catch(undefined),
  /**
   * Session AV lane 2 (body; TIER 3 (stored format), additive; Hevy's pinned exercise notes): one note per exercise that
   * shows every time it is done (seat height, grip), by exercise id. Optional and tolerant, as above.
   */
  pinnedNotes: z.record(exerciseKey, z.string().trim().min(1).max(500)).refine(r => Object.keys(r).length <= 300, 'Up to 300 pinned notes.').optional().catch(undefined),
  /** Session AV lane 2 (body; TIER 3 (stored format), additive): up to 12 distance goals (above). */
  distanceGoals: z.array(distanceGoalSchema).max(12).optional().catch(undefined),
  /** Session AV lane 2 (body; LEDGER #201, Strong's unit per exercise; additive): an exercise shown in kg or lb; the sets stay in kg. */
  exerciseUnits: z.record(exerciseKey, z.enum(['kg', 'lb'])).refine(r => Object.keys(r).length <= 300, 'Up to 300 exercise units.').optional().catch(undefined),
  /** Session AV lane 2 (body; LEDGER #203; additive): up to 30 pairs of shoes. */
  shoes: z.array(shoeSchema).max(30).optional().catch(undefined),
  /** Session AV lane 2 (body; LEDGER #204, Nike Run Club's PR achievements; additive): the run bests already marked ("<workout id>:<km>"), so each is marked once. */
  seenBests: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,80}:[0-9.]{1,8}$/)).max(100).optional().catch(undefined),
  /**
   * Session AV lane 2, round 6 (body; Caliber; TIER 3 (stored format), additive, each optional and tolerant on its own):
   * - `favouriteExercises` (LEDGER #420): the starred exercises' ids, shown first when adding an exercise (up to 100).
   * - `bestsFrom` (LEDGER #422): "Count bests from today" — the first day whose sets count for an exercise's bests, by
   *   exercise id, or for every exercise under `*`; earlier sets stay in the history and show as "before".
   * - `exerciseDefaults` (LEDGER #424): an exercise's own sets, reps or time and rest, by exercise id (a library one or
   *   the person's own), used when it is added with no earlier sets of it. One map for both kinds, so one reader.
   * An item this build cannot read is dropped alone; older builds keep the three untouched (the record is loose).
   */
  favouriteExercises: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter(x => exerciseKey.safeParse(x).success))].slice(0, MAX_FAVOURITE_EXERCISES) : undefined, z.array(exerciseKey).max(MAX_FAVOURITE_EXERCISES).optional()).optional().catch(undefined),
  bestsFrom: z.preprocess(v => keepValid(v, bestsFromDay, 300), z.record(exerciseKey, bestsFromDay).optional()).optional().catch(undefined),
  exerciseDefaults: z.preprocess(v => keepValid(v, exerciseDefaultsSchema, 300), z.record(exerciseKey, exerciseDefaultsSchema).optional()).optional().catch(undefined),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export type ExerciseEntry = z.infer<typeof exerciseEntrySchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutTemplate = z.infer<typeof templateSchema>;
export type CustomExercise = z.infer<typeof customExerciseSchema>;
export type Workouts = z.infer<typeof workoutsSchema>;
export type Measure = typeof MEASURES[number];
export type PlateSetup = NonNullable<Workouts['plates']>;
export const emptyWorkouts = (): Workouts => ({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90});
export const WORKOUTS: DeviceRecordSpec<Workouts> = {key: WORKOUTS_KEY, schema: workoutsSchema, empty: emptyWorkouts};
