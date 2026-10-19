'use client';
import {useEffect} from 'react';
import {skyAllowed, skyDriver, skyOffset, skyRange} from '../../lib/sidebar-sky';
import './sidebar-sky.css';

/**
 * Session AF (L5a, Part 10.1, ADR-028 H28): the sidebar's sky scrolls with a parallax. Session AE's three sky layers stay
 * on the sidebar exactly as drawn (the vector stars, the ground gradient, the colour, all scrolling with the content and
 * pinned to its end); only the stars layer's background position moves, back down by 55 % of what the content scrolled
 * up, so the stars travel at 45 % of the content's speed. The page mark, the planet with its words and the theme bar are
 * the sidebar's own content: they scroll with it, untouched. Background position, not a transform: a moved layer inside
 * the scroller would lengthen its own scroll.
 *
 * While the sidebar scrolls, a CSS scroll-driven animation drives the drift (sidebar-sky.css) where the engine has
 * `animation-timeline`; once it rests, the same value is kept as a plain custom property and the animation is detached,
 * so no animation keeps running on a still page (the one-time-motion rule, H55, and every "nothing is moving" check).
 * Without `animation-timeline` a passive scroll listener writes the value once per frame. Reduced motion, Motion Off and
 * the tablet header (≤ 900 px): nothing is written and AE's pinned sky shows, still. Renders nothing; mounted once, by
 * the sidebar's theme bar (its own lazy island, so the shell carries no extra weight).
 */
export function SidebarSky() {
  useEffect(() => {
    // Nothing to drive without the sidebar or media queries (a test document, an engine without matchMedia).
    const el = document.querySelector<HTMLElement>('aside.app-sidebar'); if (!el || typeof window.matchMedia !== 'function') return;
    const root = document.documentElement, desktop = matchMedia('(min-width: 901px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const driver = skyDriver(typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: scroll()'));
    let on = false, frame = 0, settle = 0;
    const rest = () => { el.style.setProperty('--sky-rest', `${skyOffset(el.scrollTop)}px`); el.dataset.sky = 'rest'; };
    const range = () => { if (on) el.style.setProperty('--sky-range', `${skyRange(el.scrollHeight, el.clientHeight)}px`); };
    const apply = () => {
      on = skyAllowed({desktop: desktop.matches, reduced: reduced.matches, motionOff: root.dataset.appMotion === 'off'});
      window.clearTimeout(settle); if (frame) cancelAnimationFrame(frame); frame = 0;
      if (on) { range(); rest(); return; }
      delete el.dataset.sky; el.style.removeProperty('--sky-rest'); el.style.removeProperty('--sky-range');
    };
    const onScroll = () => {
      if (!on) return;
      if (driver === 'timeline') { if (el.dataset.sky !== 'timeline') el.dataset.sky = 'timeline'; window.clearTimeout(settle); settle = window.setTimeout(rest, 180); }
      else if (!frame) frame = requestAnimationFrame(() => { frame = 0; rest(); });
    };
    const onScrollEnd = () => { if (on && driver === 'timeline') { window.clearTimeout(settle); rest(); } };
    apply();
    el.addEventListener('scroll', onScroll, {passive: true});
    el.addEventListener('scrollend', onScrollEnd);
    desktop.addEventListener('change', apply); reduced.addEventListener('change', apply);
    const motion = new MutationObserver(apply); motion.observe(root, {attributes: true, attributeFilter: ['data-app-motion']});
    // The scroll's length changes when the navigation or the planet's mark changes size: the drift's range follows it.
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(range);
    if (sizes) { sizes.observe(el); for (const child of el.children) sizes.observe(child); }
    return () => {
      el.removeEventListener('scroll', onScroll); el.removeEventListener('scrollend', onScrollEnd);
      desktop.removeEventListener('change', apply); reduced.removeEventListener('change', apply);
      motion.disconnect(); sizes?.disconnect(); window.clearTimeout(settle); if (frame) cancelAnimationFrame(frame);
      delete el.dataset.sky; el.style.removeProperty('--sky-rest'); el.style.removeProperty('--sky-range');
    };
  }, []);
  return null;
}
