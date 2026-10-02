"use client";
import "./phone-shell.css";
import "./phone-base.css";
import "./phone-today.css";
import "./phone-goals.css";
import "./phone-habits.css";
import "./phone-health.css";
import "./phone-wealth.css";
import "./phone-positions.css";
import "./phone-markets.css";
import "./phone-lists.css";
import "./phone-sheets.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "../app-icon";
import { LEGACY_STAKING_PATH, NAV_GROUP_START, NAV_ITEMS, isNavActive } from "../app-nav";
import { LogoMark, Wordmark } from "../brand-mark";
import { LogoIntro } from "../logo-intro";
import { QuickAdd } from "../quick-add";
import { entranceAllowed } from "../use-entrance";
import { usePhoneActive, usePhoneChrome } from "./use-phone-layout";
import { useVisualViewportInsets } from "./use-visual-viewport";
import { useSheetDrag } from "./use-sheet-drag";

/**
 * The phone shell (Session E): a top bar with the page's identity, Quick add and Settings, and a glass tab bar whose More
 * sheet holds the other destinations. The desktop sidebar and the honesty banners stay the same elements (restyled in
 * phone-shell.css). Server-rendered for phones; removed after hydration everywhere else.
 */
const TABS = NAV_ITEMS.slice(0, 4), MORE = NAV_ITEMS.slice(4);
const MORE_NOTES: Record<string, string> = {
  "/app/wealth": "Every asset, with its source",
  "/app/markets": "Prices you follow · watch-only",
  "/app/staking": "Public ZIG staking and positions · read-only",
  "/app/portfolio": "Coins you hold or plan · this device only",
  "/app/ecosystem": "ZIGChain projects · research only",
  "/app/activity": "Your recent steps, in order",
  "/app/settings": "Backups, privacy, motion and Showcase",
};

export type PhoneRoute = { title: string; back?: { href: string; label: string } };
/** The top bar's title and back link for a path. Detail and creation pages step back to their list. */
export function phoneRoute(path: string): PhoneRoute {
  if (path === "/app/goals/new") return { title: "New Goal", back: { href: "/app/goals", label: "Goals" } };
  if (/^\/app\/goals\/(tracked\/)?[^/]+$/.test(path) && ![LEGACY_STAKING_PATH, "/app/goals/tracked"].includes(path)) return { title: "Goal", back: { href: "/app/goals", label: "Goals" } };
  if (path.startsWith("/app/wealth/asset/")) return { title: "Asset", back: { href: "/app/wealth", label: "Wealth" } };
  if (path === "/app/welcome") return { title: "Welcome" };
  const item = NAV_ITEMS.find(([href]) => isNavActive(path, href));
  return { title: item ? item[1] : "ZIGoals" };
}

/**
 * iOS applies :active press styles on touch only when a touchstart listener exists. A long press on a control never
 * starts a text selection (content still selects); done here because CSS user-select alters desktop rendering.
 */
const CONTROLS = 'button, .primary, .secondary, .quiet, [role="tab"], summary, .phone-tab, .phone-more-row';
function usePressFeedback(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const noop = () => {};
    const noSelect = (event: Event) => {
      const node = event.target as Node | null, element = node instanceof Element ? node : node?.parentElement;
      if (element?.closest(CONTROLS)) event.preventDefault();
    };
    document.addEventListener("touchstart", noop, { passive: true });
    document.addEventListener("selectstart", noSelect);
    return () => { document.removeEventListener("touchstart", noop); document.removeEventListener("selectstart", noSelect); };
  }, [active]);
}

