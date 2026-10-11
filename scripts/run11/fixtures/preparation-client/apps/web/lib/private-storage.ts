import type { z } from "zod";
import { withStorageLock } from "./storage";
import {storageLockKey} from "./showcase-storage";
export const PRIVATE_MAX_BYTES = 2_000_000;
function validateKey(key: string) {
  if (key !== "zigoals:habits:v1" && key !== "zigoals:health:v1" && key !== "zigoals:platform:v1" && key !== "zigoals:settings:v1") throw Error("Unknown private data store.");
}
export function parsePrivateData<T>(raw: string, schema: z.ZodType<T>): T {
  if (new TextEncoder().encode(raw).byteLength > PRIVATE_MAX_BYTES) throw Error("Private backup exceeds 2 MB.");
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
export async function updatePrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): Promise<T> {
  validateKey(key);
  return withStorageLock(storageLockKey(storage,key), () => {
    const latest = readPrivateStore(storage, key, schema, createEmpty);
    const next = update(latest);
    if (next === latest) return latest;
    const serialized = JSON.stringify(next);
    const validated = parsePrivateData(serialized, schema);
    const previous = storage.getItem(key);
    if (previous !== null) {
      const oldVersion = (JSON.parse(previous) as {schemaVersion?: unknown}).schemaVersion;
      const newVersion = (validated as {schemaVersion?: unknown}).schemaVersion;
      if (typeof oldVersion === "number" && typeof newVersion === "number" && oldVersion < newVersion)
        storage.setItem(`${key}:recovery:${crypto.randomUUID()}`, previous);
    }
    storage.setItem(key, serialized);
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
      if (typeof version === "number" && version > ((incoming as {schemaVersion?: number}).schemaVersion ?? 1)) throw Error("A newer private data version cannot be replaced by this app.");
      // Explicit replacement retains the exact old record, including malformed bytes.
      storage.setItem(`${key}:recovery:${crypto.randomUUID()}`, previous);
    }
    storage.setItem(key, JSON.stringify(incoming));
    return incoming;
  });
}
