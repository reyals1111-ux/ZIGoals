'use client';
import {useState} from 'react';
import {showToast, shownToasts} from '../ui/undo-toast';

/**
 * Friend-readiness (FR-S-11): a one-tap water button (Health's, the own drinks', Today's) still counts a second tap within
 * 350 ms as the same tap (Session AL, P-MO-97: a double click logged two), but no longer silently: the toast of the tap
 * that counted says so, with its own Undo kept ("… A tap right after it was counted once; tap again to add another.").
 * When the second tap comes before that toast shows, the note joins it as it shows.
 */
export const SAME_TAP_MS = 350;
export const SAME_TAP_NOTE = 'A tap right after it was counted once; tap again to add another.';
export type OneTap = {
  /** True when this tap counts; false for the same tap again (said on the counted tap's toast). */
  tap: (at: number) => boolean;
  /** The toast the counted tap showed (lib's `lastToastId()` right after it); adds the note when a second tap came first. */
  shown: (toastId: number) => void;
};
export function createOneTap(): OneTap {
  let last = Number.NEGATIVE_INFINITY, toast: number | null = null, repeated = false;
  const note = (id: number) => {
    const t = shownToasts().find(x => x.id === id);
    if (!t) return;
    toast = t.message.endsWith(SAME_TAP_NOTE) ? t.id : showToast({...t, message: `${t.message} ${SAME_TAP_NOTE}`});
  };
  return {
    tap(at) {
      if (at - last < SAME_TAP_MS) { if (toast !== null) note(toast); else repeated = true; return false; }
      last = at; toast = null; repeated = false; return true;
    },
    shown(toastId) { toast = toastId; if (repeated) { repeated = false; note(toastId); } },
  };
}
export function useOneTap(): OneTap { return useState(createOneTap)[0]; }
