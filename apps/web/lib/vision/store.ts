/**
 * G3, vision photos (Session AA-Cloud Part 2, `[TIER 3] (storage)`): a goal's photo is compressed on this device (a
 * canvas, at most 1600 px on its longest side, JPEG, at most 300 kB) and kept in this browser's IndexedDB
 * (`zigoals-vision-v1`), never synced and never uploaded; "Export everything" includes the images. The record keeps the
 * scope it was saved under (the account id, or "local" without an account), so one account never sees another's
 * photos. The Showcase never stores a photo: its visions are generated gradients. The goal-extras record holds only the
 * image's id (`lib/goal-extras/store.ts`).
 */
export const VISION_DATABASE = 'zigoals-vision-v1';
export const VISION = {maxSide: 1600, maxBytes: 300_000, totalBytes: 30_000_000, maxImages: 200, inputBytes: 25_000_000} as const;
const STORE = 'images', LIMIT_MS = 4000;

export type VisionImage = {id: string; scope: string; blob: Blob; type: string; bytes: number; width: number; height: number; createdAt: string};

/** The size an image is drawn at: its longest side at most `max`, the aspect kept, whole pixels, never enlarged. */
export function fitSize(width: number, height: number, max: number = VISION.maxSide): {width: number; height: number} {
  if (!(width > 0) || !(height > 0)) throw Error('This image has no size.');
  const k = Math.min(1, max / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k))};
}
/** The qualities and sizes tried, in order, until the JPEG fits under maxBytes. */
export const COMPRESSION_STEPS: readonly {quality: number; maxSide: number}[] = [{quality: 0.82, maxSide: 1600}, {quality: 0.72, maxSide: 1600}, {quality: 0.72, maxSide: 1280}, {quality: 0.62, maxSide: 1024}, {quality: 0.55, maxSide: 800}];
/** A new image id. */
export const newImageId = () => `img-${crypto.randomUUID()}`;

const available = () => typeof indexedDB !== 'undefined' && !!indexedDB;
function limited<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Photo storage did not answer in time.')), LIMIT_MS);
    work.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}
function open(): Promise<IDBDatabase> {
  if (!available()) return Promise.reject(Error('This browser keeps no photos (IndexedDB is unavailable).'));
  return limited(new Promise((resolve, reject) => {
    const request = indexedDB.open(VISION_DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath: 'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('Photo storage could not open.'));
  }));
}
function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => limited(new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode), request = work(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? Error('Photo storage refused the change.')); };
  })));
}

/** Every image this scope keeps. */
export async function listImages(scope: string): Promise<VisionImage[]> {
  const all = await run<VisionImage[]>('readonly', s => s.getAll() as IDBRequest<VisionImage[]>);
  return all.filter(i => i.scope === scope);
}
export async function getImage(scope: string, id: string): Promise<VisionImage | null> {
  const image = await run<VisionImage | undefined>('readonly', s => s.get(id) as IDBRequest<VisionImage | undefined>);
  return image && image.scope === scope ? image : null;
}
/** Stores a compressed image under this scope, refusing past the per-image, count and total limits. */
export async function putImage(image: VisionImage): Promise<void> {
  if (image.bytes > VISION.maxBytes) throw Error('This photo is still too large after compressing it.');
  const others = (await listImages(image.scope)).filter(i => i.id !== image.id);
  if (others.length >= VISION.maxImages) throw Error(`This device keeps up to ${VISION.maxImages} vision photos. Remove one first.`);
  if (others.reduce((n, i) => n + i.bytes, 0) + image.bytes > VISION.totalBytes) throw Error('Your vision photos have reached this device’s 30 MB. Remove one first.');
  await run('readwrite', s => s.put(image));
}
export async function deleteImages(scope: string, ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const mine = new Set((await listImages(scope)).map(i => i.id));
  await Promise.all(ids.filter(id => mine.has(id)).map(id => run('readwrite', s => s.delete(id))));
}

/** Reads a picked file, draws it smaller and returns a JPEG under the size limit (the original never leaves the page). */
export async function compressPhoto(file: Blob): Promise<{blob: Blob; width: number; height: number}> {
  if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.type)) throw Error('Choose a photo (JPEG, PNG, WebP, GIF, HEIC or AVIF).');
  if (file.size > VISION.inputBytes) throw Error('This file is over 25 MB. Choose a smaller photo.');
  const bitmap = await createImageBitmap(file).catch(() => { throw Error('This browser could not read that photo.'); });
  try {
    for (const step of COMPRESSION_STEPS) {
      const size = fitSize(bitmap.width, bitmap.height, step.maxSide);
      const canvas = document.createElement('canvas');
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw Error('This browser could not draw the photo.');
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', step.quality));
      if (blob && blob.size <= VISION.maxBytes) return {blob, ...size};
    }
    throw Error('This photo is still too large after compressing it.');
  } finally { bitmap.close(); }
}
