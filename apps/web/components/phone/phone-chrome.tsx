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
import "./phone-targets.css";
import Link from "next/link";
import { navPrefetch } from "../nav-prefetch";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { AppIcon } from "../app-icon";
import { LEGACY_STAKING_PATH, NAV_ITEMS, isNavActive, navGroupOf, useFocusRescue, useVisibleNav } from "../app-nav";
import { groupStarts, homeHref, isShown, phoneTabs } from "../../lib/pages/visibility";
import { AiMoreRow } from "../ai/ai-more-row";
import { MusicMoreRow } from "../music/music-more-row";
import { LazyThemeSwitch as ThemeSwitch } from "../shell/theme-switch-lazy";
import { useGameEnabled } from "../game/use-game-enabled";
import { setMoreOpen, useMoreOpen } from "./phone-more-event";
import { PHONE_STATUS_EVENT } from "./phone-status-event";
import { LogoMark, Wordmark } from "../brand-mark";
import { LogoIntro } from "../logo-intro";
import { QuickAdd } from "../quick-add";
import { SearchButton } from "../search/search-trigger";
import { OfflinePill } from "../offline-notice";
import { entranceAllowed } from "../use-entrance";
import { usePhoneActive, usePhoneChrome } from "./use-phone-layout";
import { useVisualViewportInsets } from "./use-visual-viewport";
import { useSheetDrag } from "./use-sheet-drag";

/**
 * The phone shell (Session E): a top bar with the page's identity, Quick add and Settings, and a glass tab bar whose More
 * sheet holds the other destinations. The desktop sidebar and the honesty banners stay the same elements (restyled in
 * phone-shell.css). Server-rendered for phones; removed after hydration everywhere else.
 */
// The tabs are the first four visible pages and More holds the rest (Session W Part 2); with nothing hidden, the first
// four destinations and the other seven, as before (eight with Chess, Session W Part 14, once it is shown).
const MORE_NOTES: Record<string, string> = {
  "/app/wealth": "Every asset, with its source",
  "/app/earn": "Every way to earn, with live numbers and risks",
  "/app/markets": "Prices you follow · watch-only",
  "/app/staking": "Public ZIG staking and positions · read-only",
  "/app/portfolio": "Coins you hold or plan · on this device",
  "/app/ecosystem": "ZIGChain projects · research only",
  "/app/chess": "Your chess ratings and games · public data",
  "/app/activity": "Your recent steps, in order",
  "/app/settings": "Backups, privacy, motion and Showcase",
  "/app/help": "Answers, feedback and the Alpha's facts",
  "/app/journey": "Your XP, quests and badges",
  "/app/checklist": "Today's path of starred dots",
};

