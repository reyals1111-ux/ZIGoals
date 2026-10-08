'use client';
import {useEffect} from 'react';

const PERSON = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Session X Part 14 (J201): a jump within Settings (#settings-help, a phone row, any #anchor on the page) lands on its
 * target even when a section above finishes loading just after the jump: ZIGi's settings load on demand and grow by
 * about 900 px, and the browser's own scroll anchoring did not hold the target there. For two seconds after the jump,
 * unless the person scrolls, taps or types, the target is kept where the jump put it. Nothing else moves.
 */
export function KeepSettingsJump() {
  useEffect(() => {
    let stop = () => {};
    const keep = () => {
      stop();
      const id = decodeURIComponent(window.location.hash.slice(1)), target = id ? document.getElementById(id) : null;
      if (!target || typeof ResizeObserver !== 'function') return;
      const top = target.getBoundingClientRect().top;
      const observer = new ResizeObserver(() => { const moved = target.getBoundingClientRect().top - top; if (Math.abs(moved) > 4) window.scrollBy(0, moved); });
      const timer = window.setTimeout(() => stop(), 2000);
      stop = () => { observer.disconnect(); window.clearTimeout(timer); for (const type of PERSON) window.removeEventListener(type, stop); stop = () => {}; };
      for (const type of PERSON) window.addEventListener(type, stop, {passive: true});
      observer.observe(document.body);
    };
    window.addEventListener('hashchange', keep);
    if (window.location.hash) keep();
    return () => { window.removeEventListener('hashchange', keep); stop(); };
  }, []);
  return null;
}
