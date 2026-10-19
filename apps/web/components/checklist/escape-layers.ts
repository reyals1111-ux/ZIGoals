'use client';
import {useEffect, useRef} from 'react';

/**
 * Session AF (L3b): Escape inside the full-screen Checklist closes the innermost thing that is open first — the day's
 * celebration, a sheet (Edit path, Options, About), a dot's stepper or details — and only then the Checklist itself. Each
 * of those registers here while it is open; the overlay asks `escapeTop()` and leaves when nothing answered.
 */
const layers: {run: () => void}[] = [];
export function useEscapeLayer(active: boolean, run: () => void) {
  const latest = useRef(run);
  useEffect(() => { latest.current = run; });
  useEffect(() => {
    if (!active) return;
    const layer = {run: () => latest.current()};
    layers.push(layer);
    return () => { const at = layers.indexOf(layer); if (at >= 0) layers.splice(at, 1); };
  }, [active]);
}
/** Runs the innermost open layer's close; false when none is open. */
export function escapeTop(): boolean { const top = layers.at(-1); if (!top) return false; top.run(); return true; }
