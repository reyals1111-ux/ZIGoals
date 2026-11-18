/// <reference lib="webworker" />
import {askWebgl} from './probe-ask';

/**
 * Session AS (Part 4, ADR-041 D36): the star's first ask for WebGL, off the page's thread. Where a browser has no
 * graphics hardware, that first ask can hold a thread for seconds while the browser starts its software renderer; here
 * it holds this worker, not the page. The worker is bundled with the app (same origin: `worker-src 'self'` already
 * allows it), makes no request, reads nothing of the person's, and answers once: can WebGL draw, with hardware, by
 * which renderer.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<{type?: string}>) => {
  if (event.data?.type !== 'probe') return;
  scope.postMessage({type: 'probed', answer: askWebgl(() => new OffscreenCanvas(1, 1))});
};
