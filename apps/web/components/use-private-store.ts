"use client";
import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { importPrivateStore, readPrivateStore, updatePrivateStore } from "../lib/private-storage";
const EVENT = "zigoals:private-change";
/** Browser-only private state. No backend, wallet dependency, or automatic demo seeding. */
export function usePrivateStore<T>(key: string, schema: z.ZodType<T>, createEmpty: () => T) {
  const [data, setData] = useState<T>(createEmpty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    try {
      setData(readPrivateStore(localStorage, key, schema, createEmpty));
      setError("");
    } catch {
      setData(createEmpty());
      setError("Private data could not be read. It has not been changed. Export the original from Settings before restoring a backup.");
    }
    setLoaded(true);
  }, [key, schema, createEmpty]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === key) refresh(); };
    const onChange = (event: Event) => { if ((event as CustomEvent<string>).detail === key) refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onChange);
    return () => { active = false; window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, onChange); };
  }, [key, refresh]);
  const publish = useCallback((next: T) => {
    setData(next); setError(""); setLoaded(true);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  }, [key]);
  const update = useCallback(async (updater: (latest: T) => T) => {
    if (!loaded) throw Error("Private data is still loading.");
    try { publish(await updatePrivateStore(localStorage, key, schema, createEmpty, updater)); }
    catch {
      // A rejected draft or full storage is not a corrupt store. Preserve forms
      // when the original record still reads; block only an actual read failure.
      refresh();
      const message = "Could not save private data. Nothing was applied. Check storage access or restore a valid backup in Settings.";
      throw Error(message);
    }
  }, [loaded, publish, key, schema, createEmpty, refresh]);
  const importData = useCallback(async (raw: string) => {
    try { publish(await importPrivateStore(localStorage, key, schema, raw)); }
    catch {
      refresh();
      const message = "Backup could not be imported. Check its module, version and size. Existing private data was preserved.";
      throw Error(message);
    }
  }, [key, schema, publish, refresh]);
  const exportData = useCallback(() => localStorage.getItem(key) ?? JSON.stringify(createEmpty()), [key, createEmpty]);
  return { data, loaded, error, update, importData, exportData, refresh };
}
