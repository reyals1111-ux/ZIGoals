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
export const setSchema = z.looseObject({
  id,
  kind: z.enum(SET_KINDS).default('normal'),
  reps: z.number().int().min(0).max(1000).optional(),
  weightKg: z.number().finite().min(0).max(1000).optional(),
  distanceKm: z.number().finite().min(0).max(1000).optional(),
  seconds: z.number().int().min(0).max(86_400).optional(),
  done: z.boolean().default(false),
});
export const exerciseEntrySchema = z.looseObject({
  id, exerciseId: z.string().min(1).max(80), name: z.string().trim().min(1).max(80),
  measure: z.enum(MEASURES).default('weight-reps'),
  sets: z.array(setSchema).max(50),
  note: z.string().max(500).optional(),
});
export const workoutSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(80), date: day, type: z.enum(WORKOUT_TYPES).default('strength'),
  startedAt: z.iso.datetime({offset: true}), endedAt: z.iso.datetime({offset: true}).optional(),
  exercises: z.array(exerciseEntrySchema).max(40),
  notes: z.string().max(1000).optional(),
  /** The Health activity this workout wrote its minutes to, so editing or removing it keeps them in step. */
  activityId: z.string().max(120).optional(),
  templateId: id.optional(),
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
});
export const templateSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(80), type: z.enum(WORKOUT_TYPES).default('strength'),
  exercises: z.array(z.looseObject({exerciseId: z.string().min(1).max(80), name: z.string().trim().min(1).max(80), measure: z.enum(MEASURES).default('weight-reps'),
    sets: z.array(setSchema.omit({id: true, done: true})).max(50)})).max(40),
  createdAt: z.iso.datetime({offset: true}),
});
export const customExerciseSchema = z.looseObject({id, name: z.string().trim().min(1).max(80), category: z.enum(CATEGORIES), measure: z.enum(MEASURES)});
export const workoutsSchema = z.looseObject({
  version: z.literal(1),
  workouts: z.array(workoutSchema).max(3000),
  templates: z.array(templateSchema).max(50),
  exercises: z.array(customExerciseSchema).max(200),
  /** Seconds of rest after a finished set; 0 turns the rest timer off. */
  restSeconds: z.number().int().min(0).max(900).default(90),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export type ExerciseEntry = z.infer<typeof exerciseEntrySchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutTemplate = z.infer<typeof templateSchema>;
export type CustomExercise = z.infer<typeof customExerciseSchema>;
export type Workouts = z.infer<typeof workoutsSchema>;
export type Measure = typeof MEASURES[number];
export const emptyWorkouts = (): Workouts => ({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90});
export const WORKOUTS: DeviceRecordSpec<Workouts> = {key: WORKOUTS_KEY, schema: workoutsSchema, empty: emptyWorkouts};
