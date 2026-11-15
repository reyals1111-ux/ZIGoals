'use client';
import {useEffect, type RefObject} from 'react';

/**
 * Session AP (D-028 and route weights): the roving tabindex for the shell's sidebar, attached once the page has shown. The
 * roving code (use-roving-focus.ts) then loads as its own small chunk instead of in every page's first scripts; until it
 * arrives (a moment after hydration) every item stays in the Tab order, as before this change.
 */
export function useRovingLater<T extends HTMLElement>(ref: RefObject<T | null>, selector: string): void {
  useEffect(() => {
    let stop: (() => void) | null = null, gone = false;
    void import('./use-roving-focus').then(m => { const root = ref.current; if (!gone && root) stop = m.attachRoving(root, selector); }, () => undefined);
    return () => { gone = true; stop?.(); };
  }, [ref, selector]);
}
