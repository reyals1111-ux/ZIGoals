'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {zigiSignals} from '../zigi/bus';
import {dismissToast, enqueueToast, TOAST_CAP, toastMs} from '../../lib/primitives/toast-queue';

/**
 * One toast for every reversible action (Session AA-Cloud): "Water logged · Undo". Announced politely, never stealing
 * focus; it stays 8 s, and as long as the pointer or focus is on it. Undo runs the action's own reverse once and then
 * says what happened. Motion: a short fade, none under reduced motion or Motion Off (CSS).
 *
 * Session AL (3e): the app's ONE toast system (docs/review/session-al/PRIMITIVES.md).
 * - showUndo({message, restore}) is how an action offers Undo: `restore` must put the STORE record back (through the
 *   store's own update, reading the latest record), never only the screen. changeWithUndo / removeWithUndo
 *   (components/ui/remove-with-undo.ts) build that restore for a store save.
 * - showStatus(message) says something without an Undo; `tone: 'error'` is announced at once (role="alert").
 * - A queue without pile-up (lib/primitives/toast-queue.ts): the newest replaces; the same words are never stacked.
 * - The keyboard: Undo and Close are buttons in the tab order; Escape, with the focus on the toast, closes it and puts
 *   the focus back where it was.
 * showToast stays for its existing callers, unchanged.
 */
export type UndoToast = {message: string;
  /** @deprecated for new code: use showUndo({message, restore}). Kept for the existing callers. */
  undo?: () => Promise<unknown> | unknown; undone?: string;
  /** Session AH Part 18: what the Undo button says to a screen reader ("Undo the Push-ups count"); "Undo" when unset. */
  undoLabel?: string;
  /** Session AG Polish 2: a link after the message (the Checklist's quick add: "Edit on Habits"). */
  link?: {href: string; label: string};
  /** Session AL: time on screen in ms (8 s by default; 5 s to 60 s). */
  timeoutMs?: number;
  /** Session AL: 'error' is announced at once (role="alert"); 'status' (default) politely. */
  tone?: 'status' | 'error'};
/** Session AG Polish 2: an Undo that knows best what it did resolves to `{undone}`, said instead of the toast's own words. */
export type UndoResult = {undone: string};
/** Session AL: what showUndo takes. `restore` puts the store record back; it may resolve to {undone} to say what it did. */
export type UndoOffer = {message: string; restore: () => Promise<unknown> | unknown;
  undone?: string; undoLabel?: string; link?: {href: string; label: string}; timeoutMs?: number};
const saidBy = (out: unknown): string | null => out && typeof out === 'object' && typeof (out as UndoResult).undone === 'string' ? (out as UndoResult).undone : null;
type Shown = UndoToast & {id: number};
let shown: Shown[] = [], seq = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
/** Time left for a toast hidden by a hold (holdToast), by id. */
const remaining = new Map<number, number>();

/** The id of the latest toast shown (0 before any): a caller can tell whether its action already said something. */
export function lastToastId(): number { return seq; }
/** Shows a toast (the newest replaces; see the queue). Returns its id. */
export function showToast(toast: UndoToast): number {
  const next = {...toast, id: ++seq};
  const before = shown;
  shown = enqueueToast(shown, next, TOAST_CAP);
  for (const t of before) if (!shown.includes(t)) remaining.delete(t.id);
  emit();
  return next.id;
}
/** Session AL: offers Undo for an action. `restore` must put the store record back (see above). Returns the toast id. */
export function showUndo({message, restore, undone, undoLabel, link, timeoutMs}: UndoOffer): number {
  if (typeof restore !== 'function') throw new TypeError('showUndo needs a restore() that puts the record back.');
  return showToast({message, undo: restore, undone, undoLabel, link, timeoutMs});
}
/** Session AL: says something without an Undo ("Day saved.", "Could not save: …"). Returns the toast id. */
export function showStatus(message: string, {link, timeoutMs, tone}: {link?: UndoToast['link']; timeoutMs?: number; tone?: UndoToast['tone']} = {}): number {
  return showToast({message, link, timeoutMs, tone});
}
/** Hides the toast with this id, if it is still shown (the newest when no id is given). */
export function hideToast(id?: number) {
  const next = dismissToast(shown, id);
  if (next === shown) return;
  for (const t of shown) if (!next.includes(t)) remaining.delete(t.id);
  shown = next;
  emit();
}
/** Session AL: the toasts shown now, newest last (at most the queue's cap). For tests and the host. */
export function shownToasts(): readonly Shown[] { return shown; }
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

const NONE: readonly Shown[] = [];
/** Mounted once by the shell. */
export function UndoToastHost() {
  const toasts = useSyncExternalStore(subscribe, () => shown, () => NONE);
  const target = useSyncExternalStore(subscribeLayer, () => layer, () => null);
  const hidden = useSyncExternalStore(subscribeHold, () => holds > 0, () => false);
  const region = <div className="aa-toast-region" role="status" aria-live="polite">
    {!hidden && toasts.map(toast => <ToastItem key={toast.id} toast={toast}/>)}
  </div>;
  return target ? createPortal(region, target) : region;
}

function ToastItem({toast}: {toast: Shown}) {
  const [busy, setBusy] = useState(false), [held, setHeld] = useState(false);
  const back = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (held || busy) return;
    const id = toast.id, full = toastMs(toast.timeoutMs);
    // A new toast has its full time; one shown again after a hold has what it had left; after a pointer or focus rests
    // on it, its full time again, as before.
    const ms = remaining.get(id) ?? full, start = performance.now();
    const timer = window.setTimeout(() => hideToast(id), ms);
    return () => {
      window.clearTimeout(timer);
      if (holds > 0) remaining.set(id, Math.max(1200, ms - (performance.now() - start))); else remaining.delete(id);
    };
  }, [toast, held, busy]);
  const undo = useCallback(async () => {
    if (!toast.undo) return;
    setBusy(true);
    try {
      const out = await toast.undo();
      showToast({message: saidBy(out) ?? toast.undone ?? 'Undone.'});
      zigiSignals.emit('action_undone'); // Session AK Part 12: the undo applied (a Studio-4 reaction once its art lands)
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? `Could not undo: ${e.message}` : 'Could not undo this change.', tone: 'error'});
    } finally {
      setBusy(false);
    }
  }, [toast]);
  // Closing by the keyboard puts the focus back where it was before it came to the toast.
  const dismiss = useCallback(() => {
    const to = back.current;
    hideToast(toast.id);
    if (to?.isConnected) { try { to.focus({preventScroll: true}); } catch { /* gone */ } }
  }, [toast.id]);
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    setHeld(true);
    const from = e.relatedTarget;
    if (from instanceof HTMLElement && !e.currentTarget.contains(from)) back.current = from;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    // The toast's own Escape: it must not also close the dialog or the Checklist it sits in.
    e.preventDefault(); e.stopPropagation();
    dismiss();
  };
  return <div className="aa-toast" role={toast.tone === 'error' ? 'alert' : undefined} onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={onFocus} onBlur={() => setHeld(false)} onKeyDown={onKeyDown}>
    <span>{toast.message}{toast.link && <> · <Link className="aa-toast-link" href={toast.link.href} onClick={() => hideToast(toast.id)}>{toast.link.label}</Link></>}</span>
    {toast.undo && <button type="button" className="aa-toast-undo" aria-label={toast.undoLabel} disabled={busy} onClick={() => void undo()}>Undo</button>}
    <button type="button" className="aa-toast-close" aria-label="Close message" onClick={dismiss}>×</button>
  </div>;
}
