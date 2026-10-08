"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A form as a bottom sheet on a phone (Session I, Part 9, the #52 sheet pattern): a modal dialog that rises from the
 * bottom edge with a grabber (drag down, Escape, Close or the backdrop close it), its own scroll, and the primary
 * action kept in reach. Render it only on a phone; elsewhere the form stays in the page as before. Focus starts in the
 * form and returns to where it was when the sheet closes.
 */
export function PhoneFormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    // Focus goes to the form: a field marked data-sheet-focus, else the first enabled field (not the Close button). It
    // moves once the sheet has painted, so the tap paints the sheet first (Session X P2.3: the focus forced a layout
    // inside the tap; Staking's Track Wallet took 200–256 ms to paint at 4x CPU).
    let timer = 0;
    const focus = requestAnimationFrame(() => { timer = window.setTimeout(() => (dialog?.querySelector<HTMLElement>("[data-sheet-focus]") ?? dialog?.querySelector<HTMLElement>(".phone-form-sheet-body :is(input:not([type=hidden]), select, textarea):not(:disabled)"))?.focus({ preventScroll: true })); });
    const backdrop = (event: MouseEvent) => { if (event.target === dialog) close.current(); };
    dialog?.addEventListener("click", backdrop);
    return () => { cancelAnimationFrame(focus); window.clearTimeout(timer); dialog?.removeEventListener("click", backdrop); dialog?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="phone-form-sheet" aria-label={title} onCancel={event => { event.preventDefault(); close.current(); }}>
    <header className="phone-form-sheet-head"><h2>{title}</h2><button type="button" className="secondary icon-button" aria-label={`Close ${title}`} onClick={() => close.current()}>×</button></header>
    <div className="phone-form-sheet-body">{children}</div>
  </dialog>;
}
