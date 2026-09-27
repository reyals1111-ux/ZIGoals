'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { AppIcon } from "./app-icon";
import { entranceAllowed } from "./use-entrance";

/** The single source of navigation order, for the desktop sidebar and the mobile header alike. */
export const NAV_ITEMS = [
  ["/app", "Today", "today"],
  ["/app/goals", "Goals", "goals"],
  ["/app/habits", "Habits", "habits"],
  ["/app/health", "Health", "health"],
  ["/app/wealth", "Wealth", "wallet"],
  ["/app/markets", "Markets", "activity"],
  ["/app/goals/positions", "Stake / Positions", "future"],
  ["/app/ecosystem", "Ecosystem", "ecosystem"],
  ["/app/activity", "Activity", "activity"],
  ["/app/settings", "Settings", "settings"],
] as const;
/** The active item's own box styles, copied onto the glide so it looks identical at every breakpoint. */
const GLIDE_STYLES = ["backgroundImage", "backgroundColor", "backgroundOrigin", "backgroundClip", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle", "borderColor", "borderRadius", "boxShadow"] as const;
type Box = { x: number; y: number; w: number; h: number };

function boxOf(link: Element, nav: Element): Box {
  const a = link.getBoundingClientRect(), n = nav.getBoundingClientRect();
  return { x: a.left - n.left + nav.scrollLeft, y: a.top - n.top + nav.scrollTop, w: a.width, h: a.height };
}

export function AppNav() {
  const path = usePathname();
  const isActive = (href: string) => href === "/app" ? path === href : href === "/app/goals" ? (path === href || path.startsWith(`${href}/`)) && path !== "/app/goals/positions" : path === href || path.startsWith(`${href}/`);
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
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const measure = () => { const active = el.querySelector('a[aria-current="page"]'); previous.current = active ? boxOf(active, el) : null; };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <nav ref={nav} className="app-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(([href, label, icon]) => (
        <Link key={href} href={href}
          className={icon === "ecosystem" ? "nav-divider" : undefined}
          aria-current={isActive(href) ? "page" : undefined}>
          <AppIcon name={icon} luminous={isActive(href)} /><span>{label}</span>
        </Link>
      ))}
      <span ref={glide} className="nav-glide" aria-hidden="true" />
    </nav>
  );
}
