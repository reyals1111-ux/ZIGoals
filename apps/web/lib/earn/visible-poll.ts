/**
 * Session AF (L1, P1.16; the Gate C ledger pass): the Earn page's polling rule, as a pure function so it is tested without
 * a browser. Read at once, then every `pollMs` — but only while the page is visible: a hidden page reads nothing, and
 * coming back reads at once when the last read is older than the cadence (and the cadence starts again). One read at a
 * time. The returned function stops everything.
 */
export type PollEnv = {
  visible: () => boolean;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (id: number) => void;
  /** Calls `fn` whenever the page's visibility changes; returns how to stop listening. */
  onVisibility: (fn: () => void) => () => void;
};
export function visiblePoll(read: () => Promise<void>, pollMs: number, env: PollEnv): () => void {
  let alive = true, timer = 0, busy = false, last = 0;
  const run = async () => {
    if (busy || !alive || !env.visible()) return;
    busy = true; last = env.now();
    try { await read(); } finally { busy = false; }
  };
  const schedule = () => { env.clearTimer(timer); timer = env.setTimer(async () => { await run(); if (alive) schedule(); }, pollMs); };
  const off = env.onVisibility(() => { if (alive && env.visible() && env.now() - last >= pollMs) { void run(); schedule(); } });
  void run(); schedule();
  return () => { alive = false; env.clearTimer(timer); off(); };
}
/** The page's own visibility, clock and timers. */
export const browserPollEnv = (): PollEnv => ({
  visible: () => document.visibilityState === 'visible',
  now: () => Date.now(),
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: id => window.clearTimeout(id),
  onVisibility: fn => { document.addEventListener('visibilitychange', fn); return () => document.removeEventListener('visibilitychange', fn); },
});
