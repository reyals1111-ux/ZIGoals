"use client";
import { useEffect, useState } from "react";
import { useJournalZone } from "../use-journal-zone";
import { healthDay } from "../../lib/health-daily";

/**
 * Today in the Health journal's zone (or the device's), re-read every 30 s, on focus and when the tab becomes visible
 * again, so a Health page left open across midnight moves to the new day (QA-16). History is never renamed.
 */
export function useHealthToday(timezone: string | null) {
  // Session W Part 17: with no Health zone, the journal zone decides the day; a change to it refreshes the day at once.
  const journal = useJournalZone().zone;
  const [today, setToday] = useState(() => healthDay(timezone));
  useEffect(() => {
    const refresh = () => { try { setToday(healthDay(timezone)); } catch { /* an invalid zone keeps the last day */ } };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [timezone, journal]);
  return today;
}
