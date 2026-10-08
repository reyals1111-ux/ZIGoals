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
export function holdInView(target: HTMLElement, ms = 2000, most = 10_000): () => void {
  if (typeof ResizeObserver !== 'function') return () => {};
  const top = target.getBoundingClientRect().top;
  let stop = () => {}, timer = window.setTimeout(() => stop(), ms);
  const cap = window.setTimeout(() => stop(), most);
  const observer = new ResizeObserver(() => {
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
export function KeepSettingsJump() {
  useEffect(() => {
    let stop = () => {};
    const keep = () => {
      stop();
      const id = hashId(window.location.hash), target = id ? document.getElementById(id) : null;
      if (target) stop = holdInView(target);
    };
    window.addEventListener('hashchange', keep);
    if (window.location.hash) keep();
    return () => { window.removeEventListener('hashchange', keep); stop(); };
  }, []);
  return null;
}
