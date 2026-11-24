/**
 * Session AV lane 2 ([TIER 3] (PWA), owner follow-up 8, ADR-045 D-CI2016-J04): "Reload" for a new version.
 *
 * Measured with Chromium's own worker reporting: the old worker is stopped for the takeover, and a request of the page it
 * still controls (in the stuck runs, the Next router prefetching /app/settings ~0.1 s after the tap) starts it again in
 * that moment. Chromium then never finishes the takeover: the new worker stays "installed" for good. So from the tap
 * until the new worker controls the page, the page's own `fetch` calls (the router's prefetches, the update check, the
 * app's polling) wait; they go on as soon as the takeover is over, or when it gave up.
 */

/** How long "Reload" waits for the new version before the bar says how to finish by hand. */
export const TAKEOVER_NOTE_MS = 5000;
/** The bar's words when the new version has not taken over in time (owner follow-up 8). */
export const TAKEOVER_NOTE = 'Almost there: close ZIGoals and open it again to finish the update.';

/**
 * Holds every `window.fetch` call made from now on until the returned release runs; each held call then goes out as
 * it was asked. Calls already under way are left alone. Releasing twice does nothing.
 */
export function holdPageRequests(win: Window & typeof globalThis = window): () => void {
  const original = win.fetch;
  const queue: (() => void)[] = [];
  let held = true;
  const waiting: typeof fetch = (input, init) => held
    ? new Promise<Response>((resolve, reject) => { queue.push(() => { original.call(win, input, init).then(resolve, reject); }); })
    : original.call(win, input, init);
  win.fetch = waiting;
  return () => {
    if (!held) return;
    held = false;
    if (win.fetch === waiting) win.fetch = original;
    for (const go of queue.splice(0)) go();
  };
}

/**
 * The takeover itself: hold the page's requests, then ask the waiting worker to take over. `done` runs once the new
 * worker controls the page (the caller reloads then); `late` runs if it has not after TAKEOVER_NOTE_MS (the caller shows
 * TAKEOVER_NOTE; nothing reloads by itself). Either way the held requests go on.
 */
export function startTakeover(waiting: ServiceWorker, {done, late, container = navigator.serviceWorker, ms = TAKEOVER_NOTE_MS}: {
  done: () => void; late: () => void; container?: ServiceWorkerContainer; ms?: number;
}): () => void {
  const release = holdPageRequests();
  let over = false;
  const finish = (then: () => void) => { if (over) return; over = true; window.clearTimeout(timer); container.removeEventListener('controllerchange', moved); release(); then(); };
  const moved = () => finish(done);
  container.addEventListener('controllerchange', moved);
  const timer = window.setTimeout(() => finish(late), ms);
  waiting.postMessage({type: 'zigoals:sw-reload'});
  return () => finish(() => {});
}
