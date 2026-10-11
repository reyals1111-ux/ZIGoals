'use client';
/**
 * Liquid glass (UI design pass): hovering an interactive or data element lifts it a little, as if picked up.
 * One delegated handler for the whole app and one shared overlay element: the element itself only moves
 * (the individual translate/scale properties, which compose with any transform it already has); the overlay
 * draws the nebula-tinted shadow and a brighter rim. Nothing follows the pointer: the overlay only tracks its element.
 * Fine pointers with hover only. Touch gets a brief press settle. Keyboard focus gets the same lift with its
 * focus ring. Under reduced motion or Motion Off nothing moves: a static rim and shadow only.
 */
import {useEffect} from 'react';
import {entranceAllowed} from './use-entrance';
import './liquid-glass.css';

type Kind = 'card' | 'tile' | 'row' | 'control';
/** The one registry of what lifts, most specific kinds first. */
const REGISTRY: [Kind, string][] = [
  ['tile', ['.habit-month-grid>span', '.habit-week-bars>*', '.habit-calendar-day', '.nutrition-month-bars>div', '.nutrition-gauge', '.goal-mix-legend>span', '.evidence-chart-legend>*', '.habit-map-legend>*', '.habit-calendar-legend>*', '.health-macro', '.hero-pillars>div', '.progress-stats>div', '.destination-steps>div', '.attention-count', '.class-summary', '.goal-choice-tiles>*', '.widget-library-tile', '.exercise-counter'].join(',')],
  ['row', ['.composition-legend>*', '.activity-row', '.health-library-row', '.platform-position-row', '.archived-row', '.asset-goal-row', '.financial-event-list>li', '.habit-today-list>li', '.dashboard-summary-item', '.dashboard-goal-links>li', '.health-simple-list>li', '.pace-track', '.today-pace-track', '.habit-overview-track', '.holding-allocation-track', '.nutrition-distribution-track', '.progress', '.agenda-row', '.activity-context>div', '.metrics>div', '.position-metrics>div', '.dashboard-metric-facts>div', '.card-bottom>div'].join(',')],
  ['control', ['.primary', '.secondary', '.text-link', '.quiet', '.badge[href]', '.picker-tabs button', '.view-tabs button', '.health-views button', '.habit-filter-bar button', '.market-favourite', '.card-options-trigger', '.layout-lock', '.meditation-chip', '.ambient-chip', '.exercise-step', '.portfolio-ranges>button', '.watch-empty', '.settings-sections>a', '.help-topics>a', '.ecosystem-project-actions>a'].join(',')],
  ['card', ['.panel', '.goal-card', '.dashboard-widget', '.habit-card', '.market-product-card', '.watch-card', '.owned-asset-card', '.position-card', '.health-roadmap-grid>article', '.ecosystem-projects>article', '.new-destination-card', '.account-panel', '.recent-panel', '.destination-panel', '.staking-card', '.markets-intro-card', '.habit-overview', '.habit-consistency>article', '.nutrition-dashboard>*', '.activity-favourites', '.intro-video-card'].join(',')],
];
const ALL = REGISTRY.map(([, selector]) => selector).join(',');
// Headers, the sidebar, dialogs, layout editing and anything carried are never lifted.
const EXCLUDED = '.app-sidebar,dialog,.layout-controls,.layout-ghost,.layout-bar,.today-hero,.wealth-hero,.habit-hero,.markets-hero,.page-header,.page-heading,[data-glass-off]';
/** How long the pointer rests on an element before it lifts. */
const INTENT_MS = 70;
const kindOf = (el: Element): Kind => REGISTRY.find(([, selector]) => el.matches(selector))![0];

/**
 * Long sections (a whole list, the signed-in account panel) are page structure, not something to pick up: lifting
 * one would turn several screens of content into its own layer, redrawn on every frame. Cards up to a little over
 * a screen tall lift.
 */
const liftable = (el: Element) => !(el instanceof SVGElement) && (kindOf(el) !== 'card' || el.getBoundingClientRect().height <= Math.max(900, innerHeight * 1.25));
/**
 * Rows (list entries, table-like lines, tracks) never move: they get a rounded glass pill instead. A row whose content
 * runs to its own edges gets a pill a little larger than itself, so no dot, label or figure ever touches the rim.
 */
