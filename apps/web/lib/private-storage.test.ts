import { beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { readPrivateStore, updatePrivateStore, importPrivateStore } from "./private-storage";
const schema = z.object({ schemaVersion: z.literal(1), kind: z.literal("test"), count: z.number().int().nonnegative() }).strict();
const empty = () => ({ schemaVersion: 1 as const, kind: "test" as const, count: 0 });
const key = "zigoals:habits:v1";
function memory() {
  const map = new Map<string, string>();
  return { get length() { return map.size; }, key: (n: number) => [...map.keys()][n] ?? null,
    clear: () => map.clear(), getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } } as Storage;
}
beforeEach(() => {
  let tail = Promise.resolve();
  vi.stubGlobal("navigator", { locks: { request: (_key: string, action: () => unknown) => {
    const next = tail.then(action); tail = next.then(() => undefined, () => undefined); return next;
  } } });
});
test("missing private store is empty without writing or changing V1 Goal data", () => {
  const s = memory(); s.setItem("zigoals:metadata:v1:local-simulation:local-demo-user", "existing V1 bytes");
  expect(readPrivateStore(s, key, schema, empty)).toEqual(empty());
  expect(s.length).toBe(1);
});
test("locked concurrent edits re-read the current durable value", async () => {
  const s = memory();
  await Promise.all(Array.from({ length: 8 }, () => updatePrivateStore(s, key, schema, empty, d => ({ ...d, count: d.count + 1 }))));
  expect(readPrivateStore(s, key, schema, empty).count).toBe(8);
});
test.each(["{broken", JSON.stringify({ ...empty(), count: -1 }), JSON.stringify({ ...empty(), schemaVersion: 2 })])("bad stored data blocks edits and preserves original bytes: %s", async raw => {
  const s = memory(); s.setItem(key, raw);
  expect(() => readPrivateStore(s, key, schema, empty)).toThrow();
  await expect(updatePrivateStore(s, key, schema, empty, () => empty())).rejects.toThrow();
  expect(s.getItem(key)).toBe(raw);
});
test("validated explicit import quarantines malformed original before replacing", async () => {
  const s = memory(); s.setItem(key, "broken private original");
  await importPrivateStore(s, key, schema, JSON.stringify({ ...empty(), count: 4 }));
  expect(readPrivateStore(s, key, schema, empty).count).toBe(4);
  expect(s.getItem(s.key(1)!)).toBe("broken private original");
});
test("future version refuses downgrade even through import", async () => {
  const s = memory(); const raw = JSON.stringify({ ...empty(), schemaVersion: 2 }); s.setItem(key, raw);
  await expect(importPrivateStore(s, key, schema, JSON.stringify(empty()))).rejects.toThrow();
  expect(s.getItem(key)).toBe(raw);
});
test("invalid/oversized import and quota failure never overwrite current data", async () => {
  const s = memory(); const raw = JSON.stringify(empty()); s.setItem(key, raw);
  await expect(importPrivateStore(s, key, schema, '{"wrong":true}')).rejects.toThrow();
  await expect(importPrivateStore(s, key, schema, "x".repeat(2_000_001))).rejects.toThrow();
  s.setItem = () => { throw Error("quota"); };
  await expect(updatePrivateStore(s, key, schema, empty, d => ({ ...d, count: 1 }))).rejects.toThrow();
  expect(s.getItem(key)).toBe(raw);
});
test("cannot write without Web Locks or use a Goal namespace", async () => {
  const s = memory(); vi.stubGlobal("navigator", {});
  await expect(updatePrivateStore(s, key, schema, empty, empty)).rejects.toThrow();
  expect(() => readPrivateStore(s, "zigoals:metadata:v1", schema, empty)).toThrow();
  expect(s.length).toBe(0);
});

test('platform v1 read/no-op preserves bytes; first explicit write keeps recovery; export/import accepts v2',async()=>{
 const {platformSchema,emptyPlatform,PLATFORM_KEY}=await import('./positions');
 const original=JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[],allocations:[],snapshots:[]},null,2);
 const s=memory();s.setItem(PLATFORM_KEY,original);
 expect(readPrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform).schemaVersion).toBe(2);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>v);
 expect(s.getItem(PLATFORM_KEY)).toBe(original);expect(s.length).toBe(1);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>({...v,legacyGoalUi:{'1':{pinned:true}}}));
 expect(s.getItem(s.key(1)!)).toBe(original);
 expect(JSON.parse(s.getItem(PLATFORM_KEY)!).schemaVersion).toBe(2);
 const imported=memory();await importPrivateStore(imported,PLATFORM_KEY,platformSchema,s.getItem(PLATFORM_KEY)!);
 expect(readPrivateStore(imported,PLATFORM_KEY,platformSchema,emptyPlatform).legacyGoalUi?.['1']?.pinned).toBe(true);
});
