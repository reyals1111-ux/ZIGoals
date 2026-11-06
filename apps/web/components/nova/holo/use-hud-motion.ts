'use client';
import {useEffect, useRef, useState, type RefObject} from 'react';
import {useNovaMotionLevel} from '../use-nova';
import {hudMotion, type HudMotion} from '../../../lib/nova/holo/motion';

/**
 * Session AL Part 11 (lane L8; O5): the HUD's motion right now — the app's Motion level and the device's reduced motion
 * (lib/motion/level.ts through NOVA's own watcher), the tab's visibility (everything pauses while hidden) and whether this
 * is a phone (lighter: no shimmer, no motes). The dashboard mirrors `state` on NOVA's frame as `data-hud-motion`.
 */
export function useTabHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const read = () => setHidden(document.visibilityState === 'hidden');
    read(); document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);
  return hidden;
}
export function useHudMotion(phone: boolean): HudMotion {
  const level = useNovaMotionLevel(), hidden = useTabHidden();
  return hudMotion({level, hidden, phone});
}
/**
 * Whether an element is off-screen (its own loops pause then: `data-off` on the panel). Written to the element directly,
 * so scrolling never re-renders a panel. No observer in a browser without one: the panel counts as on screen.
 */
export function useOffscreenMark(ref: RefObject<HTMLElement | null>, on: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { for (const e of entries) { if (e.isIntersecting) delete el.dataset.off; else el.dataset.off = ''; } }, {rootMargin: '40px'});
    observer.observe(el);
    return () => { observer.disconnect(); delete el.dataset.off; };
  }, [ref, on]);
}
/** A counter that changes when `value` changes after the first render (a figure's pulse keys on it; the first view does not pulse). */
export function useChangeCount(value: string): number {
  const last = useRef(value), [count, setCount] = useState(0);
  useEffect(() => { if (last.current !== value) { last.current = value; setCount(c => c + 1); } }, [value]);
  return count;
}