function rowPill(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return {x: parseFloat(cs.paddingLeft) < 10 ? 12 : 0, y: parseFloat(cs.paddingTop) < 6 ? 6 : 0, radius: parseFloat(cs.borderTopLeftRadius) >= 12 ? cs.borderRadius : '14px'};
}
/** The innermost target under an element, plus its nearest card ancestor (so a card stays lifted while a control inside it lifts). */
function targetsFor(start: Element | null): {inner: HTMLElement; card?: HTMLElement} | null {
  let inner = start?.closest<HTMLElement>(ALL);
  if (!inner || inner.closest(EXCLUDED) || inner.matches(':disabled') || inner.closest('[data-layout-placeholder]')) return null;
  // A section too large to lift passes the pointer on to the next target around it, if any.
  while (inner && !liftable(inner)) inner = inner.parentElement?.closest<HTMLElement>(ALL);
  if (!inner || inner.closest(EXCLUDED)) return null;
  let card: HTMLElement | undefined;
  for (let n = inner.parentElement?.closest<HTMLElement>(ALL); n; n = n.parentElement?.closest<HTMLElement>(ALL)) {
    if (n.closest(EXCLUDED)) break;
    if (kindOf(n) === 'card') { if (liftable(n)) card = n; break; }
  }
  return {inner, card};
}

