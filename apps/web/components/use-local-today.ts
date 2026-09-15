"use client";
import { useEffect, useState } from "react";
import { localDate } from "../lib/local-date";
/** Literal local dates: refresh on focus and across midnight, without renaming history. */
export function useLocalToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return today;
}
