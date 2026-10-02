'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { AppIcon } from "./app-icon";
import { entranceAllowed } from "./use-entrance";

/**
 * The single source of navigation order and grouping, for the desktop sidebar, the tablet header and the phone More sheet
 * alike (Session I): your life areas, then money tools, then the rest. Groups are separated by space, never a divider.
 */
export const NAV_GROUPS = [
  [
    ["/app", "Today", "today"],
    ["/app/goals", "Goals", "goals"],
    ["/app/habits", "Habits", "habits"],
    ["/app/health", "Health", "health"],
    ["/app/wealth", "Wealth", "wallet"],
  ],
  [
    ["/app/markets", "Markets", "activity"],
    ["/app/staking", "Staking", "future"],
    ["/app/portfolio", "Portfolio", "portfolio"],
  ],
  [
    ["/app/ecosystem", "Ecosystem", "ecosystem"],
    ["/app/activity", "Activity", "activity"],
    ["/app/settings", "Settings", "settings"],
  ],
] as const;
export const NAV_ITEMS = NAV_GROUPS.flat();
/** The group a destination opens (2 or 3), for the space before it; the first group needs none. */
export const NAV_GROUP_START: ReadonlyMap<string, number> = new Map(NAV_GROUPS.slice(1).map((group, index) => [group[0][0], index + 2]));
/** The Staking page's former address (until Session I it sat under Goals); it now redirects to /app/staking. */
export const LEGACY_STAKING_PATH = "/app/goals/positions";
/** The active item's own box styles, copied onto the glide so it looks identical at every breakpoint. */
const GLIDE_STYLES = ["backgroundImage", "backgroundColor", "backgroundOrigin", "backgroundClip", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle", "borderColor", "borderRadius", "boxShadow"] as const;
type Box = { x: number; y: number; w: number; h: number };

function boxOf(link: Element, nav: Element): Box {
  const a = link.getBoundingClientRect(), n = nav.getBoundingClientRect();
  return { x: a.left - n.left + nav.scrollLeft, y: a.top - n.top + nav.scrollTop, w: a.width, h: a.height };
}

/** Whether a navigation destination is the current page (the old Staking address under /app/goals belongs to Staking). */
export function isNavActive(path: string, href: string) {
  if (href === "/app") return path === href;
  if (path === LEGACY_STAKING_PATH) return href === "/app/staking";
  return path === href || path.startsWith(`${href}/`);
}

export function AppNav() {
  const path = usePathname();
  const isActive = (href: string) => isNavActive(path, href);
  const nav = useRef<HTMLElement>(null), glide = useRef<HTMLSpanElement>(null), previous = useRef<Box | null>(null);
  // The highlight travels from the previous item to the new one; aria-current and focus move immediately.
  useLayoutEffect(() => {
    const el = nav.current, layer = glide.current, active = el?.querySelector('a[aria-current="page"]');
    if (!el || !layer || !active) { previous.current = null; return; }
    const from = previous.current, to = boxOf(active, el);
    previous.current = to;
    if (!from || (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h) || !entranceAllowed()) return;
    const style = getComputedStyle(active);
    for (const key of GLIDE_STYLES) layer.style[key] = style[key];
    const place = (box: Box) => { layer.style.width = `${box.w}px`; layer.style.height = `${box.h}px`; layer.style.transform = `translate(${box.x}px, ${box.y}px)`; };
    layer.dataset.state = "start"; place(from);
    el.dataset.gliding = "";
    void layer.offsetWidth;
    layer.dataset.state = "moving"; place(to);
    let settled = false;
    const settle = () => { if (settled) return; settled = true; delete el.dataset.gliding; layer.dataset.state = "done"; };
    const onEnd = (event: TransitionEvent) => { if (event.propertyName === "transform") settle(); };
    layer.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(settle, 700);
    return () => { layer.removeEventListener("transitionend", onEnd); window.clearTimeout(fallback); settle(); };
  }, [path]);
  // The newly selected item arrives once: its icon gives a small pop and one nebula light passes across it as the glide lands.
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const active = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!mounted.current) { mounted.current = true; return; }
    // A nav that is not rendered (the phone layout hides it) never gets an arrival mark it could not clear.
    if (!active || !entranceAllowed() || !active.getClientRects().length) return;
    active.dataset.arrive = "";
    const done = (event: AnimationEvent) => { if (event.animationName === "nav-arrive-sweep") delete active.dataset.arrive; };
    active.addEventListener("animationend", done);
    active.addEventListener("animationcancel", done);
    return () => { active.removeEventListener("animationend", done); active.removeEventListener("animationcancel", done); delete active.dataset.arrive; };
  }, [path]);
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const measure = () => { const active = el.querySelector('a[aria-current="page"]'); previous.current = active ? boxOf(active, el) : null; };
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <nav ref={nav} className="app-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(([href, label, icon]) => (
        <Link key={href} href={href}
          data-group-start={NAV_GROUP_START.get(href)}
          aria-current={isActive(href) ? "page" : undefined}>
          <AppIcon name={icon} luminous={isActive(href)} /><span>{label}</span>
        </Link>
      ))}
      <span ref={glide} className="nav-glide" aria-hidden="true" />
    </nav>
  );
}
