"use client";
import { useLayoutEffect, useState } from "react";
import { displayLocale, resolveDisplayLocale, setDisplayLocale } from "../lib/visual-format";

/**
 * The page-content key for the display locale (Session G, Part 3; see lib/visual-format.ts). The server render and
 * hydration use en-US. In the hydration commit this layout effect reads the browser's languages; when they resolve to
 * another locale it switches the formatter and returns a new key, so the Shell remounts the page content once before
 * the first paint and every figure is written in that locale. en-US keeps key 0 and never remounts. A later language
 * change in the browser (languagechange) switches again the same way.
 */
export function useDisplayLocaleKey() {
  const [key, setKey] = useState(0);
  useLayoutEffect(() => {
    const apply = () => {
      const next = resolveDisplayLocale(typeof navigator === "undefined" ? undefined : navigator.languages?.length ? navigator.languages : [navigator.language]);
      if (next === displayLocale()) return;
      setDisplayLocale(next);
      setKey((current) => current + 1);
    };
    apply();
    window.addEventListener("languagechange", apply);
    return () => window.removeEventListener("languagechange", apply);
  }, []);
  return key;
}
