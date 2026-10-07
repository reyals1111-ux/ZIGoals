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
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [min]);
  return [ref, width];
}
