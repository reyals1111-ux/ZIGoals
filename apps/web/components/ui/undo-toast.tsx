'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';

/**
 * One toast for every reversible action (Session AA-Cloud): "Water logged · Undo". A single toast at a time, announced
 * politely, never stealing focus; it stays 8 s, and as long as the pointer or focus is on it. Undo runs the action's own
 * reverse once and then says what happened. Motion: a short fade, none under reduced motion or Motion Off (CSS).
 */
export type UndoToast = {message: string; undo?: () => Promise<unknown> | unknown; undone?: string;
  /** Session AG Polish 2: a link after the message (the Checklist's quick add: "Edit on Habits"). */
  link?: {href: string; label: string}};
/** Session AG Polish 2: an Undo that knows best what it did resolves to `{undone}`, said instead of the toast's own words. */
export type UndoResult = {undone: string};
const saidBy = (out: unknown): string | null => out && typeof out === 'object' && typeof (out as UndoResult).undone === 'string' ? (out as UndoResult).undone : null;
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

/**
 * Session AG Polish 2 (owner Part 7): a moment that must not show an Undo (the Checklist's day celebration) holds the toast:
 * it is hidden and its time stands still until the hold is released, then it shows again for the time it had left.
 */
let holds = 0;
const holdListeners = new Set<() => void>();
export function holdToast(): () => void {
  holds++; for (const l of holdListeners) l();
  let released = false;
  return () => { if (released) return; released = true; holds = Math.max(0, holds - 1); for (const l of holdListeners) l(); };
}
const subscribeHold = (l: () => void) => { holdListeners.add(l); return () => { holdListeners.delete(l); }; };
const TOAST_MS = 8000;

/**
 * Session AF (L3b): a full-screen layer drawn in the browser's top layer (the Checklist, a modal dialog) leaves everything
 * outside it inert, so while one is open it lends the toast a place inside itself: the one toast region moves there (a
 * portal) and returns when the layer closes. Layers stack (the Checklist's day celebration over the Checklist): the
 * topmost open one holds the toast, so its Undo stays in reach. Every other page keeps the region where the shell mounts it.
 */
const layers: HTMLElement[] = [];
let layer: HTMLElement | null = null;
const layerListeners = new Set<() => void>();
const publishLayer = () => { const top = layers.at(-1) ?? null; if (top === layer) return; layer = top; for (const l of layerListeners) l(); };
/** Lends the toast a place inside `el` until the returned function is called. */
export function pushToastLayer(el: HTMLElement): () => void {
  layers.push(el); publishLayer();
  return () => { const at = layers.lastIndexOf(el); if (at >= 0) layers.splice(at, 1); publishLayer(); };
}
const subscribeLayer = (l: () => void) => { layerListeners.add(l); return () => { layerListeners.delete(l); }; };

/** Mounted once by the shell. */
export function UndoToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null);
  const target = useSyncExternalStore(subscribeLayer, () => layer, () => null);
  const hidden = useSyncExternalStore(subscribeHold, () => holds > 0, () => false);
  const [busy, setBusy] = useState(false), [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined), left = useRef<{id: number; ms: number}>({id: 0, ms: TOAST_MS});
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!toast || held || busy || hidden) return;
    const id = toast.id;
    // (A new toast has its full time; one shown again after a hold has what it had left; after a pointer or focus rests on
    // it, its full time again, as before.)
    if (left.current.id !== id) left.current = {id, ms: TOAST_MS};
    const start = performance.now(), ms = left.current.ms;
    timer.current = window.setTimeout(() => hideToast(id), ms);
    return () => { window.clearTimeout(timer.current); if (left.current.id === id) left.current = {id, ms: holds > 0 ? Math.max(1200, ms - (performance.now() - start)) : TOAST_MS}; };
  }, [toast, held, busy, hidden]);
  const undo = useCallback(async () => {
    if (!toast?.undo) return;
    setBusy(true);
    try {
      const out = await toast.undo();
      showToast({message: saidBy(out) ?? toast.undone ?? 'Undone.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? `Could not undo: ${e.message}` : 'Could not undo this change.'});
    } finally {
      setBusy(false);
    }
  }, [toast]);
  const region = <div className="aa-toast-region" role="status" aria-live="polite">
    {toast && !hidden && <div className="aa-toast" key={toast.id} onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span>{toast.message}{toast.link && <> · <Link className="aa-toast-link" href={toast.link.href} onClick={() => hideToast(toast.id)}>{toast.link.label}</Link></>}</span>
      {toast.undo && <button type="button" className="aa-toast-undo" disabled={busy} onClick={() => void undo()}>Undo</button>}
      <button type="button" className="aa-toast-close" aria-label="Close message" onClick={() => hideToast(toast.id)}>×</button>
    </div>}
  </div>;
  return target ? createPortal(region, target) : region;
}
