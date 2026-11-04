import type {MotionLevel} from './level';

/**
 * Session AK M1 (ADR-036 Q26, reversed by M1): page transitions run through React's <ViewTransition> (app/app/template.tsx).
 * React starts a document view transition for every navigation that places one, whatever its classes say, so "none" in
 * CSS alone would still capture and swap the page. Under Motion Off and reduced motion this gate makes the page behave as
 * in a browser without the API: `document.startViewTransition` is shadowed by `undefined` on the document itself, React
 * then commits directly (its own fallback path), and theme switching applies at once (it already does there). Back in
 * Full or Calm the shadow is removed and the browser's own method shows through again. Nothing is changed when the
 * browser has no view transitions.
 *
 * Session AK CI-W (lead decision, deliberate): a capture budget. A transition snapshots every named element whole, and
 * React names the leaving page itself; WebKit 26 paints that snapshot on the main thread at full device resolution with no
 * viewport clip (Source/WebCore/dom/ViewTransition.cpp), so leaving Settings after a # jump (954 × 21 769 px at 2×, about
 * 83 million pixels) held the navigation for 3–4 s in CI. In Full and Calm the document's method is wrapped: when the
 * elements already named when a transition starts would capture more than `CAPTURE_BUDGET` device pixels, it declines
 * (throws), and React commits at once without a transition, as under Off. Below the budget the browser's own method runs
 * unchanged (looked up on each call, so anything that wraps the prototype still sees it).
 *
 * Session AL (P14-D, ADR-036 "page transitions"): with the budget alone, leaving any page taller than about three screens
 * (Today, Wealth, Earn, Settings, Help with the Showcase) changed at once, so many navigations had no fade. Now, over the
 * budget, the leaving page is not captured whole: its name is released (it is removed by the update anyway), so it falls
 * into the root picture, which every browser captures at the window's size only. The root is kept for this one transition
 * (React would otherwise hide it when nothing outside the page changed) and `<html data-zg-vt-page="root">` lets
 * motion-2026.css fade that picture out while the arriving page fades in as usual: the same crossfade at a window-sized
 * cost. Only a page-sized element is released (its class is React's page exit class, or it is taller than 1.5 windows);
 * if the named elements are still over the budget after that, the transition is declined as before.
 */
const SHADOW = '__zgViewTransitionsOff';
const WRAPPED = '__zgViewTransitionsBudget';
/** Device pixels the named elements may cover when a page transition starts: 32 million (about 128 MB of picture). */
// Session AK (CI 41363200263, WebKit): 32 M still let a 954×6362 px Habits page (24 M at 2×) hold a navigation ~9 s in
// WebKit's software capture; 8 M keeps the fade for pages up to a few screens. Session AL (P14-D): a taller leaving page
// now crossfades through the window-sized root picture instead of changing at once (releaseLeavingPages below).
export const CAPTURE_BUDGET = 8_000_000;
type Doc = Document & {[SHADOW]?: boolean; [WRAPPED]?: boolean};
type Start = (this: Document, ...args: unknown[]) => unknown;

export function viewTransitionsAllowed(level: MotionLevel): boolean { return level !== 'off'; }

/** Device pixels covered by the elements that carry an inline view-transition name (React names them before it starts). */
export function namedCaptureArea(doc: Document): number {
  let area = 0;
  for (const el of doc.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
    const name = el.style.viewTransitionName;
    if (!name || name === 'none') continue;
    const box = el.getBoundingClientRect();
    area += box.width * box.height;
  }
  const dpr = doc.defaultView?.devicePixelRatio || 1;
  return area * dpr * dpr;
}

/** React's exit class for a leaving page (app/app/template.tsx `exit`). */
export const PAGE_OUT_CLASS = 'zg-page-out';
/** A named element taller than this many windows is a whole page, never a morph or a panel. */
const PAGE_TALL = 1.5;
const PAGE_MODE = 'zgVtPage';

