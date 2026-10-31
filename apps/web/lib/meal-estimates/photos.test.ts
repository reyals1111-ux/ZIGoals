import {describe, expect, test} from 'vitest';
import {emptyMealEstimates, mealEstimatesSchema} from './schema';
import {MAX_MEAL_PHOTOS, MEAL_PHOTO_DB, MEAL_PHOTO_MAX_BYTES, MEAL_PHOTO_STEPS, keepsPhotos, mealPhotoKey, mealPhotoValueSchema, setKeepPhotos, shrinkToLimit} from './photos';

describe('4.2 keep a meal photo on this device', () => {
  test('the opt-in is a loose field of the meal-estimates record: off when absent, removed when turned off', () => {
    const r = emptyMealEstimates();
    expect(keepsPhotos(r)).toBe(false);
    const on = setKeepPhotos(r, true);
    expect(keepsPhotos(on)).toBe(true);
    expect(mealEstimatesSchema.parse(JSON.parse(JSON.stringify(on)))).toEqual({version: 1, foods: {}, keepPhotos: true});
    expect(setKeepPhotos(on, false)).toEqual({version: 1, foods: {}});
  });
  test('the database, the limits and the per-scope key', () => {
    expect(MEAL_PHOTO_DB).toBe('zigoals-meal-photos-v1');
    expect(MAX_MEAL_PHOTOS).toBe(200); expect(MEAL_PHOTO_MAX_BYTES).toBe(200_000);
    expect(mealPhotoKey('local', 'health_f-0001')).toBe('local:health_f-0001');
    expect(mealPhotoValueSchema.safeParse({blob: new Blob(['x']), type: 'image/png', bytes: 1, at: '2026-10-31T08:00:00.000Z'}).success).toBe(false);
    expect(mealPhotoValueSchema.safeParse({blob: new Blob(['x']), type: 'image/jpeg', bytes: MEAL_PHOTO_MAX_BYTES + 1, at: '2026-10-31T08:00:00.000Z'}).success).toBe(false);
  });
  test('compression steps down until the photo is at most 200 kB, or refuses plainly', async () => {
    const tried: number[] = [];
    const sized = (sizes: number[]) => async (step: {edge: number; quality: number}) => { tried.push(step.edge); return {blob: new Blob([new Uint8Array(sizes[tried.length - 1]!)])}; };
    const out = await shrinkToLimit(sized([400_000, 250_000, 150_000]));
    expect(out.blob.size).toBe(150_000); expect(tried).toEqual([1024, 1024, 800]);
    tried.length = 0;
    await expect(shrinkToLimit(sized(MEAL_PHOTO_STEPS.map(() => 300_000)))).rejects.toThrow('200 kB');
    expect(tried).toHaveLength(MEAL_PHOTO_STEPS.length);
  });
});
