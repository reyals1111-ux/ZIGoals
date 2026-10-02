import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { updatePrivateStore, PRIVATE_MAX_BYTES } from "./private-storage";
import { withStorageLock } from "./storage";
import { storageLockKey } from "./showcase-storage";
import { PrivateStorageError, asStorageError } from "./vault/storage-errors";
import { modules } from "./vault/account-data";
import { buildShowcase } from "./showcase-data";
import { powerUserRecords } from "./vault/power-user-fixture";
import { habitCheckIn } from "../components/habits/use-habits";

/**
 * Session K, Part 5 (owner decision f): updatePrivateStore reads and parses the stored module once; it no longer reads
 * and parses it a second time to learn its schemaVersion. This file keeps the previous implementation verbatim (main
 * c189313) and runs both over the same corpus, comparing
 * everything the store promises: the bytes left in storage (module and recovery copies), the value returned, and any
 * error (its class, code and message), so the change is provably behaviour-preserving.
 */
function legacyValidateKey(key: string) {
  if (key !== "zigoals:habits:v1" && key !== "zigoals:health:v1" && key !== "zigoals:platform:v1" && key !== "zigoals:settings:v1") throw Error("Unknown private data store.");
}
function legacyParsePrivateData<T>(raw: string, schema: z.ZodType<T>): T {
  if (new TextEncoder().encode(raw).byteLength > PRIVATE_MAX_BYTES) throw new PrivateStorageError("MODULE_LIMIT");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw Error("Private data is damaged. Original data was preserved."); }
  const result = schema.safeParse(value);
  if (!result.success) throw Error("Private data is invalid or uses an unsupported version. Original data was preserved.");
  return result.data;
}
function legacyReadPrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T): T {
  legacyValidateKey(key);
  const raw = storage.getItem(key);
  return raw === null ? createEmpty() : legacyParsePrivateData(raw, schema);
}
async function legacyUpdatePrivateStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, createEmpty: () => T, update: (latest: T) => T): Promise<T> {
  legacyValidateKey(key);
  return withStorageLock(storageLockKey(storage,key), () => {
    const latest = legacyReadPrivateStore(storage, key, schema, createEmpty);
    const next = update(latest);
    if (next === latest) return latest;
    const serialized = JSON.stringify(next);
    const validated = legacyParsePrivateData(serialized, schema);
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
  });
}

