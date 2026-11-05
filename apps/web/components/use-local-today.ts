"use client";
import { useEffect, useState } from "react";
import { localDate } from "../lib/local-date";
import { everyHalfMinute } from "./half-minute";
/**
 * The day the first render uses. While the page is still hydrating (the shell has not set `data-app-hydrated` yet) it is
 * the server's day from `<html data-server-day>`, so the hydrated HTML matches the server's exactly (Session AH, AF6:
 * React #418 on Life review between 00:00 and 02:00 Brussels); the browser's own day replaces it right after mount.
 * A component mounted later starts from the browser's day at once.
 */
export function initialDay(): string {
  if (typeof document === "undefined") return localDate();
  const root = document.documentElement, server = root.dataset.serverDay;
  return !("appHydrated" in root.dataset) && server && /^\d{4}-\d{2}-\d{2}$/.test(server) ? server : localDate();
}
/** Literal local dates: refresh on focus and across midnight, without renaming history. */
export function useLocalToday() {
  const [today, setToday] = useState(initialDay);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    refresh();
    const stop = everyHalfMinute(refresh);
    window.addEventListener("focus", refresh);
    return () => { stop(); window.removeEventListener("focus", refresh); };
  }, []);
  return today;
}
/**
 * CI1 (product-visual, React #418): "now" for text worded by whole days (a notice's date as passed or to come). The first
 * render uses noon UTC of `initialDay()`, the same on the server and in the hydrating browser; the browser's own clock
 * replaces it right after mount.
 */
export function useDayNow(): number {
  const [now, setNow] = useState(() => Date.parse(`${initialDay()}T12:00:00Z`));
  useEffect(() => { setNow(Date.now()); }, []);
  return now;
}
