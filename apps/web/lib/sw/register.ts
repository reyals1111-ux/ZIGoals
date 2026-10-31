/**
 * Session AK Parts 2–3 (ADR-036 Q4): the app's one service worker, `/sw.js?v=<build>`, at scope "/". The version in the
 * address makes each build a new worker with its own page cache; the older worker's caches leave when it takes over.
 * It replaces ADR-010's push-only `/push-sw.js` at the same scope, so a push subscription made under the old worker stays
 * with the registration (the push service keeps it; only the script changes).
 */
export const SW_SCOPE = '/';
export function swVersion(): string {
  const commit = (process.env.NEXT_PUBLIC_APP_COMMIT ?? '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 12);
  return `${commit || 'dev'}${process.env.NEXT_PUBLIC_APP_DIRTY === 'true' ? '-d' : ''}`;
}
export const swUrl = () => `/sw.js?v=${swVersion()}`;
export const swSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && window.isSecureContext;
/** Registers (or updates to) this build's worker; never throws. */
export async function registerAppWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try { return await navigator.serviceWorker.register(swUrl(), {scope: SW_SCOPE, updateViaCache: 'none'}); } catch { return null; }
}
export async function appRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try { return (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? null; } catch { return null; }
}
/** Erase everything: the offline caches leave (the worker stays, empty, so the app still opens). */
export async function forgetOfflineCaches(): Promise<void> {
  try { if (typeof caches !== 'undefined') for (const key of await caches.keys()) if (key.startsWith('zigoals-')) await caches.delete(key); } catch { /* nothing cached */ }
}