type Faults = { getItem?: () => never; setItem?: (key: string) => void };
function memory(initial: Record<string, string>, faults: Faults = {}) {
  const map = new Map(Object.entries(initial));
  return { map, storage: { get length() { return map.size; }, key: (n: number) => [...map.keys()][n] ?? null, clear: () => map.clear(),
    getItem: (k: string) => { faults.getItem?.(); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { faults.setItem?.(k); map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } } as Storage };
}
let uuid = 0;
beforeEach(() => {
  // Updates stamp `new Date()` (a check-in's updatedAt): both implementations must see the same clock. Timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T09:00:00.000Z"));
  vi.stubGlobal("navigator", { locks: { request: async (_key: string, work: () => unknown) => work() } });
  uuid = 0; vi.spyOn(crypto, "randomUUID").mockImplementation(() => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

type Outcome = { stored: Record<string, string>; returned?: unknown; error?: { name: string; code?: string; message: string } };
async function run(implementation: typeof updatePrivateStore, key: string, schema: z.ZodType, empty: () => unknown, initial: Record<string, string>, update: (latest: never) => unknown, faults?: Faults): Promise<Outcome> {
  uuid = 0;
  const { map, storage } = memory(initial, faults);
  try {
    const returned = await implementation(storage, key, schema, empty, update as (latest: unknown) => unknown);
    return { stored: Object.fromEntries(map), returned };
  } catch (error) {
    const e = error as Error & { code?: string };
    return { stored: Object.fromEntries(map), error: { name: e?.constructor?.name ?? typeof e, code: e?.code, message: String(e?.message ?? e) } };
  }
}
async function same(key: string, schema: z.ZodType, empty: () => unknown, initial: Record<string, string>, update: (latest: never) => unknown, faults?: () => Faults) {
  const before = await run(legacyUpdatePrivateStore as typeof updatePrivateStore, key, schema, empty, initial, update, faults?.());
  const after = await run(updatePrivateStore, key, schema, empty, initial, update, faults?.());
  // toStrictEqual: an absent key and a key set to undefined differ, as do -0 and 0.
  expect(after).toStrictEqual(before);
  return after;
}

const showcase = buildShowcase("2026-10-01").records, power: Record<string, string> = powerUserRecords().records;
const { habits, finance, health, settings } = modules;
const quota = () => { throw new DOMException("The quota has been exceeded.", "QuotaExceededError"); };

test("real stores: a Habits check-in (with its unset mood), a Health, Wealth and Today edit, and the power-user Habits", async () => {
  const habitData = JSON.parse(showcase[habits.key]!), first = habitData.habits[0].id;
  const checkIn = habitCheckIn.smartDone(first, "2026-10-02");
  const outcome = await same(habits.key, habits.schema, habits.empty, { [habits.key]: showcase[habits.key]! }, checkIn as never);
  expect(outcome.error).toBeUndefined();
  await same(habits.key, habits.schema, habits.empty, { [habits.key]: power[habits.key]! }, habitCheckIn.smartDone(JSON.parse(power[habits.key]!).habits[3].id, "2026-10-02") as never);
  await same(health.key, health.schema, health.empty, { [health.key]: showcase[health.key]! }, ((h: { water: unknown[] }) => ({ ...h, water: [...h.water, { id: "health_water-k1", date: "2026-10-02", amountMilli: 250_000, unit: "ml", createdAt: "2026-10-02T08:00:00.000Z" }] })) as never);
  await same(finance.key, finance.schema, finance.empty, { [finance.key]: showcase[finance.key]! }, ((p: { positions: { notes?: string }[] }) => ({ ...p, positions: p.positions.map((x, i) => i ? x : { ...x, notes: "edited" }) })) as never);
  if (showcase[settings.key]) await same(settings.key, settings.schema, settings.empty, { [settings.key]: showcase[settings.key]! }, ((s: Record<string, unknown>) => ({ ...s })) as never);
});

test("empty stores, no-op updates, legacy versions and their recovery copies", async () => {
  await same(habits.key, habits.schema, habits.empty, {}, ((d: { habits: unknown[] }) => ({ ...d })) as never);
  await same(habits.key, habits.schema, habits.empty, { [habits.key]: showcase[habits.key]! }, ((d: unknown) => d) as never);
  // Platform v1, pretty-printed: the exact bytes go to a recovery copy on the first real write.
  const v1 = JSON.stringify({ schemaVersion: 1, kind: "zigoals-platform", positions: [], goals: [], allocations: [], snapshots: [] }, null, 2);
  const legacy = await same(finance.key, finance.schema, finance.empty, { [finance.key]: v1 }, ((p: Record<string, unknown>) => ({ ...p, legacyGoalUi: { "1": { pinned: true } } })) as never);
  expect(Object.values(legacy.stored)).toContain(v1);
  await same(finance.key, finance.schema, finance.empty, { [finance.key]: v1 }, ((p: unknown) => p) as never);
});

const toy = z.object({ schemaVersion: z.literal(1), kind: z.literal("test"), count: z.number().int().nonnegative(), note: z.string().optional(), list: z.array(z.unknown()).optional(), when: z.unknown().optional() }).strict();
const toyEmpty = () => ({ schemaVersion: 1 as const, kind: "test" as const, count: 0 });
const toyStored = { [habits.key]: JSON.stringify(toyEmpty()) };
test.each<[string, (d: Record<string, unknown>) => unknown]>([
  ["a valid change", d => ({ ...d, count: 3 })],
  ["an optional key set to undefined (JSON drops it)", d => ({ ...d, count: 1, note: undefined })],
  ["an unknown key set to undefined (strict schema, dropped by JSON)", d => ({ ...d, count: 1, extra: undefined })],
  ["an unknown key with a value", d => ({ ...d, extra: 1 })],
  ["NaN", d => ({ ...d, count: Number.NaN })],
  ["Infinity", d => ({ ...d, count: Number.POSITIVE_INFINITY })],
  ["minus zero", d => ({ ...d, count: -0 })],
  ["a Date", d => ({ ...d, when: new Date("2026-10-02T00:00:00.000Z") })],
  ["a toJSON object", d => ({ ...d, when: { toJSON: () => "text" } })],
  ["an array with a hole", d => ({ ...d, list: [1, , 3] })],
  ["an array holding undefined", d => ({ ...d, list: [undefined] })],
  ["a class instance", d => ({ ...d, when: new (class Box { value = 1; })() })],
  ["a BigInt", d => ({ ...d, count: 1n })],
  ["a cycle", d => { const o: Record<string, unknown> = { ...d }; o.when = o; return o; }],
  ["undefined", () => undefined],
  ["a function", () => () => 1],
  ["invalid data", d => ({ ...d, count: -1 })],
  ["too large", d => ({ ...d, list: ["x".repeat(PRIVATE_MAX_BYTES)] })],
  ["an updater that throws", () => { throw Error("Habit unavailable."); }],
])("same bytes, value and error for %s", async (_name, update) => {
  await same(habits.key, toy, toyEmpty, toyStored, update as never);
  await same(habits.key, toy, toyEmpty, {}, update as never);
});

test.each<[string, string]>([
  ["damaged", "{broken"],
  ["invalid", JSON.stringify({ ...toyEmpty(), count: -1 })],
  ["a newer version", JSON.stringify({ ...toyEmpty(), schemaVersion: 2 })],
  ["too large", JSON.stringify({ ...toyEmpty(), list: ["x".repeat(PRIVATE_MAX_BYTES)] })],
])("stored data that is %s blocks the edit the same way and keeps its bytes", async (_name, raw) => {
  await same(habits.key, toy, toyEmpty, { [habits.key]: raw }, ((d: Record<string, unknown>) => ({ ...d, count: 2 })) as never);
});

test("storage failures: a full store on the module write and on the recovery copy, and blocked storage", async () => {
  await same(habits.key, toy, toyEmpty, toyStored, ((d: Record<string, unknown>) => ({ ...d, count: 2 })) as never, () => ({ setItem: quota }));
  const v1 = JSON.stringify({ schemaVersion: 1, kind: "zigoals-platform", positions: [], goals: [], allocations: [], snapshots: [] });
  await same(finance.key, finance.schema, finance.empty, { [finance.key]: v1 }, ((p: Record<string, unknown>) => ({ ...p, legacyGoalUi: { "1": { pinned: true } } })) as never, () => ({ setItem: k => { if (k.includes(":recovery:")) quota(); } }));
  await same(finance.key, finance.schema, finance.empty, { [finance.key]: v1 }, ((p: Record<string, unknown>) => ({ ...p, legacyGoalUi: { "1": { pinned: true } } })) as never, () => ({ setItem: k => { if (!k.includes(":recovery:")) quota(); } }));
  await same(habits.key, toy, toyEmpty, toyStored, ((d: Record<string, unknown>) => ({ ...d, count: 2 })) as never, () => ({ getItem: () => { throw new DOMException("The operation is insecure.", "SecurityError"); } }));
});

test("schemas that hand back the stored root itself: the old version is read from a fresh parse, as before", async () => {
  // z.any() returns the parsed root unchanged, so an update could change it in place before the version is read.
  const passthrough = z.any();
  const stored = { [habits.key]: JSON.stringify({ schemaVersion: 1, kind: "test", count: 0 }) };
  await same(habits.key, passthrough, toyEmpty, stored, ((d: Record<string, unknown>) => { d.schemaVersion = 0; return { ...d, schemaVersion: 2 }; }) as never);
  await same(habits.key, passthrough, toyEmpty, stored, ((d: Record<string, unknown>) => ({ ...d, schemaVersion: 2 })) as never);
  // A stored null that the schema accepts: reading its version throws the same TypeError, inside the same try.
  await same(habits.key, z.union([z.null(), z.looseObject({})]), () => null, { [habits.key]: "null" }, (() => ({ schemaVersion: 2 })) as never);
});

test("the four modules' schemas return a new root, so a save really reuses the stored root and skips the second parse", () => {
  for (const store of [habits, health, finance, settings]) {
    const raw = showcase[store.key] ?? JSON.stringify(store.empty());
    const value = JSON.parse(raw), result = store.schema.safeParse(value);
    expect(result.success, store.key).toBe(true);
    expect(result.data, store.key).not.toBe(value);
  }
});
