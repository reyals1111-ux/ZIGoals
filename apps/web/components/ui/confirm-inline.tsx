'use client';
import {useEffect, useId, useRef, type ReactNode} from 'react';
import './confirm-inline.css';

/**
 * Session AH Part 3 (DS5, the one rule: every destructive action confirms or gives a labelled Undo). The confirmation
 * opens in place, right where the button is (VA6), never as a message thousands of pixels away: a small alert dialog
 * with what will happen, the action named on its button, and a way back. Focus moves to "Cancel" (the safe choice);
 * Escape or Cancel closes it and returns focus to the button that opened it.
 */
export function ConfirmInline({title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, busy = false, tone = 'danger'}: {
  title: string; children?: ReactNode; confirmLabel: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean; tone?: 'danger' | 'neutral';
}) {
  const titleId = useId(), bodyId = useId(), root = useRef<HTMLElement>(null), opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.querySelector<HTMLButtonElement>('button[data-confirm-cancel]')?.focus({preventScroll: true});
    root.current?.scrollIntoView({block: 'nearest'});
  }, []);
  const cancel = () => { onCancel(); const back = opener.current; if (back?.isConnected) requestAnimationFrame(() => back.focus()); };
  return <section ref={root} role="alertdialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={children ? bodyId : undefined} className="confirm-inline" data-tone={tone}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    <h3 id={titleId}>{title}</h3>
    {children && <div id={bodyId} className="confirm-inline-body">{children}</div>}
    <div className="confirm-inline-actions">
      <button type="button" className="primary" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
      <button type="button" className="secondary" data-confirm-cancel onClick={cancel}>{cancelLabel}</button>
    </div>
  </section>;
}
