"use client";
import { useId, useState } from "react";
import { usePhoneActive } from "./use-phone-layout";

/**
 * "Show all N" for a long list on a phone (Session G, Part 4). Every item stays in the page; past the first `first`, the
 * phone CSS hides them (`data-phone-limit`, phone-base.css) until the button is pressed, and never while a page is being
 * arranged. Desktop and tablet render exactly as before: no attribute and no button (usePhoneActive is false on the
 * server, during hydration and off the phone query).
 */
export function usePhoneShowAll(first: 2 | 3 | 4) {
  const phone = usePhoneActive(), [all, setAll] = useState(false), id = useId();
  const active = (total: number) => phone && total > first;
  return {
    /** Spread on the list whose direct children are the items. */
    listProps: (total: number) => active(total) ? { id, "data-phone-limit": all ? undefined : String(first) } : {},
    /** The toggle, placed right after the list; `noun` names the items ("assets"). */
    button: (total: number, noun: string) => active(total)
      ? <button type="button" className="secondary phone-show-all" aria-controls={id} aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show fewer ${noun}` : `Show all ${total} ${noun}`}</button>
      : null,
  };
}
