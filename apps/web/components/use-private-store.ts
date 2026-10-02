"use client";
import {getAppStorage,isShowcase,storageLockKey} from "../lib/showcase-storage";
import {ACCOUNT_CHANGE,getAccountScope,isAccountLocked} from "../lib/account-session";
import { useCallback, useEffect, useState, useRef } from "react";
import type { z } from "zod";
import { importPrivateStore, readPrivateStore, updatePrivateStore } from "../lib/private-storage";
import {isDurableMarker,readDurableStore,updateDurableStore,restoreDurableStore,exportDurableStore} from "../lib/vault/local";
import {beginFirstRead,endFirstRead,PRIVATE_READ_RETRY} from "./private-read-delay";
import {blockedReadMessage,restoreFailureMessage,saveFailureMessage} from "../lib/storage-error-copy";
const EVENT = "zigoals:private-change";
/**
 * The latest parse of each legacy store's exact text, per storage view (Session G, Part 2). Several instances on one
 * page (Today reads Habits three times) share one parse of the same bytes; parsed records are never changed in place.
 */
const parsed = new WeakMap<Storage, Map<string, { schema: unknown; raw: string; data: unknown }>>();
function sharedParse(storage: Storage, key: string, schema: unknown) { let byKey = parsed.get(storage); if (!byKey) { byKey = new Map(); parsed.set(storage, byKey); } return { get: (raw: string) => { const hit = byKey.get(key); return hit && hit.schema === schema && hit.raw === raw ? hit : undefined; }, set: (raw: string, data: unknown) => byKey.set(key, { schema, raw, data }) }; }
/** Browser-only private state. No backend, wallet dependency, or automatic demo seeding. */
export function usePrivateStore<T>(key: string, schema: z.ZodType<T>, createEmpty: () => T) {
  const [data, setData] = useState<T>(createEmpty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [importLimit,setImportLimit]=useState(2_000_000);
  const generation = useRef(0);
  // Identifies this store instance for the slow-read notice; loadedRef mirrors `loaded` for event handlers.
  const owner = useRef({}), loadedRef = useRef(false);
  // The exact stored text this instance last read or wrote (legacy localStorage path only). A change event or a
  // BroadcastChannel message for bytes it already holds (its own save echoing back) then needs no second parse.
  const heldRaw = useRef<string | null>(null);
  const markLoaded = useCallback(() => { loadedRef.current = true; endFirstRead(owner.current); setLoaded(true); }, []);
  const refresh = useCallback(async () => {
    const current=++generation.current;
    try {
      const storage=getAppStorage();
      const raw=storage.getItem(key),durable=isDurableMarker(raw);
      setImportLimit(durable?32_000_000:2_000_000);
      if(!durable&&raw!==null&&raw===heldRaw.current&&loadedRef.current)return;
      const cache=sharedParse(storage,key,schema),hit=!durable&&raw!==null?cache.get(raw):undefined;
      const next=hit ? hit.data as T : durable ? await readDurableStore(storage,key,schema) : readPrivateStore(storage,key,schema,createEmpty);
      if(!hit&&!durable&&raw!==null&&storage.getItem(key)===raw)cache.set(raw,next);
      if(current!==generation.current||storage!==getAppStorage())return;
      heldRaw.current=durable?null:raw;
      setData(next);
      setError("");
    } catch (error) {
      if(current!==generation.current)return;
      heldRaw.current=null;
      setData(createEmpty());
      let locked=false;try{locked=!!getAccountScope()&&isAccountLocked();}catch{}
      // Storage the browser denies (private browsing, blocked site data) is not damage (QA-18).
      setError(locked?"Account records are locked. Verify your account and unlock the vault in Settings.":blockedReadMessage(error)??"Private data could not be read. It has not been changed. Export the original from Settings before restoring a backup.");
    }
    markLoaded();
  }, [key, schema, createEmpty, markLoaded]);
  useEffect(() => {
    let active = true;
    // The same counter object refresh() reads: the cleanup must invalidate whichever read is in
    // flight at that time, so it increments the live counter, not a value copied at setup.
    const reads = generation, instance = owner.current;
    if (!loadedRef.current) beginFirstRead(instance);
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { try{if (!isShowcase() && (!event.key || event.key === storageLockKey(getAppStorage(),key))) refresh();}catch{void refresh();} };
    const onAccount=()=>{generation.current++;heldRaw.current=null;setData(createEmpty());loadedRef.current=false;setLoaded(false);beginFirstRead(instance);void refresh();};
    // Retry from the slow-read notice: only a store that has not loaded reads again.
    const onRetry=()=>{if(!loadedRef.current)void refresh();};
    window.addEventListener(PRIVATE_READ_RETRY,onRetry);
    window.addEventListener(ACCOUNT_CHANGE,onAccount);
    const onChange = (event: Event) => { if ((event as CustomEvent<string>).detail === key) refresh(); };
    const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("zigoals:private-updates:v1"):null;
    if(channel)channel.onmessage=(event:MessageEvent)=>{if(!isShowcase()&&event.data===key)refresh();};
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onChange);
    return () => { active = false; reads.current++; endFirstRead(instance); window.removeEventListener(PRIVATE_READ_RETRY,onRetry); window.removeEventListener(ACCOUNT_CHANGE,onAccount); channel?.close(); window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, onChange); };
  }, [key, refresh, createEmpty]);
  const publish = useCallback((next: T) => {
    setData(next); setError(""); markLoaded();
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    if(!isShowcase()&&typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel("zigoals:private-updates:v1");channel.postMessage(key);channel.close();}
  }, [key, markLoaded]);
  const update = useCallback(async (updater: (latest: T) => T) => {
    if (!loaded) throw Error("Private data is still loading.");
    let draftError:unknown,durable=false;const apply=(latest:T)=>{try{return updater(latest);}catch(error){draftError=error;throw error;}};
    try { const storage=getAppStorage();durable=isDurableMarker(storage.getItem(key)); const next=await (durable ? updateDurableStore(storage,key,schema,apply) : updatePrivateStore(storage,key,schema,createEmpty,apply)); if(storage===getAppStorage()){heldRaw.current=durable?null:storage.getItem(key);if(heldRaw.current!==null)sharedParse(storage,key,schema).set(heldRaw.current,next);publish(next);} }
    catch (error) {
      // A rejected draft or full storage is not a corrupt store. Preserve forms
      // when the original record still reads; block only an actual read failure.
      refresh();
      if(draftError instanceof Error)throw draftError;
      // The coded reason (storage-error-copy.ts) is the message; the original error stays as the cause for callers that
      // say it their own way (a check-in, a restore).
      throw Error(saveFailureMessage(error,{durable}),{cause:error});
    }
  }, [loaded, publish, key, schema, createEmpty, refresh]);
  const importData = useCallback(async (raw: string) => {
    // Like update: never replace a store before its current contents were read.
    if (!loaded) throw Error("Private data is still loading.");
    let durable=false;
    try { const storage=getAppStorage();durable=isDurableMarker(storage.getItem(key)); const next=await (durable ? restoreDurableStore(storage,key,schema,raw) : importPrivateStore(storage,key,schema,raw)); if(storage===getAppStorage()){heldRaw.current=durable?null:storage.getItem(key);publish(next);} }
    catch (error) {
      refresh();
      throw Error(restoreFailureMessage(error,{durable}),{cause:error});
    }
  }, [loaded, key, schema, publish, refresh]);
  const exportData = useCallback(async () => { const storage=getAppStorage();return isDurableMarker(storage.getItem(key))?await exportDurableStore(storage,key):storage.getItem(key)??JSON.stringify(createEmpty()); }, [key, createEmpty]);
  return { data, loaded, error, importLimit, update, importData, exportData, refresh };
}
