"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { localDate } from "../lib/local-date";
import { everyHalfMinute } from "./half-minute";
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const noSubscribe = () => () => {};
/**
 * True while React hydrates this component from the server's HTML, false for a fresh render in the browser. React itself
 * answers (the server snapshot is used exactly while hydrating), so it also holds for a Suspense boundary that hydrates
 * after the shell has mounted: CI9 (product-visual/product-data, React #418 on Ecosystem, whose loading.tsx boundary
 * hydrated after the shell had set `data-app-hydrated`, so its cards started from the browser's day).
 */
export function useHydrating(): boolean {
  return useSyncExternalStore(noSubscribe, () => false, () => true);
}
/** The server's day: its own clock on the server, `<html data-server-day>` in the browser (the browser's day if missing). */
function serverDay(): string {
  if (typeof document === "undefined") return localDate();
  const server = document.documentElement.dataset.serverDay;
  return server && DAY_KEY.test(server) ? server : localDate();
}
/**
 * The day the first render uses: the server's day while hydrating, so the hydrated HTML matches the server's exactly
 * (Session AH, AF6: React #418 on Life review between 00:00 and 02:00 Brussels); the browser's own day replaces it right
 * after mount. A component mounted later starts from the browser's day at once.
 */
function firstDay(hydrating: boolean): string {
  return hydrating ? serverDay() : localDate();
}
/** Literal local dates: refresh on focus and across midnight, without renaming history. */
export function useLocalToday() {
  const hydrating = useHydrating();
  const [today, setToday] = useState(() => firstDay(hydrating));
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
 * render uses noon UTC of the first day (above), the same on the server and in the hydrating browser; the browser's own
 * clock replaces it right after mount.
 */
export function useDayNow(): number {
  const hydrating = useHydrating();
  const [now, setNow] = useState(() => Date.parse(`${firstDay(hydrating)}T12:00:00Z`));
  useEffect(() => { setNow(Date.now()); }, []);
  return now;
}
