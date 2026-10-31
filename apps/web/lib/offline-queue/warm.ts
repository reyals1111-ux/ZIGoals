/**
 * Session AK (journey bug J4-2): the offline queue's code must already be on the device when the network goes. Imported
 * for the first time inside an offline branch, its chunk could never load (the worker caches hashed files only as they
 * are visited online), so nothing was kept for later. A caller on an eagerly loaded page warms it on an idle moment
 * while online; the import is remembered, so the offline call resolves from memory (and the worker has the file for
 * the next visit). A failed warm-up is forgotten, so the next call tries again.
 */
type QueueModule = typeof import('./queue');
let pending: Promise<QueueModule> | null = null;
export function offlineQueue(load: () => Promise<QueueModule> = () => import('./queue')): Promise<QueueModule> {
  if (!pending) pending = load().catch(error => { pending = null; throw error; });
  return pending;
}
/** Warms the queue's code once the page is idle, online only. Returns a cancel for an effect's clean-up. */
export function warmOfflineQueue(load?: () => Promise<QueueModule>): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || navigator.onLine === false || pending) return () => {};
  const run = () => { offlineQueue(load).catch(() => { /* tried again when it is needed */ }); };
  // Safari has no requestIdleCallback: a short timer stands in (as lib/vault/revocation-check.ts does).
  if (typeof window.requestIdleCallback === 'function') { const handle = window.requestIdleCallback(run, {timeout: 5000}); return () => window.cancelIdleCallback(handle); }
  const handle = setTimeout(run, 2000); return () => clearTimeout(handle);
}
/** For tests: forget the remembered import. */
export const resetOfflineQueueWarmth = () => { pending = null; };
