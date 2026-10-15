'use client';
/**
 * Session AB-Design Phase 2 (ADR-024): one 30-second clock for the page. The hooks that refresh "today" or re-check what
 * is due every half minute share it, so a page with many of them wakes once every 30 s instead of once per hook (the
 * Habits page alone had six: four day refreshes, the automatic check-ins and the vault idle check). Each listener still
 * runs at most 30 s after the last time; one mounted later only joins the running phase. When the page's timer functions
 * change (a test's fake clock, installed after the page loaded), the next listener re-arms the clock on the new ones.
 */
const HALF_MINUTE = 30_000;
const listeners = new Set<() => void>();
let armedWith: typeof window.setInterval | null = null, stop: (() => void) | null = null;
const fire = () => { for (const listener of [...listeners]) listener(); };
function arm() {
  if (armedWith === window.setInterval) return;
  stop?.();
  const clear = window.clearInterval.bind(window), id = window.setInterval(fire, HALF_MINUTE);
  armedWith = window.setInterval; stop = () => clear(id);
}
/** Calls `listener` every 30 s until the returned function is called. */
export function everyHalfMinute(listener: () => void): () => void {
  listeners.add(listener); arm();
  return () => {
    if (!listeners.delete(listener) || listeners.size) return;
    stop?.(); stop = null; armedWith = null;
  };
}
