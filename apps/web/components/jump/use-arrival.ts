'use client';
import {useEffect, useRef} from 'react';
import type {arriveAt} from './arrive';

/**
 * Session AV lane 2 (fr-layout, FR-TJ-6): a page follows its address's #part once that part has rendered and the page
 * above it has settled (components/jump/arrive.ts), on arrival and on every later hash change. The helper loads only when
 * an address has a #part, so a page opened without one carries none of it (route weights).
 */
export function useHashArrival(options: (id: string) => Parameters<typeof arriveAt>[1] | null) {
  const how = useRef(options);
  useEffect(() => { how.current = options; });
  useEffect(() => {
    let stop = () => {}, gone = false;
    const go = () => {
      if (window.location.hash.length < 2) return;
      void import('./arrive').then(m => { if (gone) return; stop(); stop = m.arriveHere(id => how.current(id)); }).catch(() => undefined);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => { gone = true; window.removeEventListener('hashchange', go); stop(); };
  }, []);
}
