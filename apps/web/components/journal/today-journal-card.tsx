'use client';
import {Suspense, lazy} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';

const Body = lazy(() => import('./journal-compose').then(m => ({default: () => <m.JournalCompose compact/>})));
/** Session AI (feature 6): Today's journal card, one DOM root; the body loads after Today's first paint. */
export function TodayJournalCard(layout: Partial<LayoutAttrs>) {
  return <section {...layout} className="panel today-journal-card" aria-labelledby="today-journal-title">
    <p className="eyebrow">JOURNAL · ENERGY</p><h3 id="today-journal-title">How was today?</h3>
    <LoadBoundary quiet><Suspense fallback={<p className="fine">Loading…</p>}><Body/></Suspense></LoadBoundary>
  </section>;
}
export default TodayJournalCard;
