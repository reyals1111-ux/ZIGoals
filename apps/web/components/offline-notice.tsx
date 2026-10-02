"use client";
import { useEffect, useSyncExternalStore } from "react";
import "./offline-notice.css";

function subscribe(change: () => void) {
  window.addEventListener("online", change); window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}
/**
 * QA-23 (Session I, Part 10): while the browser is offline, a link to another page would only reach the browser's
 * "No internet" page, so in-app links keep the reader on the current page, which keeps working and saving on this
 * device, and this line says so. Nothing is cached and no request is added; online, it renders nothing.
 */
export function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  useEffect(() => {
    if (online) return;
    const hold = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      event.preventDefault(); event.stopPropagation();
    };
    document.addEventListener("click", hold, true);
    return () => document.removeEventListener("click", hold, true);
  }, [online]);
  if (online) return null;
  return <p className="offline-notice" role="alert">You’re offline. This page keeps working and saves on this device; other pages open again when you’re back online.</p>;
}
