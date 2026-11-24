import {finished} from './engine';
import {PHOTOS_PER_WORKOUT} from './photos';
import {workoutsSchema, type Workout, type Workouts} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak's workout journal): a finished workout's star (Favourites)
 * and the ids of its up to four photos (the photos themselves: lib/workouts/photos.ts, this browser only). Pure.
 */
const edit = (w: Workouts, workoutId: string, change: (x: Workout) => Workout) => {
  if (!w.workouts.some(x => x.id === workoutId)) throw Error('This workout is no longer here.');
  return workoutsSchema.parse({...w, workouts: w.workouts.map(x => x.id === workoutId ? change(x) : x)});
};
const without = <T extends object>(x: T, key: string): T => { const rest = {...x} as Record<string, unknown>; delete rest[key]; return rest as T; };
export const setStar = (w: Workouts, workoutId: string, on: boolean) => edit(w, workoutId, x => on ? {...x, star: true} : without(x, 'star'));
export function addPhotoId(w: Workouts, workoutId: string, photoId: string, at?: number): Workouts {
  return edit(w, workoutId, x => {
    const list = x.photos ?? [];
    if (list.includes(photoId)) return x;
    if (list.length >= PHOTOS_PER_WORKOUT) throw Error(`Up to ${PHOTOS_PER_WORKOUT} photos fit on one workout. Remove one first.`);
    const next = [...list]; next.splice(at === undefined ? next.length : Math.max(0, Math.min(at, next.length)), 0, photoId);
    return {...x, photos: next};
  });
}
export const removePhotoId = (w: Workouts, workoutId: string, photoId: string) => edit(w, workoutId, x => { const next = (x.photos ?? []).filter(p => p !== photoId); return next.length ? {...x, photos: next} : without(x, 'photos'); });
/** Every photo id a workout in the log names (for the arrival sweep). */
export const namedPhotoIds = (w: Workouts) => w.workouts.flatMap(x => x.photos ?? []);
/** The finished favourites, newest first. */
export const favourites = (w: Workouts) => finished(w).filter(x => x.star);