/** The compact title appears once the page's own large title has scrolled under the bar; the bar frosts once content is beneath it. */
function useTitleOnScroll(active: boolean, bar: RefObject<HTMLDivElement | null>, path: string) {
  useEffect(() => {
    const el = bar.current;
    if (!active || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const heading = document.querySelector("main h1"), edge = el.getBoundingClientRect().bottom;
      el.toggleAttribute("data-title-shown", heading ? heading.getBoundingClientRect().bottom < edge + 4 : window.scrollY > 48);
      el.toggleAttribute("data-scrolled", window.scrollY > 2);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    // Page content renders once private stores open, after this effect.
    const late = window.setTimeout(update, 700);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(late); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [active, bar, path]);
}

/**
 * "Status details": lives inside the testnet banner, after its label, so reading order matches what is seen. Closed, the
 * long sentences are clamped; the labels themselves (testnet, Local simulation, Showcase) never are. Without it (no JS,
 * or the bars hidden by the user's own Today choice) nothing is clamped.
 */
function PhoneStatusToggle() {
  const [host, setHost] = useState<HTMLElement | null>(null), [open, setOpen] = useState(false);
  useEffect(() => {
    const find = () => setHost(document.querySelector<HTMLElement>(".app-topbar .network-banner"));
    find();
    const content = document.querySelector(".app-content");
    if (!content) return;
    const observer = new MutationObserver(find);
    observer.observe(content, { childList: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (!host) return;
    root.dataset.phoneStatus = open ? "open" : "closed";
    return () => { delete root.dataset.phoneStatus; };
  }, [host, open]);
  if (!host) return null;
  return createPortal(<button type="button" className="phone-status-toggle" aria-expanded={open} aria-label="Status details" onClick={() => setOpen(value => !value)}><AppIcon name="chevron" size={18} /></button>, host);
}

export function PhoneTopBar() {
  const show = usePhoneChrome(), active = usePhoneActive(), path = usePathname(), bar = useRef<HTMLDivElement>(null);
  useVisualViewportInsets(active);
  usePressFeedback(active);
  useTitleOnScroll(active, bar, path);
  if (!show) return null;
  const route = phoneRoute(path), onSettings = path === "/app/settings", onWealth = isNavActive(path, "/app/wealth");
  return <div ref={bar} className="phone-topbar">
    <div className="phone-topbar-row">
      {route.back
        ? <Link className="phone-back" href={route.back.href} aria-label={`Back to ${route.back.label}`}><AppIcon name="back" size={22} /><span aria-hidden="true">{route.back.label}</span></Link>
        : <Link className="phone-home" href="/app" aria-label="ZIGoals home"><LogoMark /><LogoIntro host="phone" /></Link>}
      <p className="phone-title" aria-hidden="true">{route.title}</p>
      <div className="phone-actions">
        <QuickAdd triggerClassName="phone-quick-add" />
        {/* Wealth and Settings are one tap away in the bar as well as in More (CI journeys open them by these names). */}
        <Link className="phone-wealth" href="/app/wealth" aria-label="Wealth" aria-current={onWealth ? "page" : undefined}><AppIcon name="wallet" size={22} luminous={onWealth} /></Link>
        <Link className="phone-settings" href="/app/settings" aria-label="Settings" aria-current={onSettings ? "page" : undefined}><AppIcon name="settings" size={22} luminous={onSettings} /></Link>
      </div>
    </div>
    {active && <PhoneStatusToggle />}
  </div>;
}

/** Like the desktop nav, the newly selected tab arrives once: its icon gives a small pop. Never under reduced motion or Motion Off. */
function useTabArrival(tabs: RefObject<HTMLDivElement | null>, path: string) {
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const active = tabs.current?.querySelector<HTMLElement>('.phone-tab[aria-current="page"], .phone-more-button[data-current]');
    if (!active || !entranceAllowed() || !active.getClientRects().length) return;
    active.dataset.arrive = "";
    const done = (event: AnimationEvent) => { if (event.animationName === "phone-tab-arrive") delete active.dataset.arrive; };
    active.addEventListener("animationend", done);
    active.addEventListener("animationcancel", done);
    return () => { active.removeEventListener("animationend", done); active.removeEventListener("animationcancel", done); delete active.dataset.arrive; };
  }, [tabs, path]);
}

export function PhoneTabBar() {
  const show = usePhoneChrome(), path = usePathname(), sheet = useRef<HTMLDialogElement>(null), tabs = useRef<HTMLDivElement>(null), titleId = useId(), [open, setOpen] = useState(false);
  useTabArrival(tabs, path);
  useSheetDrag(show);
  // Arriving on a page closes More, whatever started the navigation.
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (!show) return null;
  const tab = TABS.findIndex(([href]) => isNavActive(path, href)), moreCurrent = MORE.some(([href]) => isNavActive(path, href));
  const index = tab >= 0 ? tab : moreCurrent ? 4 : -1;
  return <nav className="phone-tabbar" aria-label="Main navigation">
    <div ref={tabs} className="phone-tabs" data-active={index >= 0 || undefined} style={index >= 0 ? { "--tab-index": index } as CSSProperties : undefined}>
      <span className="phone-tab-pill" aria-hidden="true" />
      {TABS.map(([href, label, icon]) => {
        const current = isNavActive(path, href);
        return <Link key={href} href={href} className="phone-tab" aria-current={current ? "page" : undefined}><AppIcon name={icon} size={24} luminous={current} /><span>{label}</span></Link>;
      })}
      <button type="button" className="phone-tab phone-more-button" aria-haspopup="dialog" aria-expanded={open} data-current={moreCurrent || undefined} onClick={() => setOpen(true)}><AppIcon name="more" size={24} luminous={moreCurrent} /><span>More</span></button>
    </div>
    <dialog ref={sheet} className="phone-sheet phone-more" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="phone-sheet-panel">
        <div className="phone-grabber" aria-hidden="true" />
        <div className="phone-sheet-head"><h2 id={titleId}>More</h2><button type="button" className="phone-sheet-close" aria-label="Close More" onClick={() => setOpen(false)}>×</button></div>
        <ul className="phone-more-list">
          {MORE.map(([href, label, icon]) => {
            const current = isNavActive(path, href);
            // The one-line note is drawn by CSS, so the link's text and name stay exactly the destination's label.
            // The same groups as the sidebar (Session I): Wealth, then the money tools, then the rest, separated by space.
            return <li key={href} data-group-start={NAV_GROUP_START.get(href)}><Link href={href} className="phone-more-row" aria-label={label} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
              <span className="icon-medallion"><AppIcon name={icon} size={22} luminous /></span>
              <span className="phone-more-copy" data-note={MORE_NOTES[href]}><strong>{label}</strong></span>
              <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
            </Link></li>;
          })}
        </ul>
        <div className="phone-more-signature">
          <p className="phone-more-descriptor">Your Financial Orbit</p>
          <Wordmark />
        </div>
      </div>
    </dialog>
  </nav>;
}
