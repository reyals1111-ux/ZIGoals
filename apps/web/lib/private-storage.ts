import type { z } from "zod";
import { withStorageLock } from "./storage";
import {storageLockKey} from "./showcase-storage";
import {PrivateStorageError,asStorageError} from "./vault/storage-errors";
import {replaceWithRecoveryCopy} from "./vault/recovery-copies";
export const PRIVATE_MAX_BYTES = 2_000_000;
function validateKey(key: string) {
  if (key !== "zigoals:habits:v1" && key !== "zigoals:health:v1" && key !== "zigoals:platform:v1" && key !== "zigoals:settings:v1") throw Error("Unknown private data store.");
}
/**
 * Size check, parse and full schema validation of stored text. `root` is the parsed root object as stored (before any
 * schema saw it), kept only when the schema returned a new object, so no other code holds it (Session K, Part 5).
 */
function parseStored<T>(raw: string, schema: z.ZodType<T>): { data: T; root?: { schemaVersion?: unknown } } {
  if (new TextEncoder().encode(raw).byteLength > PRIVATE_MAX_BYTES) throw new PrivateStorageError("MODULE_LIMIT");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw Error("Private data is damaged. Original data was preserved."); }
  const result = schema.safeParse(value);
  if (!result.success) throw Error("Private data is invalid or uses an unsupported version. Original data was preserved.");
  return result.data === value ? { data: result.data } : { data: result.data, root: value as { schemaVersion?: unknown } };
}
export function parsePrivateData<T>(raw: string, schema: z.ZodType<T>): T {
  return parseStored(raw, schema).data;
}
export function readPrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T): T {
  validateKey(key);
  const raw = storage.getItem(key);
  return raw === null ? createEmpty() : parsePrivateData(raw, schema);
}
export async function updatePrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): Promise<T> {
  validateKey(key);
  return withStorageLock(storageLockKey(storage,key), () => {
    // One read under the lock (Session K, Part 5): the stored text, its data, and the stored root for its own
    // schemaVersion. This callback runs synchronously from here to the write, so the text cannot change in between; the
    // old code read and parsed it a second time only to learn that version.
    const previous = storage.getItem(key);
    const stored = previous === null ? null : parseStored(previous, schema);
    const latest = stored === null ? createEmpty() : stored.data;
    const next = update(latest);
    if (next === latest) return latest;
    const serialized = JSON.stringify(next);
    const validated = parsePrivateData(serialized, schema);
    try {
      if (previous !== null) {
        const oldVersion = (stored!.root ?? JSON.parse(previous) as {schemaVersion?: unknown}).schemaVersion;
        const newVersion = (validated as {schemaVersion?: unknown}).schemaVersion;
        if (typeof oldVersion === "number" && typeof newVersion === "number" && oldVersion < newVersion)
          storage.setItem(`${key}:recovery:${crypto.randomUUID()}`, previous);
      }
      storage.setItem(key, serialized);
    } catch (error) { throw asStorageError(error); }
    return validated;
  });
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
