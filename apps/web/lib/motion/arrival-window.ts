/**
 * Session AK CI-W: how long PageArrival (components/page-arrival.tsx) watches a visit for content that arrives late.
 * WINDOW_MS is the original watch (one calm arrival per visit).
 */
export const WINDOW_MS = 900;
/** Session AK CI-W: the longest a page's own loading frame may hold the watch open before it ends regardless. */
const LOADING_CAP_MS = 6000;
const LOADING_FRAME = '.aa-skeleton-page[aria-busy="true"]';

/**
 * Session AK CI-W (motion-arrival.spec.ts:18 failing 4 of 6 runs under load): the watch for content that arrives during a
 * visit ran WINDOW_MS from the address change, so a page that shows its loading frame first (Habits' Suspense
 * skeleton, components/ui/skeleton.tsx) and takes longer than that to load got no settle and no shine at all. While the page's
 * loading frame is up the watch stays open (at most LOADING_CAP_MS), and the WINDOW_MS window starts when it leaves. A page
 * without a loading frame is watched exactly as before. `changed` is told of every insertion; `stop` ends the watch (unmount).
 */
export function watchArrivalWindow(main: HTMLElement, end: () => void): {changed: () => void; stop: () => void} {
  let done = false, waiting = !!main.querySelector(LOADING_FRAME);
  const finish = () => { if (done) return; done = true; window.clearTimeout(timer); window.clearTimeout(cap); end(); };
  let timer = window.setTimeout(() => { if (!waiting) finish(); }, WINDOW_MS);
  const cap = window.setTimeout(finish, LOADING_CAP_MS);
  return {
    // Called on every insertion the watch sees: the moment the loading frame has gone, the usual window starts.
    changed: () => {
      if (done || !waiting || main.querySelector(LOADING_FRAME)) return;
      waiting = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, WINDOW_MS);
    },
    stop: () => { done = true; window.clearTimeout(timer); window.clearTimeout(cap); },
  };
}
