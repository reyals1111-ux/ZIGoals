import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, it} from 'vitest';
import {deleteAllFoodPhotos, deleteFoodPhoto, exportFoodPhotoEntries, FOOD_PHOTO_DB, foodPhotoFileName, foodPhotoIds, foodPhotoKey, getFoodPhoto, MAX_FOOD_PHOTOS, putFoodPhoto} from './photos';
import {FOOD_PHOTO_DB_LITERAL} from '../av2-food-keys';

/** Session AV lane 2 (food, LEDGER #103): a front-of-pack photo kept with a library food, on this device only. */
const AT = '2026-11-23T08:00:00.000Z';
const photo = (bytes = 10) => ({blob: new Blob([new Uint8Array(bytes)], {type: 'image/webp'}), type: 'image/webp' as const, bytes, at: AT});
const wipe = () => new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(FOOD_PHOTO_DB); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
beforeEach(wipe);
describe('package photos', () => {
  it('the database name and its literal; the per-scope key', () => {
    expect(FOOD_PHOTO_DB).toBe('zigoals-food-photos-v1');
    expect(FOOD_PHOTO_DB_LITERAL).toBe(FOOD_PHOTO_DB);
    expect(foodPhotoKey('local', 'health_food-fict-001')).toBe('local:health_food-fict-001');
  });
  it('one per food (a new one replaces it), per scope; deleted one by one or all; exported as files', async () => {
    await putFoodPhoto('local', 'health_food-fict-001', photo(10));
    await putFoodPhoto('local', 'health_food-fict-001', photo(12));
    await putFoodPhoto('showcase', 'health_food-fict-001', photo(5));
    await putFoodPhoto('local', 'health_food-fict-002', photo(7));
    expect((await foodPhotoIds('local')).sort()).toEqual(['health_food-fict-001', 'health_food-fict-002']);
    expect((await getFoodPhoto('local', 'health_food-fict-001'))!.bytes).toBe(12);
    const files = await exportFoodPhotoEntries('local');
    expect(files.map(f => f.name).sort()).toEqual([foodPhotoFileName('health_food-fict-001', 'image/webp'), foodPhotoFileName('health_food-fict-002', 'image/webp')].sort());
    expect(files[0]!.name).toMatch(/^food-photos\/health_food-fict-00\d-[0-9a-f]{8}\.webp$/);
    await deleteFoodPhoto('local', 'health_food-fict-002');
    expect(await foodPhotoIds('local')).toEqual(['health_food-fict-001']);
    expect(await deleteAllFoodPhotos('local')).toBe(1);
    expect(await foodPhotoIds('local')).toEqual([]);
    expect(await foodPhotoIds('showcase')).toEqual(['health_food-fict-001']);
  });
  it('refuses a photo over 200 kB and a value that is not a photo', async () => {
    await expect(putFoodPhoto('local', 'health_food-fict-001', {...photo(10), bytes: 200_001})).rejects.toThrow();
    await expect(putFoodPhoto('local', 'health_food-fict-001', {...photo(10), type: 'image/png' as never})).rejects.toThrow();
    expect(MAX_FOOD_PHOTOS).toBe(500);
  });
});
