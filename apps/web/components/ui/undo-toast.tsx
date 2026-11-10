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

/**
 * Release review AL (RR-10): on a phone a toast never covers the field the person is typing in, and it leaves once they
 * move on. While a text field outside the toast has the focus and the toast's place would cover it (NOVA's message box,
 * Quick add's line), the toast sits just above that field (below it when there is no room above); typing in a field after
 * the toast's first moments ("moved on": the next Quick add line, the next question) closes it. The Checklist keeps its
 * own reserved dock (its toast slot never covers its fields), so it is left as it is.
 */
const PHONE = '(max-width: 767.98px), (pointer: coarse) and (max-height: 500px)';
const KEEPS_PLACE = '.checklist-toast-slot';
/** Typing this soon after a toast shows is still the action that showed it (a field refocused after Save). */
export const MOVED_ON_AFTER_MS = 1500;
const NOT_TEXT = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);
const isTextField = (el: EventTarget | Element | null): el is HTMLElement => el instanceof HTMLElement && (el.isContentEditable || el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !NOT_TEXT.has(el.type)));
/**
 * Where the region's top goes (viewport px) so it clears `field`: just above it, or just below it when there is no room
 * above; null when it already clears it. Pure, for tests.
 */
export function clearOfField(region: {top: number; bottom: number; left: number; right: number; height: number}, field: {top: number; bottom: number; left: number; right: number}, viewportHeight: number, gap = 8): number | null {
  if (!region.height || region.bottom <= field.top || region.top >= field.bottom || region.right <= field.left || region.left >= field.right) return null;
  return field.top - region.height - gap >= gap ? Math.round(field.top - gap - region.height) : Math.round(Math.min(field.bottom + gap, viewportHeight - region.height - gap));
}
/**
 * Release review A10 (A10-7): RR-10 kept the toast off a focused field only; at 390 it still sat on the next card in Quick
 * add and on NOVA's Drink water row. On a phone the toast now has room of its own while it shows:
 * - over a sheet that scrolls (Quick add, NOVA's sheets: the layer the toast is lent, or any scroll container whose
 *   bottom edge is on screen under it), that container's scroll area ends just above the toast: a transparent strip at
 *   its bottom (its bottom border, so its box and background stay as they were) is the toast's place, and nothing in
 *   the sheet is ever under it. The content does not move under the finger; what no longer fits scrolls.
 * - over the page, the page gets the same room at its end (the last row can always scroll clear), and when the control
 *   that showed the toast (the one just pressed) is under it, the toast sits just above that control instead.
 * A focused text field keeps RR-10's rule first. The Checklist's own toast slot is left as it is; a computer is unchanged.
 */
