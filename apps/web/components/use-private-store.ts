"use client";
import {getAppStorage,isShowcase,storageLockKey} from "../lib/showcase-storage";
import {ACCOUNT_CHANGE,getAccountScope,isAccountLocked} from "../lib/account-session";
import { useCallback, useEffect, useState, useRef } from "react";
import type { z } from "zod";
import { importPrivateStore, readPrivateStore, updatePrivateStore } from "../lib/private-storage";
import {isDurableMarker,readDurableStore,updateDurableStore,restoreDurableStore,exportDurableStore} from "../lib/vault/local";
import {beginFirstRead,endFirstRead,PRIVATE_READ_RETRY} from "./private-read-delay";
const EVENT = "zigoals:private-change";
/** Browser-only private state. No backend, wallet dependency, or automatic demo seeding. */
export function usePrivateStore<T>(key: string, schema: z.ZodType<T>, createEmpty: () => T) {
  const [data, setData] = useState<T>(createEmpty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [importLimit,setImportLimit]=useState(2_000_000);
  const generation = useRef(0);
  // Identifies this store instance for the slow-read notice; loadedRef mirrors `loaded` for event handlers.
  const owner = useRef({}), loadedRef = useRef(false);
  const markLoaded = useCallback(() => { loadedRef.current = true; endFirstRead(owner.current); setLoaded(true); }, []);
  const refresh = useCallback(async () => {
    const current=++generation.current;
    try {
      const storage=getAppStorage();
      setImportLimit(isDurableMarker(storage.getItem(key))?32_000_000:2_000_000);
      const next=isDurableMarker(storage.getItem(key)) ? await readDurableStore(storage,key,schema) : readPrivateStore(storage,key,schema,createEmpty);
      if(current!==generation.current||storage!==getAppStorage())return;
      setData(next);
      setError("");
    } catch {
      if(current!==generation.current)return;
      setData(createEmpty());
      let locked=false;try{locked=!!getAccountScope()&&isAccountLocked();}catch{}
      setError(locked?"Account records are locked. Verify your account and unlock the vault in Settings.":"Private data could not be read. It has not been changed. Export the original from Settings before restoring a backup.");
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
    const onAccount=()=>{generation.current++;setData(createEmpty());loadedRef.current=false;setLoaded(false);beginFirstRead(instance);void refresh();};
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
    let draftError:unknown;const apply=(latest:T)=>{try{return updater(latest);}catch(error){draftError=error;throw error;}};
    try { const storage=getAppStorage(); const next=await (isDurableMarker(storage.getItem(key)) ? updateDurableStore(storage,key,schema,apply) : updatePrivateStore(storage,key,schema,createEmpty,apply)); if(storage===getAppStorage())publish(next); }
    catch {
      // A rejected draft or full storage is not a corrupt store. Preserve forms
      // when the original record still reads; block only an actual read failure.
      refresh();
      if(draftError instanceof Error)throw draftError;
      const message = "Could not save private data. Nothing was applied. Check storage access or restore a valid backup in Settings.";
      throw Error(message);
    }
  }, [loaded, publish, key, schema, createEmpty, refresh]);
  const importData = useCallback(async (raw: string) => {
    // Like update: never replace a store before its current contents were read.
    if (!loaded) throw Error("Private data is still loading.");
    try { const storage=getAppStorage(); const next=await (isDurableMarker(storage.getItem(key)) ? restoreDurableStore(storage,key,schema,raw) : importPrivateStore(storage,key,schema,raw)); if(storage===getAppStorage())publish(next); }
    catch {
      refresh();
      const message = "Backup could not be imported. Check its module, version and size. Existing private data was preserved.";
      throw Error(message);
    }
  }, [loaded, key, schema, publish, refresh]);
  const exportData = useCallback(async () => { const storage=getAppStorage();return isDurableMarker(storage.getItem(key))?await exportDurableStore(storage,key):storage.getItem(key)??JSON.stringify(createEmpty()); }, [key, createEmpty]);
  return { data, loaded, error, importLimit, update, importData, exportData, refresh };
}