export function LiquidGlass() {
  useEffect(() => {
    // Environments without matchMedia (tests, very old browsers) get no hover glass at all.
    if (typeof window.matchMedia !== 'function') return;
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let still = !entranceAllowed();
    const overlay = document.createElement('div');
    overlay.className = 'glass-light'; overlay.setAttribute('aria-hidden', 'true');
    // The rim and shadow (i).
    overlay.append(document.createElement('i'));
    document.body.append(overlay);
    let lifted: HTMLElement[] = [], lit: HTMLElement | null = null, pill: {x: number; y: number} | null = null, frame = 0, focusSource = false;
    // The lit element can grow under the pointer (a form that opens, a section that loads): its light follows its size.
    let sizeWatch: ResizeObserver | null = null;
    const leaveTimers = new WeakMap<HTMLElement, number>();

    function place() {
      frame = 0;
      if (!lit || !lit.isConnected) { clear(); return; }
      // The resting box: remove the element's own lift (the overlay applies the same lift itself); ancestors' current lift stays included.
      const r = lit.getBoundingClientRect(), s = overlay.style, cs = getComputedStyle(lit);
      const [tx = 0, ty = 0] = cs.translate === 'none' ? [] : cs.translate.split(' ').map(parseFloat), scale = cs.scale === 'none' ? 1 : parseFloat(cs.scale) || 1;
      const pad = pill ?? {x: 0, y: 0};
      const width = r.width / scale + pad.x * 2, height = r.height / scale + pad.y * 2, left = r.left + r.width / 2 - tx - width / 2, top = r.top + r.height / 2 - ty - height / 2;
      // Only a changed box is written.
      const box = `${width}|${height}|${left}|${top}`;
      if (box !== written.box) { s.width = `${width}px`; s.height = `${height}px`; s.transform = `translate(${left}px, ${top}px)`; written.box = box; }
    }
    const written = {box: ''};
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
    function arm(el: HTMLElement) {
      window.clearTimeout(leaveTimers.get(el));
      el.dataset.glass = kindOf(el); el.dataset.glassHover = '';
    }
    function disarm(el: HTMLElement) {
      delete el.dataset.glassHover; delete el.dataset.glassPress;
      // The kind (and its transition) stays until the element has settled.
      leaveTimers.set(el, window.setTimeout(() => { if (el.dataset.glassHover === undefined) delete el.dataset.glass; }, 320));
    }
    function set(next: {inner: HTMLElement; card?: HTMLElement} | null, fromFocus = false) {
      const wanted = next ? [next.inner, ...(next.card ? [next.card] : [])] : [];
      for (const el of lifted) if (!wanted.includes(el)) disarm(el);
      for (const el of wanted) if (!lifted.includes(el)) arm(el);
      lifted = wanted; focusSource = fromFocus;
      const light = next ? (kindOf(next.inner) === 'control' ? next.card ?? null : next.inner) : null;
      if (light !== lit) {
        sizeWatch?.disconnect(); sizeWatch = null;
        lit = light;
        if (lit && typeof ResizeObserver === 'function') { sizeWatch = new ResizeObserver(schedule); sizeWatch.observe(lit); }
        if (lit) {
          const kind = kindOf(lit);
          const row = kind === 'row' ? rowPill(lit) : null;
          pill = row; overlay.dataset.kind = kind; overlay.style.borderRadius = row ? row.radius : getComputedStyle(lit).borderRadius;
          overlay.toggleAttribute('data-still', still);
          place(); overlay.dataset.on = '';
        } else delete overlay.dataset.on;
      }
    }
    function clear() { set(null); }
    const dragging = () => document.documentElement.dataset.layoutDragging !== undefined;

    // Hover intent: an element lifts once the pointer rests on it for a moment, so a pointer sweeping across a
    // page (or heading straight for a click) does not set every card it crosses in motion. Leaving is immediate.
    // A press cancels a pending lift; the next lift waits until the pointer moves again (the only time pointer
    // movement is watched, and only until it has moved a few pixels).
    let intent = 0, pressed: {x: number; y: number} | null = null;
    const hoverAt = (target: Element | null) => {
      window.clearTimeout(intent);
      const next = targetsFor(target);
      // A still pointer re-targeted by layout changes must not drop a keyboard focus lift.
      if (!next && focusSource) return;
      if (!next) { set(null); return; }
      if (next.inner === lifted[0]) return;
      // Moving between controls of the same card keeps the card up; anything else settles first.
      if (lifted.length && !focusSource && !lifted.some(el => el === next.inner || el === next.card)) set(null);
      intent = window.setTimeout(() => { if (!pressed && !dragging()) set(next); }, INTENT_MS);
    };
    // Where the pointer last was: content moving under a still pointer (focus scrolled the page, a section loaded) fires
    // pointerover at the same spot, and must not take a keyboard focus lift away from the focused element.
    let rest: {x: number; y: number} | null = null;
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !hover.matches || dragging()) return;
      const resting = !!rest && Math.abs(event.clientX - rest.x) < 1 && Math.abs(event.clientY - rest.y) < 1;
      rest = {x: event.clientX, y: event.clientY};
      if (resting && focusSource) return;
      if (!pressed) hoverAt(event.target as Element);
    };
    const onMoveAfterPress = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !pressed || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) <= 3) return;
      pressed = null; document.removeEventListener('pointermove', onMoveAfterPress);
      if (hover.matches && !dragging()) hoverAt(event.target as Element);
    };
    const onLeaveWindow = (event: PointerEvent) => { if (!event.relatedTarget) { window.clearTimeout(intent); if (!focusSource) clear(); } };
    const onDown = (event: PointerEvent) => {
      window.clearTimeout(intent);
      if (event.pointerType !== 'touch') { pressed = {x: event.clientX, y: event.clientY}; document.addEventListener('pointermove', onMoveAfterPress, {passive: true}); }
      const found = targetsFor(event.target as Element), el = found ? (kindOf(found.inner) === 'control' ? found.card : found.inner) : undefined;
      if (!el || still) return;
      el.dataset.glass ??= kindOf(el); el.dataset.glassPress = '';
      const release = () => { delete el.dataset.glassPress; if (el.dataset.glassHover === undefined) disarm(el); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); };
      window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    };
    const onFocusIn = (event: FocusEvent) => {
      const el = event.target as HTMLElement;
      // Typing keeps its own focus ring; the card around a text field stays still.
      if (dragging() || !el.matches?.(':focus-visible') || el.matches('input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=range]),textarea,select,[contenteditable]')) return;
      set(targetsFor(el), true);
    };
    const onFocusOut = () => { if (focusSource) clear(); };
    const onScroll = () => { if (lit) schedule(); };
    const onMotion = () => { still = !entranceAllowed(); overlay.toggleAttribute('data-still', still); };
    document.addEventListener('pointerover', onOver, {passive: true});
    document.addEventListener('pointerout', onLeaveWindow, {passive: true});
    document.addEventListener('pointerdown', onDown, {passive: true});
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('scroll', onScroll, {passive: true, capture: true});
    window.addEventListener('resize', onScroll, {passive: true});
    window.addEventListener('zigoals-motion', onMotion); window.addEventListener('storage', onMotion);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); reduced.addEventListener?.('change', onMotion);
    return () => {
      window.clearTimeout(intent); clear(); cancelAnimationFrame(frame); overlay.remove();
      document.removeEventListener('pointerover', onOver); document.removeEventListener('pointermove', onMoveAfterPress); document.removeEventListener('pointerout', onLeaveWindow);
      document.removeEventListener('pointerdown', onDown); document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('resize', onScroll);
      window.removeEventListener('zigoals-motion', onMotion); window.removeEventListener('storage', onMotion); reduced.removeEventListener?.('change', onMotion);
    };
  }, []);
  return null;
}
