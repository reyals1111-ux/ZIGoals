'use client';
/**
 * Liquid glass (UI design pass): hovering an interactive or data element lifts it a little, as if picked up.
 * One delegated handler for the whole app and one shared overlay element: the element itself only moves
 * (the individual translate/scale properties, which compose with any transform it already has); the overlay
 * draws the nebula-tinted shadow, a brighter rim and a specular highlight that follows the pointer.
 * Fine pointers with hover only. Touch gets a brief press settle. Keyboard focus gets the same lift with its
 * focus ring. Under reduced motion or Motion Off nothing moves or tracks: a static highlight only.
 */
import {useEffect} from 'react';
import {entranceAllowed} from './use-entrance';
import './liquid-glass.css';

type Kind = 'card' | 'tile' | 'row' | 'control';
/** The one registry of what lifts, most specific kinds first. */
const REGISTRY: [Kind, string][] = [
  ['tile', ['.habit-month-grid>span', '.habit-week-bars>*', '.habit-calendar-day', '.nutrition-month-bars>div', '.nutrition-gauge', '.goal-mix-legend>span', '.composition-legend>*', '.evidence-chart-legend>*', '.habit-map-legend>*', '.habit-calendar-legend>*', '.health-macro', '.hero-pillars>div', '.progress-stats>div', '.destination-steps>div', '.attention-count', '.class-summary', '.goal-choice-tiles>*', '.widget-library-tile', '.exercise-counter'].join(',')],
  ['row', ['.activity-row', '.health-library-row', '.platform-position-row', '.archived-row', '.asset-goal-row', '.financial-event-list>li', '.habit-today-list>li', '.dashboard-summary-item', '.dashboard-goal-links>li', '.health-simple-list>li', '.pace-track', '.today-pace-track', '.habit-overview-track', '.holding-allocation-track', '.nutrition-distribution-track', '.health-gauge-track', '.progress', '.agenda-row', '.activity-context>div', '.metrics>div', '.position-metrics>div', '.dashboard-metric-facts>div', '.card-bottom>div'].join(',')],
  ['control', ['.primary', '.secondary', '.text-link', '.quiet', '.badge[href]', '.picker-tabs button', '.view-tabs button', '.health-views button', '.habit-filter-bar button', '.market-favourite', '.card-options-trigger', '.layout-lock'].join(',')],
  ['card', ['.panel', '.goal-card', '.dashboard-widget', '.habit-card', '.market-product-card', '.watch-card', '.owned-asset-card', '.position-card', '.health-roadmap-grid>article', '.ecosystem-projects>article', '.new-destination-card', '.account-panel', '.recent-panel', '.destination-panel', '.staking-card', '.markets-intro-card', '.habit-overview', '.habit-consistency>article', '.nutrition-dashboard>*', '.activity-favourites', '.intro-video-card'].join(',')],
];
const ALL = REGISTRY.map(([, selector]) => selector).join(',');
// Headers, the sidebar, dialogs, layout editing and anything carried are never lifted.
const EXCLUDED = '.app-sidebar,dialog,.layout-controls,.layout-ghost,.layout-bar,.today-hero,.wealth-hero,.habit-hero,.markets-hero,.page-header,.page-heading,[data-glass-off]';
const kindOf = (el: Element): Kind => REGISTRY.find(([, selector]) => el.matches(selector))![0];

