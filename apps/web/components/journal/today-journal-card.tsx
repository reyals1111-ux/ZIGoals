'use client';
import {Suspense, lazy} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';

const Body = lazy(() => import('./journal-compose').then(m => ({default: () => <m.JournalCompose compact/>})));
// Session AV (owner follow-up 1, F-JOURNAL-TODAY): today's entries and On this day, in one line of counts.
const Line = lazy(() => import('./today-journal-line'));
// Session AV lane 2 (journal; LEDGER #176): the daily affirmation, only when switched on (nothing otherwise).
const Affirmation = lazy(() => import('./today-affirmation'));
// Session AV lane 2 (bodymind-r2; LEDGER #230): a small daily challenge beside it, only when switched on (nothing otherwise).
const Challenge = lazy(() => import('./today-challenge'));
// Session AV lane 2 (r3-notes; LEDGER #277): a quote of the day from the Stoic writers, only when switched on (nothing otherwise).
const Quote = lazy(() => import('./today-quote'));
// Session AV lane 2 (r3-notes; LEDGER #279): a letter to open later, only on the week it opens (nothing otherwise).
const Letter = lazy(() => import('./today-letter'));
/** Session AI (feature 6): Today's journal card, one DOM root; the body loads after Today's first paint. */
export function TodayJournalCard(layout: Partial<LayoutAttrs>) {
  return <section {...layout} className="panel today-journal-card" aria-labelledby="today-journal-title">
    <p className="eyebrow">JOURNAL · ENERGY</p><h3 id="today-journal-title">How was today?</h3>
    <LoadBoundary quiet><Suspense fallback={<Skeleton label="Loading…" lines={2}/>}><Body/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><Line/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><Affirmation/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><Challenge/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><Quote/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><Letter/></Suspense></LoadBoundary>
  </section>;
}
export default TodayJournalCard;
