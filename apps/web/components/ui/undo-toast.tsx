'use client';
import {Suspense, lazy, useSyncExternalStore} from 'react';

/**
 * One toast for every reversible action (Session AA-Cloud): "Water logged · Undo". A single toast at a time, announced
 * politely, never stealing focus; it stays 8 s, and as long as the pointer or focus is on it. Undo runs the action's own
 * reverse once and then says what happened. Motion: a short fade, none under reduced motion or Motion Off (CSS).
 */
export type UndoToast = {message: string; undo?: () => Promise<unknown> | unknown; undone?: string};
export type Shown = UndoToast & {id: number};
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
// Weights: the toast itself loads with the first toast; the live region is there from the start, so it is announced.
const ToastView = lazy(() => import('./undo-toast-view'));

/** Mounted once by the shell. */
export function UndoToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null);
  return <div className="aa-toast-region" role="status" aria-live="polite">
    {toast && <Suspense fallback={<div className="aa-toast"><span>{toast.message}</span></div>}><ToastView key={toast.id} toast={toast} /></Suspense>}
  </div>;
}
