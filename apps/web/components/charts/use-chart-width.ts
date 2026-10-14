'use client';
import {useLayoutEffect, useRef, useState} from 'react';

/**
 * The width a chart is shown at, measured (Session W Parts 4–5), so a hand-built SVG is drawn at its real size and its
 * 14 px labels stay 14 px on every screen. Starts at `initial` until the first measure; never below `min`.
 */
export function useChartWidth(initial = 320, min = 260): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null), [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(min, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // Session AB-Design Phase 2 closing pass (WebKit: "ResizeObserver loop completed with undelivered notifications"): a
    // resize is measured on the next frame, never inside the observer's own delivery, where the re-drawn chart could
    // resize what is being observed.
    let frame = 0;
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); });
    observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [min]);
  return [ref, width];
}
