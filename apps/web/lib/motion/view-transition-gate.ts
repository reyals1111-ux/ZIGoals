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
 */
const SHADOW = '__zgViewTransitionsOff';
const WRAPPED = '__zgViewTransitionsBudget';
/** Device pixels the named elements may cover when a page transition starts: 32 million (about 128 MB of picture). */
export const CAPTURE_BUDGET = 32_000_000;
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
          if (namedCaptureArea(d) > CAPTURE_BUDGET) throw new DOMException('The page is too large to capture; it changes at once', 'NotSupportedError');
          return start.apply(this, args);
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
