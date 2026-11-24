import * as z from 'zod';

/**
 * Session AV lane 2 (food, LEDGER #103; MacroFactor's custom food from product photos): a front-of-pack photo kept with a
 * library food, so it is easy to recognise in the Foods list. Only on this device: IndexedDB `zigoals-food-photos-v1`
 * (one store, `photos`), never localStorage, never synced, never uploaded, and no model reads it (reading the name and
 * brand from the photo needs a model: Carried). Keyed `<scope>:<foodId>` like the meal and progress photos (an account,
 * the Showcase and the local person each keep their own); shrunk on the device to at most 200 kB
 * (lib/meal-estimates/photos.ts `shrinkToLimit` steps), one per food (a new one replaces it), at most 500 a scope. A
 * photo whose food is gone is an orphan: listed and deleted only when the person says so. In Export everything as files
 * (`food-photos/…`), and erased with Erase everything (the lead lists the database).
 */
export const FOOD_PHOTO_DB = 'zigoals-food-photos-v1', FOOD_PHOTO_STORE = 'photos';
export const MAX_FOOD_PHOTOS = 500, FOOD_PHOTO_MAX_BYTES = 200_000;
export const foodPhotoKey = (scope: string, foodId: string) => `${scope}:${foodId}`;
export const foodPhotoValueSchema = z.object({blob: z.instanceof(Blob), type: z.enum(['image/webp', 'image/jpeg']), bytes: z.number().int().min(1).max(FOOD_PHOTO_MAX_BYTES), at: z.iso.datetime()});
export type FoodPhoto = z.infer<typeof foodPhotoValueSchema>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(FOOD_PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(FOOD_PHOTO_STORE)) req.result.createObjectStore(FOOD_PHOTO_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The photo store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(FOOD_PHOTO_STORE, mode), req = act(t.objectStore(FOOD_PHOTO_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
  });
}
/** The food ids of this scope that have a photo. */
export async function foodPhotoIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getFoodPhoto(scope: string, foodId: string): Promise<FoodPhoto | null> {
  const v = await run<unknown>('readonly', s => s.get(foodPhotoKey(scope, foodId)));
  const parsed = foodPhotoValueSchema.safeParse(v);
  return parsed.success ? parsed.data : null;
}
/** Keeps (or replaces) one food's photo; refuses a 501st photo of the scope. */
export async function putFoodPhoto(scope: string, foodId: string, photo: FoodPhoto): Promise<void> {
  const value = foodPhotoValueSchema.parse(photo), ids = await foodPhotoIds(scope);
  if (!ids.includes(foodId) && ids.length >= MAX_FOOD_PHOTOS) throw new Error(`At most ${MAX_FOOD_PHOTOS} package photos on this device; delete one first.`);
  await run('readwrite', s => s.put(value, foodPhotoKey(scope, foodId)));
}
export async function deleteFoodPhoto(scope: string, foodId: string): Promise<void> { await run('readwrite', s => s.delete(foodPhotoKey(scope, foodId))); }
/** Removes every package photo of this scope. */
export async function deleteAllFoodPhotos(scope: string): Promise<number> {
  const ids = await foodPhotoIds(scope);
  if (ids.length) await run('readwrite', s => { for (const id of ids) s.delete(foodPhotoKey(scope, id)); });
  return ids.length;
}
/** 32-bit FNV-1a of the id, so ids that read the same once made safe never share a file name. */
function idHash(text: string): string { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
export const foodPhotoFileName = (foodId: string, type: string) => `food-photos/${foodId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}-${idHash(foodId)}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/** Every package photo of this scope as a zip entry (Export everything); a photo that does not read is skipped. */
export async function exportFoodPhotoEntries(scope: string, now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  let ids: string[] = []; try { ids = await foodPhotoIds(scope); } catch { return out; }
  for (const id of ids) { try { const p = await getFoodPhoto(scope, id); if (p) out.push({name: foodPhotoFileName(id, p.type), data: new Uint8Array(await p.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
