import {describe, expect, test} from 'vitest';
import {AV2_R5_GYM_ERASE_DBS, AV2_R5_GYM_EXPORT_FOLDER, AV2_R5_GYM_RESTORE_MEDIA, WORKOUT_PHOTO_DB_LITERAL, WORKOUT_PHOTO_STORE_LITERAL} from './av2-r5-gym-keys';
import {WORKOUT_PHOTO_DB, WORKOUT_PHOTO_STORE, workoutPhotoFileName} from './workouts/photos';

/** Session AV lane 2, round 5 (gym): each literal equals its owner's constant, and the export folder is the file name's. */
describe('round 5 gym device stores', () => {
  test('literals equal their owners’ constants', () => {
    expect(WORKOUT_PHOTO_DB_LITERAL).toBe(WORKOUT_PHOTO_DB);
    expect(WORKOUT_PHOTO_STORE_LITERAL).toBe(WORKOUT_PHOTO_STORE);
    expect(AV2_R5_GYM_ERASE_DBS).toEqual([WORKOUT_PHOTO_DB]);
    expect(AV2_R5_GYM_RESTORE_MEDIA).toEqual({[WORKOUT_PHOTO_DB]: WORKOUT_PHOTO_STORE});
    expect(workoutPhotoFileName('wph-0a1b2c3d-1111', 'image/webp')).toBe(`${AV2_R5_GYM_EXPORT_FOLDER}/wph-0a1b2c3d-1111.webp`);
    expect(workoutPhotoFileName('wph-0a1b2c3d-1111', 'image/jpeg')).toMatch(/\.jpg$/);
  });
});
