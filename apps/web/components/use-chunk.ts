'use client';
import {useSyncExternalStore} from 'react';

/**
 * CI14 (page weights; budgets are never raised): a part of a page that shows only once the page's records have been read
 * (after mount: never on the server or in the first paint) can live in a chunk of its own. `chunk()` asks for that chunk
 * as soon as the page's own code runs in the browser, so it arrives while the records are read, and the hook it returns
 * gives the loaded module, or null while it is on its way (and on the server and during hydration, so the first client
 * render is the server's). A page treats "not here yet" as "still loading": it keeps showing exactly what it showed while
 * its records were read, and its own ready marks (data-loaded, data-agenda, …) wait for it too, so nothing reads as
 * ready before it is drawn. A chunk that cannot be fetched (offline after a new version) is `failed` until the page
 * reloads, as LoadBoundary treats a failed load; the page then says so in place.
 */
export type Chunk<T> = {mod: T | null; failed: boolean};
export function chunk<T>(load: () => Promise<T>): () => Chunk<T> {
  const waiting: Chunk<T> = {mod: null, failed: false}, failed: Chunk<T> = {mod: null, failed: true};
  let state = waiting, started = false;
  const listeners = new Set<() => void>();
  const start = () => {
    if (started) return;
    started = true;
    load().then(mod => { state = {mod, failed: false}; }, () => { state = failed; }).finally(() => { for (const l of listeners) l(); });
  };
  if (typeof window !== 'undefined') start();
  const subscribe = (listener: () => void) => { listeners.add(listener); start(); return () => { listeners.delete(listener); }; };
  const read = () => state, server = () => waiting;
  return () => useSyncExternalStore(subscribe, read, server);
}
/** Thrown inside a LoadBoundary when a chunk failed, so the page says "could not be opened" in its own words. */
export function ChunkFailed({what}: {what: string}): never {
  throw new Error(`${what} could not be loaded.`);
}