const gapPx = 8;
/** The bottom border (px) that ends `container`'s scroll area above the toast; null when the toast is not over its lower edge. Pure, for tests. */
export function stripHeight(container: {top: number; bottom: number}, toast: {top: number; bottom: number; height: number}, viewportHeight: number, borderBottom = 0, gap = gapPx): number | null {
  if (!toast.height || container.top > toast.top - gap || container.bottom < toast.bottom || container.bottom > viewportHeight + 1) return null;
  const need = Math.ceil(container.bottom - (toast.top - gap));
  return need > borderBottom ? need : null;
}
const CONTROL = 'button, a[href], input, select, textarea, summary, [role="button"], [role="switch"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
/** The scroll container (not the page) whose content is under the toast. */
function scrollerUnder(region: HTMLElement, box: DOMRect): HTMLElement | null {
  if (typeof document.elementsFromPoint !== 'function') return null;
  const x = box.left + box.width / 2;
  for (const y of [box.top + 1, box.top + box.height / 2, box.bottom - 1]) {
    const hit = document.elementsFromPoint(x, y).find(e => !region.contains(e));
    for (let el = hit instanceof HTMLElement ? hit : null; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return el;
    }
  }
  return null;
}
/** The last control pressed, so the page can keep the toast off the one that showed it. */
let lastPress: {el: Element; at: number} | null = null;
const PRESSED_WITHIN_MS = 3000;
function useKeepClear(regionRef: {readonly current: HTMLDivElement | null}, showing: boolean, newest: number, place_: unknown) {
  useEffect(() => {
    const press = (event: Event) => { if (event.target instanceof Element) lastPress = {el: event.target, at: performance.now()}; };
    document.addEventListener('pointerdown', press, true);
    return () => document.removeEventListener('pointerdown', press, true);
  }, []);
  useEffect(() => {
    const region = regionRef.current;
    if (!region || !showing || region.closest(KEEPS_PLACE) || typeof window.matchMedia !== 'function') return;
    const phone = window.matchMedia(PHONE), shownAt = performance.now();
    const pressed = lastPress && shownAt - lastPress.at <= PRESSED_WITHIN_MS ? lastPress.el.closest(CONTROL) : null;
    let frame = 0, strip: {el: HTMLElement; width: string; style: string; color: string} | null = null, page: string | null = null;
    const reset = () => {
      region.style.removeProperty('bottom'); delete region.dataset.clearOf;
      if (strip) {
        const {el, width, style, color} = strip, top = el.scrollTop;
        el.style.borderBottomWidth = width; el.style.borderBottomStyle = style; el.style.borderBottomColor = color; delete el.dataset.toastRoom;
        el.scrollTop = top; strip = null;
      }
      if (page !== null) { document.body.style.paddingBottom = page; delete document.body.dataset.toastRoom; page = null; }
    };
    const moveTo = (top: number, why: string) => {
      // Moved by its own `bottom`, measured from where it sits now, so a sheet that holds the region keeps holding it.
      const box = region.getBoundingClientRect(), bottom = parseFloat(getComputedStyle(region).bottom);
      if (!Number.isFinite(bottom)) return false;
      region.style.bottom = `${Math.round(bottom + box.top - top)}px`;
      region.dataset.clearOf = why;
      return true;
    };
    const place = () => {
      // Placed again (a focus change, a resize): the sheet keeps the scroll position it had with the strip.
      const kept = strip ? {el: strip.el, top: strip.el.scrollTop} : null;
      reset();
      if (!phone.matches) return;
      const field = document.activeElement;
      // RR-10: a focused text field outside the toast comes first.
      if (isTextField(field) && !region.contains(field)) {
        const top = clearOfField(region.getBoundingClientRect(), field.getBoundingClientRect(), window.innerHeight);
        if (top !== null && moveTo(top, 'field')) return;
      }
      const box = region.getBoundingClientRect();
      if (!box.height) return;
      const scroller = scrollerUnder(region, box);
      if (scroller) {
        const before = scroller.getBoundingClientRect(), cs = getComputedStyle(scroller), own = parseFloat(cs.borderBottomWidth) || 0;
        const height = stripHeight(before, box, window.innerHeight, own);
        if (height === null) return;
        const top = kept?.el === scroller ? kept.top : scroller.scrollTop;
        strip = {el: scroller, width: scroller.style.borderBottomWidth, style: scroller.style.borderBottomStyle, color: scroller.style.borderBottomColor};
        scroller.style.borderBottomWidth = `${height}px`; scroller.style.borderBottomStyle = 'solid'; scroller.style.borderBottomColor = 'transparent';
        scroller.dataset.toastRoom = 'strip'; scroller.scrollTop = top;
        // A sheet that grew off the screen, or a toast placed by the sheet's own box, keeps things as they were.
        const after = scroller.getBoundingClientRect(), moved = region.getBoundingClientRect();
        if (after.top < 0 || after.bottom > window.innerHeight + 1 || Math.abs(moved.top - box.top) > 1) reset();
        return;
      }
      // The page: room at its end, and the toast off the control just pressed.
      const room = Math.ceil(window.innerHeight - (box.top - gapPx)), pad = parseFloat(getComputedStyle(document.body).paddingBottom);
      if (room > 0 && Number.isFinite(pad)) { page = document.body.style.paddingBottom; document.body.style.paddingBottom = `${pad + room}px`; document.body.dataset.toastRoom = 'page'; }
      if (pressed instanceof HTMLElement && pressed.isConnected && !region.contains(pressed)) {
        const top = clearOfField(box, pressed.getBoundingClientRect(), window.innerHeight);
        if (top !== null) moveTo(top, 'control');
      }
    };
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    const typed = (event: Event) => {
      if (!phone.matches || !isTextField(event.target) || region.contains(event.target as Node)) return;
      if (performance.now() - shownAt < MOVED_ON_AFTER_MS) { later(); return; }
      for (const toast of shownToasts()) hideToast(toast.id);
    };
    place();
    // The toast's own size (a longer message, the Undo turning busy) changes the room it needs.
    const sized = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
    sized?.observe(region);
    document.addEventListener('focusin', later, true); document.addEventListener('focusout', later, true); document.addEventListener('input', typed, true);
    window.addEventListener('resize', later); window.visualViewport?.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame); sized?.disconnect(); reset();
      document.removeEventListener('focusin', later, true); document.removeEventListener('focusout', later, true); document.removeEventListener('input', typed, true);
      window.removeEventListener('resize', later); window.visualViewport?.removeEventListener('resize', later);
    };
  }, [regionRef, showing, newest, place_]);
}

const NONE: readonly Shown[] = [];
/** Mounted once by the shell. */
export function UndoToastHost() {
  const toasts = useSyncExternalStore(subscribe, () => shown, () => NONE);
  const target = useSyncExternalStore(subscribeLayer, () => layer, () => null);
  const hidden = useSyncExternalStore(subscribeHold, () => holds > 0, () => false);
  const regionRef = useRef<HTMLDivElement>(null);
  // `target`: the region moves into a lent layer (a new element), so its place is measured again there.
  useKeepClear(regionRef, !hidden && toasts.length > 0, toasts.at(-1)?.id ?? 0, target);
  const region = <div ref={regionRef} className="aa-toast-region" role="status" aria-live="polite">
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
