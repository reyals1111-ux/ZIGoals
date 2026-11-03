"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import "./offline-notice.css";

function subscribe(change: () => void) {
  window.addEventListener("online", change); window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}
/**
 * QA-23 (Session I, Part 10): while the browser is offline, a link to another page would only reach the browser's
 * "No internet" page, so in-app links keep the reader on the current page, which keeps working and saving on this
 * device, and this line says so. Online, it renders nothing.
 * Session AK Part 3 (QA-23 closed, ADR-036 Q4): pages this device has visited are kept by the app's service worker, so a
 * link to one of them opens offline — as a full page load, which the worker answers from its copy — and the line says
 * which pages work. Any other link still keeps the reader here.
 */
async function savedPages(): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    if (typeof caches === "undefined" || !navigator.serviceWorker?.controller) return out;
    for (const name of await caches.keys()) if (name.startsWith("zigoals-pages-")) for (const request of await (await caches.open(name)).keys()) { const url = new URL(request.url); if (!url.search.includes("_rsc")) out.add(url.pathname); }
  } catch { /* no cache: links stay held */ }
  return out;
}
export function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  useEffect(() => { if (!online) void savedPages().then(setSaved); }, [online]);
  useEffect(() => {
    if (online) return;
    const hold = (event: MouseEvent) => {
      // Read the connection at the click itself: right after reconnecting, this listener can still be in place for a
      // moment before the "online" event has reached the page, and a link must never be held once the browser is online.
      if (navigator.onLine) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      event.preventDefault(); event.stopPropagation();
      // A page kept for offline use opens as a full load, which the service worker answers from its copy.
      if (saved.has(url.pathname)) window.location.assign(url.href);
    };
    document.addEventListener("click", hold, true);
    return () => document.removeEventListener("click", hold, true);
  }, [online, saved]);
  if (online) return null;
  return <p className="offline-notice" role="alert">You’re offline. This page keeps working and saves on this device{saved.size ? "; pages you opened before open too, the rest when you’re back online." : "; other pages open again when you’re back online."}</p>;
}

/**
 * Session AA-Cloud Part 6: a small "Offline" pill in the header (the phone top bar, the sidebar) for as long as the
 * browser is offline, beside the notice above; it says the page keeps saving on this device. Online, nothing.
 */
export function OfflinePill() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <span className="offline-pill" title="This page keeps working and saves on this device">Offline<span className="sr-only"> · this page keeps saving on this device</span></span>;
}
