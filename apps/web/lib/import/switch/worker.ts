/// <reference lib="webworker" />
import {readFiles} from './read';
import {filesFrom} from './source';
import {STOPPED} from './common';

/**
 * The importer's Web Worker (Session W Part 7): the export is unpacked and read here, off the page's thread, so the page
 * stays responsive through a multi-gigabyte Apple Health file. It is bundled with the app (served from /_next/static/,
 * which the Trusted Types policy and `worker-src 'self'` already allow) and talks only to the page that started it: it
 * makes no request of its own. Messages out: the format found, progress in bytes, then the plan or a plain refusal.
 */
type Start = {type: 'read'; files: File[]; zone: string; now: number};
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async (event: MessageEvent<Start>) => {
  if (event.data?.type !== 'read') return;
  const {files, zone, now} = event.data;
  try {
    const list = await filesFrom(files);
    const outcome = await readFiles(list, {zone, now, onProgress: done => scope.postMessage({type: 'progress', done})}, (format, total) => scope.postMessage({type: 'detected', format, total}));
    scope.postMessage({type: 'outcome', outcome});
  } catch (error) {
    scope.postMessage({type: 'error', message: error instanceof Error && error.message ? error.message : STOPPED});
  }
};