type Named = {el: HTMLElement; area: number; page: boolean};
function namedElements(doc: Document): Named[] {
  const view = doc.defaultView, dpr = view?.devicePixelRatio || 1, tall = (view?.innerHeight || 0) * PAGE_TALL;
  const out: Named[] = [];
  for (const el of doc.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
    const name = el.style.viewTransitionName;
    if (!name || name === 'none') continue;
    const box = el.getBoundingClientRect();
    const cls = (el.style as CSSStyleDeclaration & {viewTransitionClass?: string}).viewTransitionClass ?? '';
    out.push({el, area: box.width * box.height * dpr * dpr, page: cls.split(/\s+/).includes(PAGE_OUT_CLASS) || (tall > 0 && box.height > tall)});
  }
  return out;
}

/**
 * Over the budget, releases the names of leaving pages, largest first, until the named elements fit. Returns the released
 * elements, or null when even without them the capture would be over the budget (the transition is then declined).
 */
export function releaseLeavingPages(doc: Document, budget = CAPTURE_BUDGET): HTMLElement[] | null {
  const named = namedElements(doc);
  let area = named.reduce((n, x) => n + x.area, 0);
  if (area <= budget) return [];
  const pages = named.filter(x => x.page).sort((a, b) => b.area - a.area), released: HTMLElement[] = [];
  for (const page of pages) {
    if (area <= budget) break;
    area -= page.area;
    released.push(page.el);
  }
  if (area > budget) return null;
  for (const el of released) el.style.viewTransitionName = 'none';
  return released;
}

/** Keeps the window-sized root picture for one transition and marks it for the page crossfade; returns the cleanup. */
function keepRootPicture(doc: Document): () => void {
  const root = doc.documentElement, named = root.style.viewTransitionName === '';
  if (named) root.style.viewTransitionName = 'root'; // React hides the root picture only when this is empty
  root.dataset[PAGE_MODE] = 'root';
  let done = false;
  return () => {
    if (done) return;
    done = true;
    delete root.dataset[PAGE_MODE];
    if (named && root.style.viewTransitionName === 'root') root.style.viewTransitionName = '';
  };
}

const own = (d: Doc) => Object.prototype.hasOwnProperty.call(d, 'startViewTransition');
const native = (d: Doc): Start | undefined => { const m = (Object.getPrototypeOf(d) as {startViewTransition?: unknown}).startViewTransition; return typeof m === 'function' ? m as Start : undefined; };

/** Applies the gate; returns whether view transitions are available to the page afterwards. */
export function gateViewTransitions(doc: Document, level: MotionLevel): boolean {
  const d = doc as Doc;
  const allowed = viewTransitionsAllowed(level);
  try {
    if (allowed) {
      if (d[SHADOW]) { delete (d as unknown as Record<string, unknown>).startViewTransition; delete d[SHADOW]; }
      if (d[WRAPPED] && !native(d)) { delete (d as unknown as Record<string, unknown>).startViewTransition; delete d[WRAPPED]; }
      if (!d[WRAPPED] && !own(d) && native(d)) {
        const budgeted: Start = function (this: Document, ...args) {
          const start = native(d);
          if (!start) throw new TypeError('View transitions are not available');
          const released = releaseLeavingPages(d);
          if (!released) throw new DOMException('The page is too large to capture; it changes at once', 'NotSupportedError');
          if (!released.length) return start.apply(this, args);
          const cleanup = keepRootPicture(d);
          const timer = d.defaultView?.setTimeout(cleanup, 3000); // never left on if the browser drops the transition
          try {
            const transition = start.apply(this, args) as {finished?: Promise<unknown>} | undefined;
            const end = () => { cleanup(); if (timer !== undefined) d.defaultView?.clearTimeout(timer); };
            if (transition?.finished && typeof transition.finished.then === 'function') transition.finished.then(end, end); else end();
            return transition;
          } catch (error) { cleanup(); throw error; }
        };
        Object.defineProperty(d, 'startViewTransition', {value: budgeted, configurable: true, writable: true, enumerable: false});
        d[WRAPPED] = true;
      }
    } else if (!d[SHADOW] && typeof d.startViewTransition === 'function') {
      if (d[WRAPPED]) { delete (d as unknown as Record<string, unknown>).startViewTransition; delete d[WRAPPED]; }
      Object.defineProperty(d, 'startViewTransition', {value: undefined, configurable: true, writable: true, enumerable: false});
      d[SHADOW] = true;
    }
  } catch { /* a locked-down document keeps its default */ }
  return typeof d.startViewTransition === 'function';
}
