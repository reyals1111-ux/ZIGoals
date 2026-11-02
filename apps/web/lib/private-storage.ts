import type { z } from "zod";
import { withStorageLock } from "./storage";
import {storageLockKey} from "./showcase-storage";
import {PrivateStorageError,asStorageError} from "./vault/storage-errors";
import {replaceWithRecoveryCopy} from "./vault/recovery-copies";
export const PRIVATE_MAX_BYTES = 2_000_000;
function validateKey(key: string) {
  if (key !== "zigoals:habits:v1" && key !== "zigoals:health:v1" && key !== "zigoals:platform:v1" && key !== "zigoals:settings:v1") throw Error("Unknown private data store.");
}
export function parsePrivateData<T>(raw: string, schema: z.ZodType<T>): T {
  if (new TextEncoder().encode(raw).byteLength > PRIVATE_MAX_BYTES) throw new PrivateStorageError("MODULE_LIMIT");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw Error("Private data is damaged. Original data was preserved."); }
  const result = schema.safeParse(value);
  if (!result.success) throw Error("Private data is invalid or uses an unsupported version. Original data was preserved.");
  return result.data;
}
export function readPrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T): T {
  validateKey(key);
  const raw = storage.getItem(key);
  return raw === null ? createEmpty() : parsePrivateData(raw, schema);
}
/**
 * Session AK (journey 1 on the phone, after G4): this tab's updates still waiting for the cross-tab lock, in the order they
 * were asked. A save that started just before the page is left (a check-in that already shows) waits for a grant that comes
 * in a later task a leaving page never runs, so it was lost. On pagehide (capture phase, before the page's own listeners)
 * each one runs at once, in order, through the same read, change and write as updatePrivateStoreNow, and every update asked
 * after it (until a pageshow) is written at once too, so a save chained on one of them is not left waiting either. When the
 * lock comes after all (back from the back/forward cache), the update is not applied a second time. Outside that moment
 * nothing changes: every update waits for the lock.
 */
const waitingForLock = new Set<() => void>();
let pageLeft = false;
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { pageLeft = true; for (const run of waitingForLock) run(); }, true);
  window.addEventListener("pageshow", () => { pageLeft = false; }, true);
}
export async function updatePrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): Promise<T> {
  validateKey(key);
  const apply = () => applyPrivateUpdate(storage, key, schema, createEmpty, update);
  if (pageLeft) return apply();
  // Waiting while it is in the set: whichever comes first (pagehide or the lock) takes it out and applies it; the other
  // then only waits for that outcome. Settled either way (written, refused, or no Web Locks at all), it leaves the set.
  let run!: () => void;
  const leftEarly = new Promise<T>((resolve, reject) => { run = () => { waitingForLock.delete(run); try { resolve(apply()); } catch (error) { reject(error); } }; });
  waitingForLock.add(run);
  try { return await Promise.race([withStorageLock(storageLockKey(storage,key), () => waitingForLock.delete(run) ? apply() : leftEarly), leftEarly]); }
  finally { waitingForLock.delete(run); }
}
/**
 * Session AK G4 (journey 1 on the phone): the same read, change and write as updatePrivateStore, done at once, for a page
 * that is being left (pagehide). There the cross-tab lock's grant comes in a later task that a leaving page never runs, so
 * a change saved on the way out (a check-in that already shows) was lost. The whole read-change-write runs in this one
 * task, so no write of this tab can come between; the lock is skipped only for that moment.
 */
export function updatePrivateStoreNow<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): T {
  validateKey(key);
  return applyPrivateUpdate(storage, key, schema, createEmpty, update);
}
function applyPrivateUpdate<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): T {
  const latest = readPrivateStore(storage, key, schema, createEmpty);
  const next = update(latest);
  if (next === latest) return latest;
  const serialized = JSON.stringify(next);
  const validated = parsePrivateData(serialized, schema);
  const previous = storage.getItem(key);
  try {
    if (previous !== null) {
      const oldVersion = (JSON.parse(previous) as {schemaVersion?: unknown}).schemaVersion;
      const newVersion = (validated as {schemaVersion?: unknown}).schemaVersion;
      if (typeof oldVersion === "number" && typeof newVersion === "number" && oldVersion < newVersion)
        storage.setItem(`${key}:recovery:${crypto.randomUUID()}`, previous);
    }
    storage.setItem(key, serialized);
  } catch (error) { throw asStorageError(error); }
  return validated;
}
export async function importPrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, raw: string): Promise<T> {
  validateKey(key);
  const incoming = parsePrivateData(raw, schema);
  return withStorageLock(storageLockKey(storage,key), () => {
    const previous = storage.getItem(key);
    if (previous !== null) {
      let version: unknown;
      try { version = JSON.parse(previous)?.schemaVersion; } catch { /* preserve corrupt bytes below */ }
      if (typeof version === "number" && version > ((incoming as {schemaVersion?: number}).schemaVersion ?? 1)) throw new PrivateStorageError("NEWER_VERSION");
      // Explicit replacement retains the exact old record, including malformed bytes. A refused replacement
      // leaves no copy behind; after success only this copy is kept, unless the old record was unreadable
      // or invalid (vault/recovery-copies.ts, QA-02).
      let readable = true;
      try { parsePrivateData(previous, schema); } catch { readable = false; }
      try { replaceWithRecoveryCopy(storage, key, previous, JSON.stringify(incoming), readable); } catch (error) { throw asStorageError(error); }
      return incoming;
    }
    try { storage.setItem(key, JSON.stringify(incoming)); } catch (error) { throw asStorageError(error); }
    return incoming;
  });
}
