import type {MotionLevel} from './level';

/**
 * Session AK M1 (ADR-036 Q26, reversed by M1): page transitions run through React's <ViewTransition> (app/app/template.tsx).
 * React starts a document view transition for every navigation that places one, whatever its classes say, so "none" in
 * CSS alone would still capture and swap the page. Under Motion Off and reduced motion this gate makes the page behave as
 * in a browser without the API: `document.startViewTransition` is shadowed by `undefined` on the document itself, React
 * then commits directly (its own fallback path), and theme switching applies at once (it already does there). Back in
 * Full or Calm the shadow is removed and the browser's own method shows through again. Nothing is changed when the
 * browser has no view transitions.
 */
const SHADOW = '__zgViewTransitionsOff';
type Doc = Document & {[SHADOW]?: boolean};

export function viewTransitionsAllowed(level: MotionLevel): boolean { return level !== 'off'; }

/** Applies the gate; returns whether view transitions are available to the page afterwards. */
export function gateViewTransitions(doc: Document, level: MotionLevel): boolean {
  const d = doc as Doc;
  const allowed = viewTransitionsAllowed(level);
  try {
    if (allowed) {
      if (d[SHADOW]) { delete (d as unknown as Record<string, unknown>).startViewTransition; delete d[SHADOW]; }
    } else if (!d[SHADOW] && typeof d.startViewTransition === 'function') {
      Object.defineProperty(d, 'startViewTransition', {value: undefined, configurable: true, writable: true, enumerable: false});
      d[SHADOW] = true;
    }
  } catch { /* a locked-down document keeps its default */ }
  return typeof d.startViewTransition === 'function';
}
