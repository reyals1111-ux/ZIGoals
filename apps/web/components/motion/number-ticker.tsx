'use client';
/**
 * Session AK M1: a figure that counts up once, in Full motion only, the first time it is seen on this mount.
 * - The final text is what the server renders and what assistive technology reads at every moment (a visually hidden
 *   copy while the count runs; the counting digits are aria-hidden).
 * - Calm, Off and reduced motion: the final value at once. Unknown is not zero: text without one clear figure never ticks.
 * - The width never moves: an invisible copy of the final text holds the space while the count draws over it.
 * - On the first page load it ticks only if the figure is still off screen (it was already painted with its value);
 *   after a navigation (or a later mount) it ticks when it comes into view.
 * - One requestAnimationFrame loop per running ticker, ~900 ms, writing text only (no React render per frame): the text
 *   node's data, so no frame changes the page's tree (Session AK P8b).
 */
import {useLayoutEffect, useRef, useState} from 'react';
import {currentMotionLevel} from '../../lib/motion/level';
import {formatLike, parseFigure, shouldTick, tickValue, TICK_MS} from '../../lib/motion/ticker';

/* Session AL (DV-259, P-TK-42): the copies are placed inline too (as CountUp's), so a style sheet that arrives late never
   draws the figure two or three times side by side; motion-2026.css keeps the same rules. */
const SR_ONLY = {position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0} as const;
const RUNNING_HOST = {position: 'relative', display: 'inline-block'} as const;
const SIZE_COPY = {visibility: 'hidden'} as const;
const RUN_COPY = {position: 'absolute', insetInlineStart: 0, top: 0, whiteSpace: 'nowrap'} as const;

export function NumberTicker({text, className = '', duration = TICK_MS}: {text: string; className?: string; duration?: number}) {
  const host = useRef<HTMLSpanElement>(null), run = useRef<HTMLSpanElement>(null), finalText = useRef(text), played = useRef(false);
  const [running, setRunning] = useState<string | null>(null);
  finalText.current = text;
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || played.current) return;
    const template = parseFigure(text);
    if (!template || !shouldTick(currentMotionLevel(), template.value)) { played.current = true; return; }
    const hydrated = document.documentElement.hasAttribute('data-app-hydrated');
    let frame = 0, observer: IntersectionObserver | null = null;
    const start = () => {
      if (played.current) return;
      played.current = true;
      const t = parseFigure(finalText.current);
      if (!t) return;
      setRunning(formatLike(t, 0));
      const began = performance.now();
      const step = (now: number) => {
        const elapsed = now - began;
        // Session AK P8b: the digits change the text node's data (a character change), never the span's children (React
        // renders the running text as its one text node). A new child node is a tree change, and every tree change runs
        // the page's :has() checks (on Today ~335–2,500 elements re-styled per frame at CPU 4× while scrolling); a
        // character change only re-lays out this line.
        const node = run.current?.firstChild as Text | null | undefined;
        if (node) node.data = formatLike(t, tickValue(0, t.value, elapsed, duration, t.decimals));
        if (elapsed < duration && document.visibilityState === 'visible') frame = requestAnimationFrame(step);
        else setRunning(null);
      };
      frame = requestAnimationFrame(step);
    };
    const inView = () => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; };
    if (!hydrated && inView()) { played.current = true; return; }
    if (!('IntersectionObserver' in window)) { played.current = true; return; }
    observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); start(); } }, {threshold: .5});
    observer.observe(el);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); };
    // Once per mount: later changes of the figure show at once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (running === null) return <span ref={host} className={`zg-ticker ${className}`.trim()}>{text}</span>;
  return <span ref={host} className={`zg-ticker ${className}`.trim()} data-running="" style={RUNNING_HOST}>
    <span className="sr-only" style={SR_ONLY}>{text}</span>
    <span className="zg-ticker-size" aria-hidden="true" style={SIZE_COPY}>{text}</span>
    <span ref={run} className="zg-ticker-run" aria-hidden="true" style={RUN_COPY}>{running}</span>
  </span>;
}
