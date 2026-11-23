import {holdInView} from '../settings/keep-jump';
import {hashId} from '../../lib/hash-id';

const PERSON = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Session AV lane 2 (fr-layout, FR-TJ-6): an address's #part lands on that part even when the part, or the sections above
 * it, render after the page has opened. The browser's own jump happens once, before the lazy sections exist, and then the
 * page grows: Search → "Watch a Bitcoin address" ended at Wealth's footer on a phone, and the first five's "Log an expense"
 * 2,300 px past #spending. This waits for the element (up to `wait` ms; `fallback` names a part to use if it never
 * comes), brings `reveal(el)` into view (a fold's row for a folded section), calls `ready(el)` (open a form, focus its
 * first field; `at` names the element when the #part is an action, such as #log-spending), and keeps it in view while the page above it settles (holdInView). The person scrolling, tapping or
 * typing first wins: nothing then moves. Returns a function that stops waiting and holding.
 */
export function arriveAt(id: string, {at = id, reveal = el => el, ready, fallback, wait = 10_000}: {at?: string; reveal?: (el: HTMLElement) => HTMLElement; ready?: (el: HTMLElement) => void; fallback?: string; wait?: number} = {}): () => void {
  let frame = 0, release = () => {}, done = false;
  const started = Date.now();
  const stop = () => { done = true; cancelAnimationFrame(frame); release(); for (const type of PERSON) window.removeEventListener(type, stop); };
  for (const type of PERSON) window.addEventListener(type, stop, {passive: true});
  const still = () => !done && (hashId(window.location.hash) === id);
  const land = (el: HTMLElement) => {
    for (const type of PERSON) window.removeEventListener(type, stop);
    const shown = reveal(el);
    shown.scrollIntoView({block: 'start', behavior: 'instant'});
    ready?.(el);
    release = holdInView(shown, undefined, undefined, still);
  };
  const look = () => {
    if (done) return;
    const el = document.getElementById(at) ?? (fallback && Date.now() - started > wait / 2 ? document.getElementById(fallback) : null);
    if (el) { land(el); return; }
    if (Date.now() - started > wait) { stop(); return; }
    frame = requestAnimationFrame(look);
  };
  look();
  return stop;
}

/** Arrives at the current address's #part; `options(id)` says how (null: leave it alone). Returns a function that stops. */
export function arriveHere(options: (id: string) => Parameters<typeof arriveAt>[1] | null): () => void {
  const id = hashId(window.location.hash), how = id ? options(id) : null;
  return id && how ? arriveAt(id, how) : () => {};
}
