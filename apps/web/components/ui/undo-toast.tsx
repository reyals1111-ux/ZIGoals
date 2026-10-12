'use client';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';

/**
 * One toast for every reversible action (Session AA-Cloud): "Water logged · Undo". A single toast at a time, announced
 * politely, never stealing focus; it stays 8 s, and as long as the pointer or focus is on it. Undo runs the action's own
 * reverse once and then says what happened. Motion: a short fade, none under reduced motion or Motion Off (CSS).
 */
export type UndoToast = {message: string; undo?: () => Promise<unknown> | unknown; undone?: string};
type Shown = UndoToast & {id: number};
let current: Shown | null = null, seq = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

/** Shows a toast (replacing any other). Returns its id. */
export function showToast(toast: UndoToast): number {
  current = {...toast, id: ++seq};
  emit();
  return current.id;
}
/** Hides the toast with this id, if it is still the one shown. */
export function hideToast(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Mounted once by the shell. */
export function UndoToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null);
  const [busy, setBusy] = useState(false), [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!toast || held || busy) return;
    const id = toast.id;
    timer.current = window.setTimeout(() => hideToast(id), 8000);
    return () => window.clearTimeout(timer.current);
  }, [toast, held, busy]);
  const undo = useCallback(async () => {
    if (!toast?.undo) return;
    setBusy(true);
    try {
      await toast.undo();
      showToast({message: toast.undone ?? 'Undone.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? `Could not undo: ${e.message}` : 'Could not undo this change.'});
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return <div className="aa-toast-region" role="status" aria-live="polite">
    {toast && <div className="aa-toast" key={toast.id} onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span>{toast.message}</span>
      {toast.undo && <button type="button" className="aa-toast-undo" disabled={busy} onClick={() => void undo()}>Undo</button>}
      <button type="button" className="aa-toast-close" aria-label="Close message" onClick={() => hideToast(toast.id)}>×</button>
    </div>}
  </div>;
}
