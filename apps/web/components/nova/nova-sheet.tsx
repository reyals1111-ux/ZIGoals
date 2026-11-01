'use client';
import {useEffect, useId, useRef, type ReactNode} from 'react';
import {pushToastLayer} from '../ui/undo-toast';
import {NovaIcon} from './icons';

/**
 * A glass sheet over NOVA (a modal dialog): Escape or Close shuts it and the focus goes back to what opened it. While it
 * is open, the app's Undo toast shows inside it (above the modal layer). `place` sets where it sits: beside the right
 * edge, at the bottom (phones), or centred.
 */
export function NovaSheet({title, eyebrow, onClose, place = 'center', wide = false, children}: {title: string; eyebrow?: string; onClose: () => void; place?: 'center' | 'right' | 'bottom'; wide?: boolean; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null), id = useId(), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current, back = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const layer = pushToastLayer(dialog);
    return () => { layer(); if (dialog.open) dialog.close(); requestAnimationFrame(() => back?.isConnected && back.focus({preventScroll: true})); };
  }, []);
  return <dialog ref={ref} className="nova-sheet" data-place={place} data-wide={wide || undefined} aria-labelledby={`${id}-t`}
    onCancel={e => { e.preventDefault(); close.current(); }} onClick={e => { if (e.target === e.currentTarget) close.current(); }}>
    <div className="nova-sheet-body">
      <header className="nova-sheet-head">
        <div>{eyebrow && <p className="nova-eyebrow">{eyebrow}</p>}<h2 id={`${id}-t`}>{title}</h2></div>
        <button type="button" className="nova-icon-btn" onClick={() => close.current()} aria-label={`Close ${title}`}><NovaIcon name="close"/></button>
      </header>
      {children}
    </div>
  </dialog>;
}