/** The innermost target under an element, plus its nearest card ancestor (so a card stays lifted while a control inside it lifts). */
function targetsFor(start: Element | null): {inner: HTMLElement; card?: HTMLElement} | null {
  const inner = start?.closest<HTMLElement>(ALL);
  if (!inner || inner.closest(EXCLUDED) || inner.matches(':disabled') || inner.closest('[data-layout-placeholder]')) return null;
  let card: HTMLElement | undefined;
  for (let n = inner.parentElement?.closest<HTMLElement>(ALL); n; n = n.parentElement?.closest<HTMLElement>(ALL)) {
    if (n.closest(EXCLUDED)) break;
    if (kindOf(n) === 'card') { card = n; break; }
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
    overlay.append(document.createElement('i'));
    document.body.append(overlay);
    let lifted: HTMLElement[] = [], lit: HTMLElement | null = null, frame = 0, px = 0, py = 0, focusSource = false;
    const leaveTimers = new WeakMap<HTMLElement, number>();

    function place() {
      frame = 0;
      if (!lit || !lit.isConnected) { clear(); return; }
      // The resting box: remove the element's own lift (the overlay applies the same lift itself); ancestors' current lift stays included.
      const r = lit.getBoundingClientRect(), s = overlay.style, cs = getComputedStyle(lit);
      const [tx = 0, ty = 0] = cs.translate === 'none' ? [] : cs.translate.split(' ').map(parseFloat), scale = cs.scale === 'none' ? 1 : parseFloat(cs.scale) || 1;
      const width = r.width / scale, height = r.height / scale, left = r.left + r.width / 2 - tx - width / 2, top = r.top + r.height / 2 - ty - height / 2;
      s.width = `${width}px`; s.height = `${height}px`; s.transform = `translate(${left}px, ${top}px)`;
      const x = still || focusSource ? width / 2 : px - left, y = still || focusSource ? height * .3 : py - top;
      s.setProperty('--gx', `${Math.round(x)}px`); s.setProperty('--gy', `${Math.round(y)}px`);
    }
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
        lit = light;
        if (lit) {
          const kind = kindOf(lit);
          overlay.dataset.kind = kind; overlay.style.borderRadius = getComputedStyle(lit).borderRadius;
          overlay.toggleAttribute('data-still', still);
          place(); overlay.dataset.on = '';
        } else delete overlay.dataset.on;
      }
    }
    function clear() { set(null); }
    const dragging = () => document.documentElement.dataset.layoutDragging !== undefined;

    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !hover.matches || dragging()) return;
      px = event.clientX; py = event.clientY;
      const next = targetsFor(event.target as Element);
      // A still pointer re-targeted by layout changes must not drop a keyboard focus lift.
      if (!next && focusSource) return;
      set(next);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !lit) return;
      px = event.clientX; py = event.clientY;
      if (!still) schedule();
    };
    const onLeaveWindow = (event: PointerEvent) => { if (!event.relatedTarget && !focusSource) clear(); };
    const onDown = (event: PointerEvent) => {
      const found = targetsFor(event.target as Element), el = found ? (kindOf(found.inner) === 'control' ? found.card : found.inner) : undefined;
      if (!el || still) return;
      el.dataset.glass ??= kindOf(el); el.dataset.glassPress = '';
      const release = () => { delete el.dataset.glassPress; if (el.dataset.glassHover === undefined) disarm(el); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); };
      window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    };
    const onFocusIn = (event: FocusEvent) => {
      const el = event.target as HTMLElement;
      if (dragging() || !el.matches?.(':focus-visible')) return;
      set(targetsFor(el), true);
    };
    const onFocusOut = () => { if (focusSource) clear(); };
    const onScroll = () => { if (lit) schedule(); };
    const onMotion = () => { still = !entranceAllowed(); overlay.toggleAttribute('data-still', still); };
    document.addEventListener('pointerover', onOver, {passive: true});
    document.addEventListener('pointermove', onMove, {passive: true});
    document.addEventListener('pointerout', onLeaveWindow, {passive: true});
    document.addEventListener('pointerdown', onDown, {passive: true});
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('scroll', onScroll, {passive: true, capture: true});
    window.addEventListener('resize', onScroll, {passive: true});
    window.addEventListener('zigoals-motion', onMotion); window.addEventListener('storage', onMotion);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); reduced.addEventListener?.('change', onMotion);
    return () => {
      clear(); cancelAnimationFrame(frame); overlay.remove();
      document.removeEventListener('pointerover', onOver); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerout', onLeaveWindow);
      document.removeEventListener('pointerdown', onDown); document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('resize', onScroll);
      window.removeEventListener('zigoals-motion', onMotion); window.removeEventListener('storage', onMotion); reduced.removeEventListener?.('change', onMotion);
    };
  }, []);
  return null;
}
