'use client';
/**
 * Session AK M1: things that play once, the first time each comes into view, in Full motion only:
 *  - chart lines (the one chart look's `.zgc-line`) draw themselves: a Web Animation on the stroke's dash with no fill, so
 *    when it ends the line is exactly as the chart drew it; a dashed or very long line fades instead; a line already
 *    animating, or with its own pathLength (its chart draws it), is left alone;
 *  - blocks of long pages (Life review, Help, and any `.zg-reveal`) rise 14 px into place (translate only, no
 *    opacity: readable at every frame). A block already on screen when it is found has been seen and does not move.
 * Time-based and finite on purpose: a scroll-linked timeline would replay on every scroll and never "finish". Calm, Off
 * and reduced motion: nothing runs. Discovery is one MutationObserver whose work waits for an idle moment, and one
 * IntersectionObserver for everything watched.
 */
import {currentMotionLevel} from '../../lib/motion/level';

export const STROKE_SELECTOR = 'svg .zgc-line';
export const REVEAL_SELECTOR = '.life-review-page > :not(:first-child), .help-page section, .zg-reveal';
export const DRAW_MS = 900, LONG_STROKE = 6000;

type Geometry = SVGGeometryElement;
const isGeometry = (el: Element): el is Geometry => typeof (el as Geometry).getTotalLength === 'function';

export function drawStroke(el: Element) {
  if (typeof (el as HTMLElement).animate !== 'function' || el.getAnimations?.().length) return;
  // A line with its own pathLength is drawn by its chart on that scale (Wealth over time, a price chart: a CSS draw on
  // data-entrance=once). Drawing it here too stacked a px dash above that draw whenever this observer fired first
  // (Session AK CI: motion-polish read the wealth line stuck at 648 px).
  if (el.hasAttribute('pathLength')) return;
  const style = getComputedStyle(el);
  let length = 0;
  try { length = isGeometry(el) ? el.getTotalLength() : 0; } catch { length = 0; }
  const fade = !(length > 0) || length > LONG_STROKE || (style.strokeDasharray && style.strokeDasharray !== 'none');
  if (fade) { el.animate([{opacity: 0}, {opacity: 1}], {duration: 420, easing: 'ease-out'}); return; }
  const dash = `${length} ${length}`;
  el.animate([{strokeDasharray: dash, strokeDashoffset: `${length}`}, {strokeDasharray: dash, strokeDashoffset: '0'}], {duration: DRAW_MS, easing: 'cubic-bezier(.2,.8,.2,1)'});
}
const reveal = (el: Element) => { (el as HTMLElement).dataset.zgReveal = 'play'; };

const inViewNow = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };

/** Starts watching; returns a stop function. */
export function watchOnView(doc: Document = document): () => void {
  if (typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined' || !doc.body) return () => {};
  const actions = new Map<Element, (el: Element) => void>();
  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      seen.unobserve(entry.target);
      const act = actions.get(entry.target); actions.delete(entry.target);
      if (act && currentMotionLevel() === 'full') act(entry.target);
    }
  }, {threshold: .1});
  let pending = 0;
  const w = window as Window;
  const idle = (cb: () => void): number => (typeof w.requestIdleCallback === 'function' ? w.requestIdleCallback(cb, {timeout: 600}) : w.setTimeout(cb, 120));
  const cancelIdle = (id: number) => { if (typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(id); else w.clearTimeout(id); };
  const take = (selector: string, act: (el: Element) => void, skipVisible: boolean) => {
    for (const el of doc.querySelectorAll<HTMLElement | SVGElement>(selector)) {
      if (el.dataset.zgSeen !== undefined) continue;
      el.dataset.zgSeen = '';
      if (skipVisible && inViewNow(el)) continue;
      actions.set(el, act); seen.observe(el);
    }
  };
  const scan = () => {
    pending = 0;
    if (currentMotionLevel() !== 'full') return;
    take(STROKE_SELECTOR, drawStroke, false);
    take(REVEAL_SELECTOR, reveal, true);
  };
  const schedule = () => { if (!pending) pending = idle(scan); };
  const added = new MutationObserver(records => { for (const r of records) if (r.addedNodes.length) { schedule(); return; } });
  added.observe(doc.body, {childList: true, subtree: true});
  schedule();
  return () => { added.disconnect(); seen.disconnect(); actions.clear(); if (pending) cancelIdle(pending); };
}
