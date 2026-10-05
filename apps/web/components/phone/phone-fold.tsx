"use client";
import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import type { LayoutAttrs } from "../layout-edit";
import { AppIcon } from "../app-icon";
import { usePhoneActive } from "./use-phone-layout";
import "./phone-fold.css";

/**
 * A secondary module folded to one labelled row on a phone (Session I, Part 9), so Today and Wealth get shorter without
 * removing anything: the row opens the module in place, where it was. A link to something inside it (a #hash) opens it.
 * Desktop and tablet render the children exactly as before (usePhoneActive is false on the server, during hydration
 * and off the phone query). As a layout item it passes the region's attributes on: to its row on a phone, and to its
 * child elsewhere, so arranging works as it did.
 */
export function PhoneFold({ label, children, always = false, expanded = false, remembered, onToggle, ...layout }: LayoutAttrs & { label: string; children: ReactNode; always?: boolean; expanded?: boolean; remembered?: boolean; onToggle?: (open: boolean) => void }) {
  // `always` (Session P, the "For you" area): the same folded row on every size, not only on phones.
  // `expanded` (Session P, a running fast): the module stays open on a phone, with the same element tree, so a module
  // that must be seen while something runs is neither folded away nor remounted when it changes state.
  // `remembered` / `onToggle` (Session V Part 1b, Today's widget rows): the row opens as the person left it, read by the
  // caller after mount; a toggle by the person tells the caller, which remembers it. Viewing writes nothing.
  const phone = usePhoneActive() || always, [chosen, setOpen] = useState(false), open = chosen || expanded, id = useId(), body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (expanded) setOpen(true); }, [expanded]);
  useEffect(() => { if (remembered) setOpen(true); }, [remembered]);
  useEffect(() => {
    if (!phone) return;
    const reveal = () => {
      const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (target && body.current?.contains(target)) { setOpen(true); requestAnimationFrame(() => target.scrollIntoView({ block: "start" })); }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [phone]);
  if (!phone) return isValidElement(children) && Object.keys(layout).length ? cloneElement(children as ReactElement<Record<string, unknown>>, layout) : <>{children}</>;
  return <div {...layout} className="phone-fold" data-open={open || undefined}>
    {!expanded && <button type="button" className="phone-fold-toggle" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!chosen); onToggle?.(!chosen); }}>
      <span>{label}</span><span className="phone-fold-hint" aria-hidden="true">{open ? "Hide" : "Show"}<AppIcon name="chevron" size={18} /></span>
    </button>}
    <div id={id} ref={body} className="phone-fold-body" hidden={!open}>{children}</div>
  </div>;
}
