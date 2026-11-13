"use client";
import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import type { LayoutAttrs } from "../layout-edit";
import { AppIcon } from "../app-icon";
import { usePhoneActive } from "./use-phone-layout";
import { hashId } from "../../lib/hash-id";
import { wealthFolds } from "../../lib/wealth-folds";
import "./phone-fold.css";

/**
 * A secondary module folded to one labelled row on a phone (Session I, Part 9), so Today and Wealth get shorter without
 * removing anything: the row opens the module in place, where it was. A link to something inside it (a #hash) opens it.
 * Desktop and tablet render the children exactly as before (usePhoneActive is false on the server, during hydration
 * and off the phone query). As a layout item it passes the region's attributes on: to its row on a phone, and to its
 * child elsewhere, so arranging works as it did.
 */
type FoldProps = LayoutAttrs & { label: string; detail?: string; children: ReactNode; always?: boolean; expanded?: boolean; remembered?: boolean; onToggle?: (open: boolean) => void };
/**
 * `desk` (Session AO, RR-16): on a computer or a tablet too, the module folds to a labelled row by default; the rows the
 * person opened are remembered on this device (lib/wealth-folds.ts), and an address into it opens it.
 */
export function PhoneFold({ desk, ...props }: FoldProps & { desk?: string }) {
  return desk && !props.always ? <DeskOrPhoneFold desk={desk} {...props}/> : <PhoneOnlyFold {...props}/>;
}
function PhoneOnlyFold({ label, detail, children, always = false, expanded = false, remembered, onToggle, ...layout }: FoldProps) {
  // `detail` (Session AK RB, RELEASE_REVIEW_2 R2-9): a short line under the name, part of the row's name — a Today widget's
  // figure, so the folded row keeps its value in view without a second summary of it elsewhere on the page.
  // `always` (Session P, the "For you" area): the same folded row on every size, not only on phones.
  // `expanded` (Session P, a running fast): the module stays open on a phone, with the same element tree, so a module
  // that must be seen while something runs is neither folded away nor remounted when it changes state.
  // `remembered` / `onToggle` (Session V Part 1b, Today's widget rows): the row opens as the person left it, read by the
  // caller after mount; a toggle by the person tells the caller, which remembers it. Viewing writes nothing.
  // A remembered row starts open, so it never shows folded first (the caller reads its memory on the client's first
  // render; on the server and during hydration a phone row is not rendered at all unless `always`).
  const phone = usePhoneActive() || always, [chosen, setOpen] = useState(!!remembered && !always), open = chosen || expanded, id = useId(), body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (expanded) setOpen(true); }, [expanded]);
  useEffect(() => { if (remembered) setOpen(true); }, [remembered]);
  useEffect(() => {
    if (!phone) return;
    const reveal = () => {
      const id = hashId(location.hash), target = id ? document.getElementById(id) : null;
      if (target && body.current?.contains(target)) { setOpen(true); requestAnimationFrame(() => target.scrollIntoView({ block: "start" })); }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [phone]);
  if (!phone) return isValidElement(children) && Object.keys(layout).length ? cloneElement(children as ReactElement<Record<string, unknown>>, layout) : <>{children}</>;
  return <div {...layout} className="phone-fold" data-open={open || undefined}>
    {!expanded && <button type="button" className="phone-fold-toggle" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!chosen); onToggle?.(!chosen); }}>
      <span>{label}{detail && <small className="phone-fold-detail"> {detail}</small>}</span><span className="phone-fold-hint" aria-hidden="true">{open ? "Hide" : "Show"}<AppIcon name="chevron" size={18} /></span>
    </button>}
    <div id={id} ref={body} className="phone-fold-body" hidden={!open}>{children}</div>
  </div>;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const noop = () => () => {};
/** On a phone the usual fold; elsewhere a fold whose open state is this device's memory (Session AO, RR-16). */
function DeskOrPhoneFold({ desk, ...props }: FoldProps & { desk: string }) {
  const phone = usePhoneActive();
  if (phone) return <PhoneOnlyFold {...props}/>;
  const layout: LayoutAttrs = { "data-layout-item": props["data-layout-item"], "data-layout-region": props["data-layout-region"] };
  return <DeskFold id={desk} label={props.label} detail={props.detail} {...layout}>{props.children}</DeskFold>;
}
function DeskFold({ id, label, detail, children, ...layout }: LayoutAttrs & { id: string; label: string; detail?: string; children: ReactNode }) {
  const remembered = useSyncExternalStore(wealthFolds.subscribe, () => wealthFolds.snapshot().has(id), () => false);
  // A jump into the module opens it for this visit (not remembered: only the person's own press is).
  const [jumped, setJumped] = useState(false), open = remembered || jumped, bodyId = useId(), body = useRef<HTMLDivElement>(null);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  useIsoLayoutEffect(() => {
    const reveal = () => {
      const target = hashId(location.hash), el = target ? document.getElementById(target) : null;
      // The DOM opens now (React's state catches up), so the scroll that follows finds the target (as Settings' folds do).
      if (el && body.current?.contains(el)) { body.current.removeAttribute("hidden"); setJumped(true); el.scrollIntoView({ block: "start" }); requestAnimationFrame(() => el.scrollIntoView({ block: "start" })); }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  // `hidden="until-found"`: find in page still reaches a folded module's words and opens it (plain `hidden` elsewhere).
  useIsoLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    if (open) el.removeAttribute("hidden"); else el.setAttribute("hidden", "until-found");
    const found = () => setJumped(true);
    el.addEventListener("beforematch", found);
    return () => el.removeEventListener("beforematch", found);
  }, [open, hydrated]);
  return <div {...layout} className="phone-fold desk-fold" data-open={open || undefined}>
    <button type="button" className="phone-fold-toggle desk-fold-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => { setJumped(false); wealthFolds.set(id, !open); }}>
      <span>{label}{detail && <small className="phone-fold-detail"> {detail}</small>}</span><span className="phone-fold-hint" aria-hidden="true">{open ? "Hide" : "Show"}<AppIcon name="chevron" size={18} /></span>
    </button>
    <div id={bodyId} ref={body} className="phone-fold-body">{children}</div>
  </div>;
}
