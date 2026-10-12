import * as z from 'zod';
import {PROGRESS_PHOTOS_KEY} from '../aa-device-keys';
import {readDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {getAccountScope} from '../account-session';
import {getAppStorage, isShowcase} from '../showcase-storage';

/**
 * N9: progress photos, device-only (ADR-022 B7): the index (id, day, note, size, the pose) in a device key; the bytes in
 * IndexedDB (`zigoals-progress-photos`, one store), compressed on the device to a WebP (or JPEG) no larger than 1280 px
 * and about 200 kB, never synced, included in Export everything as files (`exportPhotoEntries`), removed by the account's
 * erase together with the database. At most 60.
 */
export const MAX_PHOTOS = 60, PHOTO_MAX_EDGE = 1280, PHOTO_QUALITY = 0.82;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const photoEntrySchema = z.looseObject({id: z.string().regex(/^photo_[a-z0-9-]{8,80}$/), date: day, pose: z.enum(['front', 'side', 'back', 'other']), note: z.string().max(200).optional(), bytes: z.number().int().min(1).max(2_000_000), type: z.enum(['image/webp', 'image/jpeg']), at: z.iso.datetime()});
export type PhotoEntry = z.infer<typeof photoEntrySchema>;
export const progressPhotosSchema = z.looseObject({version: z.literal(1), photos: z.array(photoEntrySchema).max(MAX_PHOTOS).optional()});
export type ProgressPhotos = z.infer<typeof progressPhotosSchema>;
export const emptyProgressPhotos = (): ProgressPhotos => ({version: 1});
export const PROGRESS_PHOTOS: DeviceRecordSpec<ProgressPhotos> = {key: PROGRESS_PHOTOS_KEY, schema: progressPhotosSchema, empty: emptyProgressPhotos};
export const addPhotoEntry = (r: ProgressPhotos, entry: PhotoEntry): ProgressPhotos => { if ((r.photos ?? []).length >= MAX_PHOTOS) throw new Error(`At most ${MAX_PHOTOS} photos on this device; remove one first.`); return progressPhotosSchema.parse({...r, photos: [...(r.photos ?? []), entry].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at))}); };
export const removePhotoEntry = (r: ProgressPhotos, id: string): ProgressPhotos => progressPhotosSchema.parse({...r, photos: (r.photos ?? []).filter(p => p.id !== id)});
/** The IndexedDB blob store: open once per call, nothing cached, every failure a plain error the card shows. */
export const PHOTO_DB = 'zigoals-progress-photos', PHOTO_STORE = 'blobs';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const req = indexedDB.open(PHOTO_DB, 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(PHOTO_STORE)) req.result.createObjectStore(PHOTO_STORE); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('Photos store unavailable.')); });
}
const tx = <T,>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => { const t = db.transaction(PHOTO_STORE, mode), req = run(t.objectStore(PHOTO_STORE)); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('Photo not saved.')); t.oncomplete = () => db.close(); });
export async function putPhotoBlob(scope: string, id: string, blob: Blob): Promise<void> { const db = await openDb(); await tx(db, 'readwrite', s => s.put(blob, `${scope}:${id}`)); }
export async function getPhotoBlob(scope: string, id: string): Promise<Blob | null> { const db = await openDb(); return (await tx<Blob | undefined>(db, 'readonly', s => s.get(`${scope}:${id}`))) ?? null; }
export async function deletePhotoBlob(scope: string, id: string): Promise<void> { const db = await openDb(); await tx(db, 'readwrite', s => s.delete(`${scope}:${id}`)); }
export async function deleteAllPhotoBlobs(scope: string): Promise<void> { const db = await openDb(); const keys = await tx<IDBValidKey[]>(db, 'readonly', s => s.getAllKeys()); const db2 = await openDb(); await new Promise<void>((resolve, reject) => { const t = db2.transaction(PHOTO_STORE, 'readwrite'), s = t.objectStore(PHOTO_STORE); for (const k of keys) if (String(k).startsWith(`${scope}:`)) s.delete(k); t.oncomplete = () => { db2.close(); resolve(); }; t.onerror = () => reject(t.error ?? new Error('Photos not removed.')); }); }
/** Shrinks an image on the device: the long edge at most 1280 px, WebP where the browser encodes it, JPEG otherwise. */
export async function compressImage(file: Blob, maxEdge = PHOTO_MAX_EDGE, quality = PHOTO_QUALITY): Promise<{blob: Blob; type: 'image/webp' | 'image/jpeg'}> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot resize the photo.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  const encode = (type: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return {blob: webp, type: 'image/webp'};
  const jpeg = await encode('image/jpeg'); if (!jpeg) throw new Error('The photo could not be encoded.');
  return {blob: jpeg, type: 'image/jpeg'};
}
/** The scope the photos of this tab belong to: the account, the Showcase, or the local person (the same rule the Measurements view uses). */
export function photoScope(): string { try { return isShowcase() ? 'showcase' : getAccountScope() ?? 'local'; } catch { return 'local'; } }
/** The file name a photo gets in Export everything: its day, pose and id, with the image type's extension. */
export const photoFileName = (p: {id: string; date: string; pose: string; type?: string}) => `photos/${p.date}-${p.pose}-${p.id.replace(/^photo_/, '')}.${p.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/** Every photo of this tab's scope as a zip entry (Gate B, F3's sibling: the doc promised files in Export everything). A photo whose bytes are missing is skipped, never invented. */
export async function exportPhotoEntries(now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  let index: ProgressPhotos; try { index = readDeviceRecord(getAppStorage(), PROGRESS_PHOTOS).data; } catch { return []; }
  const scope = photoScope(), out: {name: string; data: Uint8Array; modified: Date}[] = [];
  for (const p of index.photos ?? []) {
    try { const blob = await getPhotoBlob(scope, p.id); if (!blob) continue; out.push({name: photoFileName({...p, type: blob.type}), data: new Uint8Array(await blob.arrayBuffer()), modified: now}); } catch { /* skipped: the index names it, the bytes are gone */ }
  }
  return out;
}
