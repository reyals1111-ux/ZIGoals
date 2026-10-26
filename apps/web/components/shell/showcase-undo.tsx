'use client';
/* Full reload is intentional: dispose all store hooks when the Showcase generation changes. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import {useEffect} from 'react';
import {isShowcase, markShowcaseUndoOffered, readShowcaseUndo, undoShowcaseReset} from '../../lib/showcase';
import {showToast} from '../ui/undo-toast';

/**
 * Session AH Part 3 (DS4): right after a Showcase reset, the page that opens offers it back once — "Showcase reset to
 * fresh examples · Undo" — in the app's one toast. Undo selects the Showcase the reset replaced (with what was added to
 * it) and reloads; the offer is shown once, and the next load, reset or exit clears it (lib/showcase-storage.ts).
 */
export function ShowcaseUndoOffer() {
  useEffect(() => {
    try {
      const session = window.sessionStorage, undo = isShowcase() ? readShowcaseUndo(session) : null;
      if (!undo || undo.offered) return;
      markShowcaseUndoOffered(session);
      showToast({message: 'Showcase reset to fresh examples.', undone: 'Your earlier Showcase is back.', undo: () => { if (undoShowcaseReset(window.sessionStorage)) window.location.assign('/app'); else return {undone: 'Nothing to undo: the earlier Showcase is no longer in this tab.'}; }});
    } catch { /* No sessionStorage: nothing was kept to undo. */ }
  }, []);
  return null;
}
