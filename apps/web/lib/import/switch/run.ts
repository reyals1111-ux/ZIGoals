import type {ImportFormat} from '../batches-schema';
import {STOPPED} from './common';
import type {ReadOutcome} from './read';

/**
 * Starts reading an export (Session W Part 7): in the bundled Web Worker where the browser has one, otherwise on the page
 * (the same code). Stopping terminates the worker at once; nothing has been written by then, because reading only ever
 * produces a plan for the preview.
 */
export type ReadEvents = {onDetected?: (format: ImportFormat, total: number) => void; onProgress?: (done: number) => void; signal?: AbortSignal};
export async function readExport(files: File[], {zone, now}: {zone: string; now: number}, events: ReadEvents = {}): Promise<ReadOutcome> {
  if (events.signal?.aborted) throw Error(STOPPED);
  if (typeof Worker === 'undefined') {
    const [{readFiles}, {filesFrom}] = await Promise.all([import('./read'), import('./source')]);
    return readFiles(await filesFrom(files), {zone, now, onProgress: events.onProgress, signal: events.signal}, events.onDetected);
  }
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module', name: 'zigoals-import'});
  return new Promise<ReadOutcome>((resolve, reject) => {
    const stop = () => { worker.terminate(); reject(Error(STOPPED)); };
    events.signal?.addEventListener('abort', stop, {once: true});
    const finish = () => { events.signal?.removeEventListener('abort', stop); worker.terminate(); };
    worker.onmessage = (event: MessageEvent<{type: string; format?: ImportFormat; total?: number; done?: number; outcome?: ReadOutcome; message?: string}>) => {
      const m = event.data;
      if (m.type === 'detected') events.onDetected?.(m.format!, m.total ?? 0);
      else if (m.type === 'progress') events.onProgress?.(m.done ?? 0);
      else if (m.type === 'outcome') { finish(); resolve(m.outcome!); }
      else if (m.type === 'error') { finish(); reject(Error(m.message || STOPPED)); }
    };
    worker.onerror = event => { event.preventDefault(); finish(); reject(Error('The export could not be read in this browser.')); };
    worker.postMessage({type: 'read', files, zone, now});
  });
}
