"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { LayoutAttrs } from "../layout-edit";
import { AppIcon } from "../app-icon";
import { usePhoneActive } from "./use-phone-layout";
import { hashId } from "../../lib/hash-id";
import { wealthFolds } from "../../lib/wealth-folds";
import { PhoneFold, type FoldProps } from "./phone-fold";
import "./phone-fold.css";

/**
 * Session AO (RR-16, DV-045e): a module that folds to a labelled row on a computer or a tablet too (on a phone it is the
 * usual PhoneFold); the rows the person opened are remembered on this device (lib/wealth-folds.ts), and an address into it
 * opens it. Its own module, so pages that only fold on phones (Today, Earn, Health) do not carry it (route weights).
 */
export function DeskFold({ desk, ...props }: FoldProps & { desk: string }) {
  return props.always ? <PhoneFold {...props}/> : <DeskOrPhoneFold desk={desk} {...props}/>;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const noop = () => () => {};
/** On a phone the usual fold; elsewhere a fold whose open state is this device's memory (Session AO, RR-16). */
function DeskOrPhoneFold({ desk, ...props }: FoldProps & { desk: string }) {
  const phone = usePhoneActive();
  if (phone) return <PhoneFold {...props}/>;
  const layout: LayoutAttrs = { "data-layout-item": props["data-layout-item"], "data-layout-region": props["data-layout-region"] };
  return <DeskFoldRow id={desk} label={props.label} detail={props.detail} {...layout}>{props.children}</DeskFoldRow>;
}
function DeskFoldRow({ id, label, detail, children, ...layout }: LayoutAttrs & { id: string; label: string; detail?: string; children: ReactNode }) {
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
