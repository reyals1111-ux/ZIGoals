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
/**
 * Erase everything: the offline caches leave. Session AK (journey bug J6-1): the running worker kept caching the next
 * files the page loaded, so the static-files cache (zigoals-static-v1) was back at once. It is first told to stop caching (and to empty
 * its caches; it answers when done, or after a short wait for an older worker that does not answer), then this build's
 * worker is unregistered, so the next load starts a fresh one (NotifySync registers it again); ADR-010's account worker
 * (`/push-sw.js`) is left as it was. Then the page deletes every ZIGoals cache itself. Never throws.
 */
export async function forgetOfflineCaches({wait = 2000}: {wait?: number} = {}): Promise<void> {
  try {
    const reg = await appRegistration(), workers = [reg?.active, reg?.waiting, reg?.installing, swSupported() ? navigator.serviceWorker.controller : null];
    const ours = [...new Set(workers.filter((w): w is ServiceWorker => !!w && new URL(w.scriptURL, window.location.href).pathname === '/sw.js'))];
    await Promise.all(ours.map(w => new Promise<void>(resolve => {
      const channel = new MessageChannel(), timer = setTimeout(resolve, wait);
      channel.port1.onmessage = () => { clearTimeout(timer); resolve(); };
      try { w.postMessage({type: 'zigoals:sw-forget'}, [channel.port2]); } catch { clearTimeout(timer); resolve(); }
    })));
    if (reg && ours.length && reg.active && new URL(reg.active.scriptURL, window.location.href).pathname === '/sw.js') await reg.unregister();
  } catch { /* no worker on this device */ }
  try { if (typeof caches !== 'undefined') for (const key of await caches.keys()) if (key.startsWith('zigoals-')) await caches.delete(key); } catch { /* nothing cached */ }
}
