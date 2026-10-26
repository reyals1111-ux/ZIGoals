'use client';
import {useEffect} from 'react';

/**
 * Session AH (LA4): on a phone, a row of chips or tabs that runs past the edge says so: it is marked `data-scroll-more`
 * while more of it lies to the right, and globals.css fades that edge. A static fade, not an animation, so it holds
 * with reduced motion and Motion Off and never keeps a page "moving".
 */
const ROWS = '.picker-tabs, .habit-filter-bar, .health-views, .view-tabs, .activity-context, .earn-chips';
export function ScrollCues() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const phone = window.matchMedia('(max-width: 767.98px)');
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const row of document.querySelectorAll<HTMLElement>(ROWS)) {
        const more = phone.matches && row.scrollWidth - row.clientWidth > 2 && row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
        if (more !== row.hasAttribute('data-scroll-more')) row.toggleAttribute('data-scroll-more', more);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {childList: true, subtree: true});
    document.addEventListener('scroll', schedule, true); window.addEventListener('resize', schedule); phone.addEventListener?.('change', schedule);
    schedule();
    return () => { mutations.disconnect(); document.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); phone.removeEventListener?.('change', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
