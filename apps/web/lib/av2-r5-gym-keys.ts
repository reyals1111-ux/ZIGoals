/**
 * Session AV lane 2, round 5 (gym; TIER 3 stored formats: additive only): this round's one new device store, for the
 * shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern). Wired by this branch with
 * the lead's permission (lib/erase-everything.ts, lib/erase-areas.ts, lib/ak-device-keys.ts, lib/restore/media-dbs.ts,
 * lib/restore/media.ts, lib/export/make-everything.ts, lib/data-health/catalog.ts; test lib/restore/av2-r5-workout-photos.test.ts). No new localStorage key:
 * the round's other stored changes are optional fields on records that are registered already (`zigoals:workouts:v1`,
 * `zigoals:planned-workouts:v1`). lib/av2-r5-gym-keys.test.ts proves each literal equals its owner's constant.
 * - IndexedDB `zigoals-workout-photos-v1`, store `photos` (lib/workouts/photos.ts): up to four photos of a finished
 *   workout, keyed `<scope>:<photoId>`. Device only, never synced or uploaded; Export everything writes them as
 *   `workout-photos/<id>.<webp|jpg>` (`exportWorkoutPhotoEntries(photoScope())`), Restore puts them back
 *   (`putWorkoutPhoto`, at most 200 kB each), and Erase everything deletes the database by name.
 */
export const WORKOUT_PHOTO_DB_LITERAL = 'zigoals-workout-photos-v1';
export const WORKOUT_PHOTO_STORE_LITERAL = 'photos';
/** Erase everything (`lib/erase-everything.ts`, the IndexedDB names it deletes). */
export const AV2_R5_GYM_ERASE_DBS: readonly string[] = [WORKOUT_PHOTO_DB_LITERAL];
/** Restore's media stores (`lib/restore/media-dbs.ts` `RESTORE_MEDIA_STORES`): database → store. */
export const AV2_R5_GYM_RESTORE_MEDIA = {[WORKOUT_PHOTO_DB_LITERAL]: WORKOUT_PHOTO_STORE_LITERAL} as const;
/** The Export everything folder of these files (for `MEDIA_ENTRY`), and the data catalogue's row: [label, area]. */
export const AV2_R5_GYM_EXPORT_FOLDER = 'workout-photos';
export const AV2_R5_GYM_CATALOG_LABEL = ['Workouts: photos of your workouts (in this browser only)', 'Health'] as const;
