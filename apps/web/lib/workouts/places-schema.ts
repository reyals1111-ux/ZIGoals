import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239, Fitbod's gym profiles and equipment; TIER 3 (stored format), a NEW
 * device-only key): up to five places the person trains (home, the gym, travel), each with the equipment there, and the
 * place chosen now. The exercise picker, the library, "Suggest a workout" and "Replace" read it to offer only what that
 * place has. Loose and versioned; an equipment tag a later build adds is kept as written (a string), and a place this
 * build cannot read is dropped on read, the others kept. Exported, restored with Health, erased with the account; never
 * synced.
 */
export const WORKOUT_PLACES_KEY = 'zigoals:workout-places:v1';
export const MAX_PLACES = 5, PLACE_NAME_MAX = 40;
export const PLACE_ID = /^place-[a-z0-9-]{4,40}$/;
export const placeSchema = z.looseObject({
  id: z.string().regex(PLACE_ID),
  name: z.string().trim().min(1).max(PLACE_NAME_MAX),
  equipment: z.array(z.string().regex(/^[a-z0-9-]{1,30}$/)).max(40).catch([]),
  createdAt: z.iso.datetime({offset: true}),
});
export type Place = z.infer<typeof placeSchema>;
const readablePlaces = z.preprocess(v => Array.isArray(v) ? v.filter(x => placeSchema.safeParse(x).success).slice(0, MAX_PLACES) : [], z.array(placeSchema).max(MAX_PLACES));
export const workoutPlacesSchema = z.looseObject({
  version: z.literal(1),
  places: readablePlaces,
  /** The place chosen now (its id); absent: any place. */
  current: z.string().regex(PLACE_ID).optional().catch(undefined),
});
export type WorkoutPlaces = z.infer<typeof workoutPlacesSchema>;
export const emptyPlaces = (): WorkoutPlaces => ({version: 1, places: []});
export const WORKOUT_PLACES: DeviceRecordSpec<WorkoutPlaces> = {key: WORKOUT_PLACES_KEY, schema: workoutPlacesSchema, empty: emptyPlaces};
