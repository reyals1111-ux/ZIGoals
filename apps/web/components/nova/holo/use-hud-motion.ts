'use client';
import {useEffect, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {currentMotionLevel} from '../../../lib/motion/level';
import {formatLike, parseFigure, tickValue} from '../../../lib/motion/ticker';
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

/**
 * Design review AM-D10: a figure on NOVA counts up at most once — when its widget is first made (its frame carries
 * `data-made="fresh"` then), under Full motion. Never on a re-mount (a re-flow, Pin, Hide and Show), never when it scrolls
 * into view, never when its value changes. Money never counts: a half-way amount is a wrong amount, so the final figure
 * arrives with its widget's own fade. The count is capped by time (COUNT_MS, on a timer that does not depend on frames),
 * and it always ends on the exact text. Calm, Motion Off, reduced motion and a hidden tab: the final figure at once.
 */
export const COUNT_MS = 420;
/** A widget's make counts once: later mounts inside the same make (a re-flow while it is still fresh) do not count again. */
const COUNT_JOIN_MS = 150, COUNT_ONCE_MS = 6000, counted = new Map<string, number>();
/** Money: a currency sign or code anywhere in the text ("$501,800.00", "950.00 EUR", "€ 12"), or a Wealth widget's figure. */
const MONEY = /\p{Sc}|\b[A-Z]{3}\b/u;
export function countable(text: string): boolean {
  if (MONEY.test(text)) return false;
  const t = parseFigure(text);
  return !!t && Number.isFinite(t.value) && t.value !== 0;
}
/** Whether a figure mounting now, in this widget, may count: only inside the widget's first make. */
export function mayCount(widget: string, fresh: boolean, now: number): boolean {
  if (!fresh) return false;
  const first = counted.get(widget);
  if (first !== undefined && now - first < COUNT_ONCE_MS) return now - first <= COUNT_JOIN_MS;
  counted.set(widget, now);
  return true;
}
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
/**
 * The figure's count: `start` is the first frame's text while it counts (null otherwise: draw the final text), and `run`
 * is the element whose text node the frames write into (a character change only: no React render and no tree change per
 * frame, as components/motion/number-ticker.tsx, Session AK P8b).
 */
export function useCountOnce(host: RefObject<HTMLElement | null>, text: string): {start: string | null; run: RefObject<HTMLSpanElement | null>} {
  const [start, setStart] = useState<string | null>(null), run = useRef<HTMLSpanElement>(null), final = useRef(text);
  useEffect(() => { final.current = text; }, [text]);
  useIsoLayoutEffect(() => {
    const el = host.current, panel = el?.closest<HTMLElement>('.nova-widget');
    if (!el || !panel || document.visibilityState === 'hidden' || currentMotionLevel() !== 'full') return;
    if (panel.dataset.pillar === 'wealth' || !countable(text)) return;
    if (!mayCount(panel.dataset.widget ?? '', panel.dataset.made === 'fresh', performance.now())) return;
    const t = parseFigure(text);
    if (!t) return;
    let frame = 0, done = false;
    const began = performance.now();
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(frame); window.clearTimeout(cap); document.removeEventListener('visibilitychange', finish); setStart(null); };
    const step = (now: number) => {
      if (done) return;
      const elapsed = now - began;
      if (elapsed >= COUNT_MS) { finish(); return; }
      // In the latest text's own style; whatever happens, the figure ends on its exact text (`start` goes back to null).
      const live = parseFigure(final.current) ?? t, node = run.current?.firstChild as Text | null | undefined;
      if (node) node.data = formatLike(live, tickValue(0, live.value, elapsed, COUNT_MS, live.decimals));
      frame = requestAnimationFrame(step);
    };
    // The cap is a timer, so a slow or throttled frame loop can never leave a half-counted figure on screen.
    const cap = window.setTimeout(finish, COUNT_MS + 30);
    document.addEventListener('visibilitychange', finish);
    setStart(formatLike(t, 0));
    frame = requestAnimationFrame(step);
    return finish;
    // Once per mount, by design: a later change of the figure shows at once.
  }, []);
  return {start, run};
}
