'use client';
import {useState, type PointerEvent} from 'react';

/** A press that moves this little is a tap, not a drag (Edit path's rule since P7.4). */
export const DRAG_SLOP_PX = 8;
export type RowDrag = {id: string; dy: number; startY: number};

/**
 * Session AL fifth pass (LS-H23): Edit path's pointer drag, shared with the List view's rows. A press on the handle
 * captures the pointer, the row follows it (`drag.dy`), and the release calls `onDrop(id, clientY)` when it moved more
 * than the slop. `mouseOnly` leaves touch alone (the List's rows swipe and scroll on a phone, where Move up / Move down
 * in the row's More stay the way to reorder); a pen and a mouse drag.
 */
export function useRowDrag(onDrop: (id: string, y: number) => void, {mouseOnly = false}: {mouseOnly?: boolean} = {}) {
  const [drag, setDrag] = useState<RowDrag | null>(null);
  const bind = (id: string) => ({
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0 || (mouseOnly && e.pointerType === 'touch')) return;
      // (A mouse press on words would start selecting them; the row is what moves.)
      if (mouseOnly) e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the drag still follows while over the row */ }
      setDrag({id, dy: 0, startY: e.clientY});
    },
    onPointerMove(e: PointerEvent<HTMLElement>) { setDrag(d => d && d.id === id ? {...d, dy: e.clientY - d.startY} : d); },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      if (!drag || drag.id !== id) return;
      const dy = e.clientY - drag.startY;
      setDrag(null);
      if (Math.abs(dy) > DRAG_SLOP_PX) onDrop(id, e.clientY);
    },
    onPointerCancel() { setDrag(null); },
  });
  return {drag, bind};
}

/**
 * Where a drop at `y` lands among `rows` (the other rows, in the order shown): before the first row whose middle is below
 * the pointer, else after the last. The dragged row itself is never among them (it moves with the pointer, and was
 * sometimes "found" under it: P-LS-58).
 */
export function dropSlot(rows: readonly HTMLElement[], y: number): {index: number; after: boolean} | null {
  if (!rows.length) return null;
  const at = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
  return at >= 0 ? {index: at, after: false} : {index: rows.length - 1, after: true};
}
