"use client";
import { useEffect, useState } from "react";
import { localDate } from "../lib/local-date";
import { everyHalfMinute } from "./half-minute";
/** Literal local dates: refresh on focus and across midnight, without renaming history. */
export function useLocalToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const stop = everyHalfMinute(refresh);
    window.addEventListener("focus", refresh);
    return () => { stop(); window.removeEventListener("focus", refresh); };
  }, []);
  return today;
}
