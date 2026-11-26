'use client';
import {useEffect} from 'react';
import {hashId} from '../../lib/hash-id';

const PERSON = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Keeps a jump's target where the jump put it while content above it finishes loading: until two seconds pass with
 * nothing moving (ten at most), or at once when the person scrolls, taps or types. Returns a function that stops holding.
 * Session X Part 14 (J201) for Settings; P2.6 for a link to one card on Today and to one habit, whose pages also grow
 * above the target as they load. A slow phone loads Settings' ZIGi panels one after another for longer than two seconds,
 * so each move restarts the wait (Pass 1 rerun).
 */
export function holdInView(target: HTMLElement, ms = 2000, most = 10_000, still: () => boolean = () => true): () => void {
  if (typeof ResizeObserver !== 'function') return () => {};
  const top = target.getBoundingClientRect().top;
  let stop = () => {}, timer = window.setTimeout(() => stop(), ms);
  const cap = window.setTimeout(() => stop(), most);
  const observer = new ResizeObserver(() => {
    // A newer jump already scrolled the page to its own target (its hashchange comes after this callback): let go, never
    // pull the page back to the old one (D-088, CI10).
    if (!still()) { stop(); return; }
    const moved = target.getBoundingClientRect().top - top;
    if (Math.abs(moved) > 4) { window.scrollBy(0, moved); window.clearTimeout(timer); timer = window.setTimeout(() => stop(), ms); }
  });
  stop = () => { observer.disconnect(); window.clearTimeout(timer); window.clearTimeout(cap); for (const type of PERSON) window.removeEventListener(type, stop); stop = () => {}; };
  for (const type of PERSON) window.addEventListener(type, stop, {passive: true});
  observer.observe(document.body);
  return () => stop();
}

/**
 * Session X Part 14 (J201): a jump within Settings (#settings-help, a phone row, any #anchor on the page) lands on its
 * target even when a section above finishes loading just after the jump: ZIGi's settings load on demand and grow by
 * about 900 px, and the browser's own scroll anchoring did not hold the target there.
 */
/**
 * Session AW (Part 2; CI run 2034, j06): Settings' lower groups now come from their own chunk, so a jump to one of their
 * anchors (#notifications) can run before its target exists, and the browser lands nowhere near it. Until the target
 * appears (ten seconds at most, and never once the person scrolls by wheel, touch or keys, or another jump follows) this
 * waits for it and lands on it once, instantly (no hold: the late part may scroll to its own anchor). A click (opening
 * a group) keeps the wait: it does not move the page.
 */
const SCROLLS = ['wheel', 'touchstart', 'keydown'] as const;
export function whenOnPage(id: string, found: (target: HTMLElement) => void, most = 10_000, still: () => boolean = () => true): () => void {
  const now = document.getElementById(id);
  if (now) { found(now); return () => {}; }
  if (typeof MutationObserver !== 'function') return () => {};
  let stop = () => {};
  const observer = new MutationObserver(() => {
    if (!still()) { stop(); return; }
    const target = document.getElementById(id);
    if (target) { stop(); found(target); }
  });
  const cap = window.setTimeout(() => stop(), most);
  stop = () => { observer.disconnect(); window.clearTimeout(cap); for (const type of SCROLLS) window.removeEventListener(type, stop); stop = () => {}; };
  for (const type of SCROLLS) window.addEventListener(type, stop, {passive: true});
  observer.observe(document.body, {childList: true, subtree: true});
  return () => stop();
}

export function KeepSettingsJump() {
  useEffect(() => {
    let stop = () => {};
    const keep = () => {
      stop();
      const id = hashId(window.location.hash);
      if (!id) return;
      const same = () => hashId(window.location.hash) === id;
      let hold = () => {}, late = false;
      const wait = whenOnPage(id, target => {
        // Landed late (its chunk arrived after the jump): put it where the jump would have, once. No hold then: a part
        // that draws itself late may scroll to its own anchor (ZIGi's section does), and a hold would pull the page back
        // from it (aw-simplicity-c, the local re-run). A target already there is held as before.
        if (late) { target.scrollIntoView({block: 'start', behavior: 'instant'}); return; }
        hold = holdInView(target, undefined, undefined, same);
      }, undefined, same);
      late = true;
      stop = () => { wait(); hold(); };
    };
    window.addEventListener('hashchange', keep);
    if (window.location.hash) keep();
    return () => { window.removeEventListener('hashchange', keep); stop(); };
  }, []);
  return null;
}
