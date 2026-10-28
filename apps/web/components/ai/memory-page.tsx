'use client';
import {Suspense, lazy} from 'react';
import {LoadBoundary} from '../load-boundary';
import './ai.css';

const AiNotes = lazy(() => import('./ai-notes'));
/** Session AI (feature 3): the page's body — the same notes panel as Settings, with pause and export, on its own page. */
export function MemoryPageClient() {
  return <section className="panel zigi-memory-page" aria-label="Your notes for ZIGi">
    <LoadBoundary quiet><Suspense fallback={<p className="fine">Reading your notes…</p>}><AiNotes/></Suspense></LoadBoundary>
  </section>;
}
