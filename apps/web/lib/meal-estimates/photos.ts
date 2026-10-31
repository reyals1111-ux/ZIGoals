import * as z from 'zod';
import {mealEstimatesSchema, type MealEstimates} from './schema';

/**
 * Session AK (task 4.2): an opt-in "Keep the photo on this device" beside an AI meal estimate. The choice is a loose field
 * of the meal-estimates record (`keepPhotos`, absent = off), so no new key. The photos themselves live only in IndexedDB
 * (`zigoals-meal-photos-v1`, one store), never in localStorage or the 2 MB private modules, one per estimated food, keyed
 * `<scope>:<foodId>` like the progress photos: compressed on the device to at most 200 kB, at most 200 a scope, each one
 * deletable, all of them with one button. Never synced and never sent anywhere.
 */
export const MEAL_PHOTO_DB = 'zigoals-meal-photos-v1', MEAL_PHOTO_STORE = 'photos';
export const MAX_MEAL_PHOTOS = 200, MEAL_PHOTO_MAX_BYTES = 200_000;
/** Each step is tried in turn until the photo fits; the last one that still does not fit is refused. */
export const MEAL_PHOTO_STEPS: readonly {edge: number; quality: number}[] = [{edge: 1024, quality: 0.78}, {edge: 1024, quality: 0.62}, {edge: 800, quality: 0.6}, {edge: 640, quality: 0.55}, {edge: 480, quality: 0.5}];
export const keepsPhotos = (r: MealEstimates) => (r as MealEstimates & {keepPhotos?: unknown}).keepPhotos === true;
export const setKeepPhotos = (r: MealEstimates, on: boolean): MealEstimates => { const rest: Record<string, unknown> = {...r}; delete rest.keepPhotos; return mealEstimatesSchema.parse(on ? {...rest, keepPhotos: true} : rest); };
export const mealPhotoKey = (scope: string, foodId: string) => `${scope}:${foodId}`;
export const mealPhotoValueSchema = z.object({blob: z.instanceof(Blob), type: z.enum(['image/webp', 'image/jpeg']), bytes: z.number().int().min(1).max(MEAL_PHOTO_MAX_BYTES), at: z.iso.datetime()});
export type MealPhoto = z.infer<typeof mealPhotoValueSchema>;

/** Runs the encoder through the steps until one result is at most 200 kB. */
export async function shrinkToLimit<T extends {blob: Blob}>(encode: (step: {edge: number; quality: number}) => Promise<T>, steps = MEAL_PHOTO_STEPS, limit = MEAL_PHOTO_MAX_BYTES): Promise<T> {
  for (const step of steps) { const out = await encode(step); if (out.blob.size <= limit) return out; }
  throw new Error('This photo could not be made small enough to keep (200 kB). Try another one.');
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep photos.')); return; }
    const req = indexedDB.open(MEAL_PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(MEAL_PHOTO_STORE)) req.result.createObjectStore(MEAL_PHOTO_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The photo store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(MEAL_PHOTO_STORE, mode), req = act(t.objectStore(MEAL_PHOTO_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The photo was not kept.')); };
  });
}
/** The food ids of this scope that have a photo. */
export async function mealPhotoIds(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getMealPhoto(scope: string, foodId: string): Promise<MealPhoto | null> {
  const v = await run<unknown>('readonly', s => s.get(mealPhotoKey(scope, foodId)));
  const parsed = mealPhotoValueSchema.safeParse(v);
  return parsed.success ? parsed.data : null;
}
/** Keeps (or replaces) one food's photo; refuses a 201st photo of the scope. */
export async function putMealPhoto(scope: string, foodId: string, photo: MealPhoto): Promise<void> {
  const value = mealPhotoValueSchema.parse(photo), ids = await mealPhotoIds(scope);
  if (!ids.includes(foodId) && ids.length >= MAX_MEAL_PHOTOS) throw new Error(`At most ${MAX_MEAL_PHOTOS} meal photos on this device; delete one first.`);
  await run('readwrite', s => s.put(value, mealPhotoKey(scope, foodId)));
}
export async function deleteMealPhoto(scope: string, foodId: string): Promise<void> { await run('readwrite', s => s.delete(mealPhotoKey(scope, foodId))); }
/** Removes every meal photo of this scope (the account's, the Showcase's or the local person's). */
export async function deleteAllMealPhotos(scope: string): Promise<number> {
  const ids = await mealPhotoIds(scope);
  if (ids.length) await run('readwrite', s => { for (const id of ids) s.delete(mealPhotoKey(scope, id)); });
  return ids.length;
}
/** Session AK (4.2): the file name of a kept meal photo inside Export everything (a food id is made safe for a path). */
export const mealPhotoFileName = (foodId: string, type: string) => `meal-photos/${foodId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/** Every kept meal photo of this scope as a zip entry, beside the progress photos; a photo that does not read is skipped. */
export async function exportMealPhotoEntries(scope: string, now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  let ids: string[] = []; try { ids = await mealPhotoIds(scope); } catch { return out; }
  for (const id of ids) { try { const p = await getMealPhoto(scope, id); if (p) out.push({name: mealPhotoFileName(id, p.type), data: new Uint8Array(await p.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
