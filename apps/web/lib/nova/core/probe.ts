import {softwareRenderer} from './governor';
import {askWebgl, type ProbeAnswer} from './probe-ask';

/**
 * Session AS (Part 4, ADR-041 D36): what the star learns about the browser before it draws, asked off the page's thread
 * where the browser can (a same-origin worker with an OffscreenCanvas), on the page otherwise.
 *
 * The page is asked instead when the browser has no worker or no worker canvas, when the worker fails or says nothing
 * in time, and when the worker finds no WebGL (an older browser may have WebGL on the page only): the answer is then the
 * one the page has always given.
 */
export type StarProbe = {webgl: boolean; software: boolean; renderer: string | null};
export const PROBE_WAIT_MS = 12_000;
export const probeOf = (a: ProbeAnswer): StarProbe => ({webgl: a.webgl, software: a.webgl && (!a.hard || softwareRenderer(a.renderer)), renderer: a.renderer});
export const probeOnPage = (): StarProbe => probeOf(askWebgl(() => document.createElement('canvas')));
/** Starts the probe; `stop` ends it without an answer (the star was taken away). */
export function probeStar(done: (probe: StarProbe) => void, start: () => Worker | null = starWorker): () => void {
  let over = false, worker: Worker | null = null, timer = 0;
  const finish = (probe: StarProbe | null) => {
    if (over) return;
    over = true; window.clearTimeout(timer);
    try { worker?.terminate(); } catch { /* already gone */ }
    done(probe ?? probeOnPage());
  };
  try { worker = start(); } catch { worker = null; }
  if (!worker) { finish(null); return () => undefined; }
  timer = window.setTimeout(() => finish(null), PROBE_WAIT_MS);
  worker.onmessage = (event: MessageEvent<{type?: string; answer?: ProbeAnswer}>) => { const a = event.data?.type === 'probed' ? event.data.answer : undefined; finish(a?.webgl ? probeOf(a) : null); };
  worker.onerror = event => { event.preventDefault?.(); finish(null); };
  worker.postMessage({type: 'probe'});
  return () => { if (over) return; over = true; window.clearTimeout(timer); try { worker?.terminate(); } catch { /* already gone */ } };
}
function starWorker(): Worker | null {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
  return new Worker(new URL('./probe-worker.ts', import.meta.url), {type: 'module', name: 'zigoals-nova-star'});
}
