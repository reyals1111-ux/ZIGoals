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

test('platform v1 read/no-op preserves bytes; first explicit write keeps recovery; export/import accepts v3',async()=>{
 const {platformSchema,emptyPlatform,PLATFORM_KEY}=await import('./positions');
 const original=JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[],allocations:[],snapshots:[]},null,2);
 const s=memory();s.setItem(PLATFORM_KEY,original);
 expect(readPrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform).schemaVersion).toBe(3);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>v);
 expect(s.getItem(PLATFORM_KEY)).toBe(original);expect(s.length).toBe(1);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>({...v,legacyGoalUi:{'1':{pinned:true}}}));
 expect(s.getItem(s.key(1)!)).toBe(original);
 expect(JSON.parse(s.getItem(PLATFORM_KEY)!).schemaVersion).toBe(3);
 const imported=memory();await importPrivateStore(imported,PLATFORM_KEY,platformSchema,s.getItem(PLATFORM_KEY)!);
 expect(readPrivateStore(imported,PLATFORM_KEY,platformSchema,emptyPlatform).legacyGoalUi?.['1']?.pinned).toBe(true);
});
test('v2 first explicit favourite write preserves recovery bytes and v3 backup round-trips',async()=>{
 const {platformSchema,emptyPlatform,PLATFORM_KEY}=await import('./positions');const {addFavourite,saveAsset}=await import('./asset-management');const {manualSourcePosition}=await import('./manual-source');
 const {watchlist,assetEvents,...old}=emptyPlatform();void watchlist;void assetEvents;const raw=JSON.stringify({...old,schemaVersion:2},null,2),s=memory();s.setItem(PLATFORM_KEY,raw);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>v);expect(s.getItem(PLATFORM_KEY)).toBe(raw);
 await updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>addFavourite(saveAsset(v,manualSourcePosition({category:'Cash',name:'Cash',quantity:'100',currency:'USD'})),{ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'BTC'}));
 expect(s.getItem(s.key(1)!)).toBe(raw);const imported=memory();await importPrivateStore(imported,PLATFORM_KEY,platformSchema,s.getItem(PLATFORM_KEY)!);const parsed=readPrivateStore(imported,PLATFORM_KEY,platformSchema,emptyPlatform);expect(parsed.schemaVersion).toBe(3);expect(parsed.watchlist[0]!.ref.id).toBe('bitcoin');expect(parsed.assetEvents[0]!.kind).toBe('added');
});
test('atomic funding rolls back every financial field on storage failure',async()=>{
 const {platformSchema,emptyPlatform,PLATFORM_KEY,privateGoalSchema}=await import('./positions');const {fundGoal}=await import('./contribution-funding');const {manualSourcePosition}=await import('./manual-source');const at=new Date().toISOString();const g=privateGoalSchema.parse({id:'91',name:'Phone',type:'VALUE',status:'active',notes:'',asset:'USD',denom:'USD',decimals:2,target:'200000',createdAt:at,milestones:[]});const cash=manualSourcePosition({category:'Cash',name:'Cash',quantity:'20000',currency:'USD'});const raw=JSON.stringify({...emptyPlatform(),goals:[g]}),s=memory();s.setItem(PLATFORM_KEY,raw);s.setItem=()=>{throw Error('quota');};await expect(updatePrivateStore(s,PLATFORM_KEY,platformSchema,emptyPlatform,v=>fundGoal(v,{id:'fund',goalId:g.id,newPosition:cash,quantity:cash.quantity,occurredAt:at}))).rejects.toThrow();expect(s.getItem(PLATFORM_KEY)).toBe(raw);
});