export type PhoneRoute = { title: string; back?: { href: string; label: string } };
/** The top bar's title and back link for a path. Detail and creation pages step back to their list. */
export function phoneRoute(path: string): PhoneRoute {
  if (path === "/app/goals/new") return { title: "New Goal", back: { href: "/app/goals", label: "Goals" } };
  if (/^\/app\/goals\/(tracked\/)?[^/]+$/.test(path) && ![LEGACY_STAKING_PATH, "/app/goals/tracked"].includes(path)) return { title: "Goal", back: { href: "/app/goals", label: "Goals" } };
  if (path.startsWith("/app/wealth/asset/")) return { title: "Asset", back: { href: "/app/wealth", label: "Wealth" } };
  if (path === "/app/welcome") return { title: "Welcome" };
  if (path === "/app/help") return { title: "Help", back: { href: "/app/settings", label: "Settings" } };
  if (path === "/app/zigi") return { title: "Meet ZIGi", back: { href: "/app/settings", label: "Settings" } };
  // Session W Part 20: where Spotify sends the person back after connecting.
  if (path === "/app/music/spotify") return { title: "Spotify", back: { href: "/app/settings", label: "Settings" } };
  // Session AF (L3): the Checklist is a nav extra, not a NAV_ITEMS page; on a phone it is reached from Today and More.
  if (path === "/app/checklist") return { title: "Checklist", back: { href: "/app", label: "Today" } };
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

export function PhoneTopBar() {
  const show = usePhoneChrome(), active = usePhoneActive(), path = usePathname(), bar = useRef<HTMLDivElement>(null);
  useVisualViewportInsets(active);
  usePressFeedback(active);
  useTitleOnScroll(active, bar, path);
  const { view, items } = useVisibleNav(), moreOpen = useMoreOpen(); // every hook before the early return
  if (!show) return null;
  const route = phoneRoute(path), onWealth = isNavActive(path, "/app/wealth");
  const wealthShortcut = isShown(view, "wealth") && isShown(view, "wealth-shortcut");
  // Session AB-Design (owner request 10, ADR-024 D2): More opens from the top bar; Settings and Help are its last rows.
  const moreCurrent = phoneTabs(items).more.some(([href]) => isNavActive(path, href));
  return <div ref={bar} className="phone-topbar">
    <div className="phone-topbar-row">
      {route.back
        ? <Link className="phone-back" href={route.back.href} aria-label={`Back to ${route.back.label}`}><AppIcon name="back" size={22} /><span aria-hidden="true">{route.back.label}</span></Link>
        : <Link className="phone-home" href={homeHref(view)} aria-label="ZIGoals home"><LogoMark /><LogoIntro host="phone" /></Link>}
      <p className="phone-title" aria-hidden="true">{route.title}</p>
      <div className="phone-actions">
        {isShown(view, "quick-add") && <QuickAdd triggerClassName="phone-quick-add" />}
        <SearchButton className="phone-search" />
        <OfflinePill />
        {/* The wallet shortcut keeps its icon while that button is shown; Settings moved into More (Session AB-Design). */}
        {wealthShortcut && <Link className="phone-wealth" href="/app/wealth" prefetch={navPrefetch("/app/wealth")} aria-label="Wealth" aria-current={onWealth ? "page" : undefined}><AppIcon name="wallet" size={22} luminous={onWealth} /></Link>}
        {/* Owner decision D2 (kept, owner follow-up): + / Search / More; Settings and Help are More's last rows. */}
        <button type="button" className="phone-more-top" aria-haspopup="dialog" aria-expanded={moreOpen} aria-label="More" data-current={moreCurrent || undefined} onClick={() => setMoreOpen(true)}><AppIcon name="more" size={22} luminous={moreCurrent} /></button>
      </div>
    </div>
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
  const show = usePhoneChrome(), path = usePathname(), sheet = useRef<HTMLDialogElement>(null), tabs = useRef<HTMLDivElement>(null), titleId = useId(), open = useMoreOpen(), setOpen = setMoreOpen;
  const { items } = useVisibleNav(), { tabs: TABS, more: MORE } = phoneTabs(items), moreStarts = groupStarts(MORE, navGroupOf), gameOn = useGameEnabled();
  // Phase 2, Part 10 (owner request 10): the pages first, then the Journey (while Gamify is on), ZIGi and the soundtrack
  // when they are tucked away, Status & wallet — and Settings and Help always last.
  const LAST = ["/app/settings", "/app/help"], morePages = MORE.filter(([href]) => !LAST.includes(href)), moreLast = MORE.filter(([href]) => LAST.includes(href));
  useTabArrival(tabs, path);
  useFocusRescue(tabs, TABS.map(([href]) => href).join(" "));
  useSheetDrag(show);
  // Arriving on a page closes More, whatever started the navigation; the top bar's More button opens it (the shared store).
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (!show) return null;
  const tab = TABS.findIndex(([href]) => isNavActive(path, href)), moreCurrent = MORE.some(([href]) => isNavActive(path, href));
  const index = tab >= 0 ? tab : -1;
  return <nav className="phone-tabbar" aria-label="Main navigation" data-more-current={moreCurrent || undefined}>
    <div ref={tabs} className="phone-tabs" data-active={index >= 0 || undefined} style={{ ...(index >= 0 ? { "--tab-index": index } : {}), "--tab-count": TABS.length } as CSSProperties}>
      <span className="phone-tab-pill" aria-hidden="true" />
      {TABS.map(([href, label, icon]) => {
        const current = isNavActive(path, href);
        return <Link key={href} href={href} prefetch={navPrefetch(href)} className="phone-tab" aria-current={current ? "page" : undefined}><AppIcon name={icon} size={24} luminous={current} /><span>{label}</span></Link>;
      })}
    </div>
    <dialog ref={sheet} className="phone-sheet phone-more" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="phone-sheet-panel">
        <div className="phone-grabber" aria-hidden="true" />
        <div className="phone-sheet-head"><h2 id={titleId}>More</h2><button type="button" className="phone-sheet-close" aria-label="Close More" onClick={() => setOpen(false)}>×</button></div>
        <ul className="phone-more-list">
          {morePages.map(([href, label, icon]) => {
            const current = isNavActive(path, href);
            // The one-line note is drawn by CSS, so the link's text and name stay exactly the destination's label.
            // The same groups as the sidebar (Session I): Wealth, then the money tools, then the rest, separated by space.
            return <li key={href} data-group-start={moreStarts.get(href)}><Link href={href} prefetch={navPrefetch(href)} className="phone-more-row" aria-label={label} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
              <span className="icon-medallion"><AppIcon name={icon} size={22} luminous /></span>
              <span className="phone-more-copy" data-note={MORE_NOTES[href]}><strong>{label}</strong></span>
              <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
            </Link></li>;
          })}
          {gameOn && <li data-group-start="journey"><Link href="/app/journey" prefetch={false} className="phone-more-row" aria-label="Journey" aria-current={isNavActive(path, "/app/journey") ? "page" : undefined} onClick={() => setOpen(false)}>
            <span className="icon-medallion"><AppIcon name="star" size={22} luminous /></span>
            <span className="phone-more-copy" data-note="Your level, quests and badges"><strong>Journey</strong></span>
            <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
          </Link></li>}
          <AiMoreRow onNavigate={() => setOpen(false)} />
          <MusicMoreRow onNavigate={() => setOpen(false)} />
          {/* Session AB-Design: the notices in full and the wallet buttons (the Status & wallet sheet), then the theme switch. */}
          <li><button type="button" className="phone-more-row phone-more-status" aria-label="Status & wallet" onClick={() => { setOpen(false); window.dispatchEvent(new Event(PHONE_STATUS_EVENT)); }}>
            <span className="icon-medallion"><AppIcon name="wallet" size={22} luminous /></span>
            <span className="phone-more-copy" data-note="The Alpha's facts, the mode and your wallet"><strong>Status &amp; wallet</strong></span>
            <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
          </button></li>
          {moreLast.map(([href, label, icon]) => {
            const current = isNavActive(path, href);
            // The one-line note is drawn by CSS, so the link's text and name stay exactly the destination's label.
            // The same groups as the sidebar (Session I): Wealth, then the money tools, then the rest, separated by space.
            return <li key={href} data-group-start={href === moreLast[0]?.[0] ? "last" : undefined}><Link href={href} prefetch={navPrefetch(href)} className="phone-more-row" aria-label={label} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
              <span className="icon-medallion"><AppIcon name={icon} size={22} luminous /></span>
              <span className="phone-more-copy" data-note={MORE_NOTES[href]}><strong>{label}</strong></span>
              <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
            </Link></li>;
          })}
        </ul>
        <ThemeSwitch compact />
        <div className="phone-more-signature">
          <p className="phone-more-descriptor">Your Financial Orbit</p>
          <Wordmark />
        </div>
      </div>
    </dialog>
  </nav>;
}
