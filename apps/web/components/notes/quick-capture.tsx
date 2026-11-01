'use client';
import {Suspense, lazy, useState} from 'react';
import {AppIcon} from '../app-icon';
import './notes.css';
import {LoadBoundary} from '../load-boundary';

const CaptureBox = lazy(() => import('./capture-box'));

/**
 * Session AK (B1): "Note" in Quick add — one row like the sheet's others; a tap opens the capture box in place (its code
 * loads then), so a thought goes to the notes inbox without leaving the page. Mounted as one lazy element in
 * components/quick-add.tsx.
 */
export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  return <nav aria-label="Capture a note" className="quick-capture">
    {open ? <div className="quick-capture-box">
      <LoadBoundary label="Capture a note"><Suspense fallback={<p className="fine">Opening…</p>}><CaptureBox compact autoFocus heading="Capture a note"/></Suspense></LoadBoundary>
      <button type="button" className="quiet" onClick={() => setOpen(false)}>Close the note box</button>
    </div> : <button type="button" className="quick-action" aria-expanded={false} onClick={() => setOpen(true)}>
      <span className="icon-medallion"><AppIcon name="checklist" luminous/></span><span><strong>Note</strong><small>Capture a thought, a photo or your voice; file it later.</small></span><span aria-hidden="true">＋</span>
    </button>}
  </nav>;
}
