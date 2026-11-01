'use client';
import {Suspense, lazy} from 'react';
import './notes.css';
import {LoadBoundary} from '../load-boundary';

const CaptureBox = lazy(() => import('./capture-box'));

/**
 * Session AK (B1): "Note" in Quick add — a thought goes to the notes inbox without leaving the page. Session AK G2
 * (RELEASE_REVIEW_2 R2-13): the "Note" row is one of the sheet's own rows (components/quick-add.tsx, same look and
 * alignment, in frequency order); a tap loads this and the capture box takes the row's place, with a way back to the row.
 */
export default function QuickCapture({onClose}: {onClose: () => void}) {
  // A plain wrapper, not a navigation landmark named "Capture a note" (lane NV).
  return <div className="quick-capture quick-capture-box">
    <LoadBoundary label="Capture a note"><Suspense fallback={<p className="fine">Opening…</p>}><CaptureBox compact autoFocus heading="Capture a note"/></Suspense></LoadBoundary>
    <button type="button" className="quiet" onClick={onClose}>Close the note box</button>
  </div>;
}
