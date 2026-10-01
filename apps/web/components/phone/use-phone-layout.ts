"use client";
import { useSyncExternalStore } from "react";

/**
 * The phone experience (Session E): narrower than 768 CSS px, or a landscape phone (coarse pointer, at most 500 px tall).
 * The same query guards every rule in components/phone/*.css; tablets and desktops never match it.
 */
export const PHONE_QUERY = "(max-width: 767.98px), (pointer: coarse) and (max-height: 500px)";

function subscribe(callback: () => void) {
  let media: MediaQueryList;
  try { media = window.matchMedia(PHONE_QUERY); } catch { return () => {}; }
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function snapshot() { try { return window.matchMedia(PHONE_QUERY).matches; } catch { return false; } }

/**
 * For the phone chrome's markup only. It is server-rendered, so a phone never flashes the desktop header, and CSS keeps
 * it hidden elsewhere until hydration removes it; desktop and tablet end up with exactly their old DOM.
 */
export function usePhoneChrome() { return useSyncExternalStore(subscribe, snapshot, () => true); }

/** For phone behaviour and page-level phone markup: false on the server and during hydration, so desktop runs none of it. */
export function usePhoneActive() { return useSyncExternalStore(subscribe, snapshot, () => false); }
