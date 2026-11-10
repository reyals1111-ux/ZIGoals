'use client';
import {useEffect, useRef} from 'react';

/**
 * Session AH Part 3 (DS9/A3, D-206, T-077, BUG-076/077): while a dialog or sheet is open, the browser's Back (and a
 * phone's back gesture) closes it instead of leaving the page under it. Opening adds one history entry for the dialog
 * (a copy of the page's own state, so the router sees the same page); Back returns to the page's entry and closes the
 * dialog; closing it any other way (×, Escape, a save) takes that entry back out, so history stays as it was. A link
 * followed from inside the dialog leaves the entry behind (it is the same page; one more Back passes it).
 */
const KEY = '__zigoalsLayer';
/**
 * Session AL fifth pass (L1): the Back that a closing dialog sends itself is not a person's Back. Its popstate arrives a
 * moment later, and a dialog that opened in between took it for one and closed at once: under `next dev` every sheet did
 * (React's Strict Mode runs a dialog's first effect, its cleanup and the effect again), and so would a dialog that opens
 * as another closes. That popstate is marked here (a capturing listener runs before the dialogs' own) and passed over.
 */
let ownBacks = 0, ownBackAt = 0, watching = false;
const ownPops = new WeakSet<Event>();
function backOnce() {
  if (!watching) {
    watching = true;
    window.addEventListener('popstate', event => { if (ownBacks > 0 && performance.now() - ownBackAt < 1000) { ownBacks--; ownPops.add(event); } else ownBacks = 0; }, true);
  }
  ownBacks++; ownBackAt = performance.now();
  try { window.history.back(); } catch { ownBacks--; /* the entry stays; one more Back passes it */ }
}
export function useBackCloses(open: boolean, close: () => void) {
  const latest = useRef(close);
  useEffect(() => { latest.current = close; });
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const id = Math.random().toString(36).slice(2), href = window.location.href;
    let closedByBack = false, followedLink = false;
    try { window.history.pushState({...(window.history.state ?? {}), [KEY]: id}, ''); } catch { return; }
    const onPop = (event: PopStateEvent) => { if (ownPops.has(event)) return; if ((window.history.state as Record<string, unknown> | null)?.[KEY] !== id) { closedByBack = true; latest.current(); } };
    // A link followed from inside the dialog closes it on the way to another page: then history is left alone (taking the
    // entry out would undo that navigation).
    const onClick = (event: MouseEvent) => { const link = (event.target as Element | null)?.closest?.('a[href]'); if (link && !link.getAttribute('href')!.startsWith('#')) followedLink = true; };
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick, true);
      if (!closedByBack && !followedLink && window.location.href === href && (window.history.state as Record<string, unknown> | null)?.[KEY] === id) backOnce();
    };
  }, [open]);
}
