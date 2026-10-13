'use client';
import {useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';

/**
 * Session AA-Local S5: swipe actions on phones, the owner's rules. Swipe RIGHT past the threshold completes (or checks
 * in) with a colourful nebula indicator and a short, reduced-motion-safe finish; swipe LEFT only REVEALS the actions
 * (edit, skip, delete) and never acts on its own; delete always goes through the page's own confirmation and Undo, and a
 * fast swipe can never delete. Horizontal intent locks only after 12 px of mostly-horizontal movement (so the page keeps
 * its vertical scroll), and a swipe that begins within 24 px of the left edge is left to the browser's back gesture.
 * Touch pointers only; a mouse or a keyboard uses the card's own buttons.
 *
 *   const swipe = useSwipeActions({onComplete: () => void checkIn(), actions: 3});
 *   <article {...swipe.handlers} style={swipe.style} data-swipe={swipe.state}>…<div className="swipe-actions">…</div></article>
 */
export const SWIPE_LOCK_PX = 12, SWIPE_EDGE_PX = 24, COMPLETE_SHARE = 0.4, REVEAL_PX = 168;
export type SwipeState = 'rest' | 'dragging' | 'revealed' | 'completing';
export function useSwipeActions({onComplete, enabled = true, revealWidth = REVEAL_PX}: {onComplete?: () => void; enabled?: boolean; revealWidth?: number}) {
  const [offset, setOffset] = useState(0), [state, setState] = useState<SwipeState>('rest');
  const drag = useRef<{id: number; x: number; y: number; locked: 'x' | 'y' | null; width: number; start: number} | null>(null), element = useRef<HTMLElement | null>(null);
  const reset = useCallback(() => { setOffset(0); setState('rest'); }, []);
  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || e.pointerType !== 'touch' || e.clientX < SWIPE_EDGE_PX) return;
    const target = e.target as HTMLElement; if (target.closest('button, a, input, select, textarea, summary, [role=button]')) return;
    element.current = e.currentTarget; drag.current = {id: e.pointerId, x: e.clientX, y: e.clientY, locked: null, width: e.currentTarget.getBoundingClientRect().width, start: Date.now()};
  }, [enabled]);
  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.locked) { if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return; d.locked = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'; if (d.locked === 'x') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ } } }
    if (d.locked !== 'x') return;
    const base = state === 'revealed' ? -revealWidth : 0, next = Math.max(-revealWidth - 24, Math.min(d.width * 0.6, base + dx));
    setOffset(next); setState('dragging');
  }, [state, revealWidth]);
  const finish = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null;
    if (d.locked !== 'x') { if (state === 'dragging') reset(); return; }
    const dx = e.clientX - d.x, wasRevealed = state === 'revealed';
    if (!wasRevealed && dx >= d.width * COMPLETE_SHARE && onComplete) { setState('completing'); setOffset(d.width); window.setTimeout(() => { onComplete(); reset(); }, 260); return; }
    if ((wasRevealed ? dx : dx) <= -revealWidth / 2 && !wasRevealed) { setState('revealed'); setOffset(-revealWidth); return; } // reveals only, never acts
    if (wasRevealed && dx > revealWidth / 2) { reset(); return; }
    if (wasRevealed) { setState('revealed'); setOffset(-revealWidth); return; }
    reset();
  }, [state, onComplete, reset, revealWidth]);
  useEffect(() => { if (state !== 'revealed') return; const close = (e: Event) => { if (element.current && !element.current.contains(e.target as Node)) reset(); }; document.addEventListener('pointerdown', close, true); return () => document.removeEventListener('pointerdown', close, true); }, [state, reset]);
  return {state, offset, close: reset, handlers: {onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish}, style: {'--swipe-x': `${offset}px`, '--swipe-share': String(Math.max(0, Math.min(1, offset / Math.max(1, (element.current?.getBoundingClientRect().width ?? 320) * COMPLETE_SHARE))))} as React.CSSProperties};
}
