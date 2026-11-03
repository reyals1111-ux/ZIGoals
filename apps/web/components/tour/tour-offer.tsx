'use client';
import {lazy, Suspense, useCallback, useRef, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import './tour.css';

/** The tour's own chunk: its stops, its device record and its sheet load on the first tap, never with the page. */
const AkTourSheet = lazy(() => import('./ak-tour-sheet'));

/**
 * Session AK (A19): "Take the 1-minute tour", in the What's new card and in Help. A plain button; the tour opens in place
 * under it (no dialog, nothing covers the page) and closes back to it. Nothing is read or written until it is pressed.
 */
export function TourOffer({className = 'secondary'}: {className?: string}) {
  const [open, setOpen] = useState(false), button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => button.current?.focus()); }, []);
  return <div className="tour-offer">
    <button ref={button} type="button" className={className} aria-expanded={open} onClick={() => setOpen(o => !o)}>Take the 1-minute tour</button>
    {open && <LoadBoundary quiet><Suspense fallback={<p className="fine" role="status">Opening the tour…</p>}><AkTourSheet onClose={close}/></Suspense></LoadBoundary>}
  </div>;
}
