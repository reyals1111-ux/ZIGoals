'use client';
import {useCallback, useRef} from 'react';

/**
 * Session AC (item 9d): a table that scrolls sideways on a phone says so at its edges. The wrapper is marked
 * `data-more-left` / `data-more-right` while there is more to see that way (set after a scroll or a resize, in the next
 * frame), and a soft inset shadow shows on that edge (app/visual-v21.css). Nothing is masked or hidden, nothing moves on
 * its own, and the marks follow reduced motion and Motion Off by being still to begin with.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | undefined>(undefined);
  return useCallback((el: T | null) => {
    cleanup.current?.(); cleanup.current = undefined;
    if (!el) return;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      el.toggleAttribute('data-more-left', max > 1 && el.scrollLeft > 1);
      el.toggleAttribute('data-more-right', max > 1 && el.scrollLeft < max - 1);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(mark); };
    mark();
    el.addEventListener('scroll', schedule, {passive: true});
    const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    sizes?.observe(el); if (el.firstElementChild) sizes?.observe(el.firstElementChild);
    cleanup.current = () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', schedule); sizes?.disconnect(); };
  }, []);
}
