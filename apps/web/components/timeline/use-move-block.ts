'use client';
import {useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {SNAP, snapMinutes} from '../../lib/timeline/store';

/**
 * Moving a block (Session AF, L5b; P9.2, ADR-028 D2 (a), H76): a drag on the block's handle with pointer capture (mouse,
 * pen or touch: the handle takes `touch-action: none`), on 15-minute steps, with the new time shown live; and the same
 * move from the keyboard — ↑ / ↓ move it by 15 minutes, Enter saves, Escape (or leaving the handle) puts it back. Every
 * move also works without a drag through the time picker (WCAG 2.5.7). Nothing is written until the move ends on a new
 * time.
 */
export const PX_PER_STEP = 12;
export function useMoveBlock({start, onCommit}: {start: number; onCommit: (minutes: number) => void}) {
  const [pending, setPending] = useState<number | null>(null);
  const drag = useRef<{y0: number; base: number; id: number} | null>(null);
  const at = (base: number, dy: number) => snapMinutes(base + Math.round(dy / PX_PER_STEP) * SNAP);
  const handle = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the drag still follows inside the handle */ }
      drag.current = {y0: e.clientY, base: start, id: e.pointerId}; setPending(start);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) { const d = drag.current; if (d && d.id === e.pointerId) setPending(at(d.base, e.clientY - d.y0)); },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const d = drag.current; if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const next = at(d.base, e.clientY - d.y0); setPending(null);
      if (next !== d.base) onCommit(next);
    },
    onPointerCancel() { drag.current = null; setPending(null); },
    onKeyDown(e: KeyboardEvent<HTMLElement>) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setPending(p => snapMinutes((p ?? start) + (e.key === 'ArrowUp' ? -SNAP : SNAP))); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const next = pending; setPending(null); if (next !== null && next !== start) onCommit(next); }
      else if (e.key === 'Escape') { if (pending !== null) { e.preventDefault(); setPending(null); } }
    },
    onBlur() { if (!drag.current) setPending(null); },
  };
  const offset = pending === null ? 0 : (pending - start) / SNAP * PX_PER_STEP;
  return {pending, offset, handle};
}
