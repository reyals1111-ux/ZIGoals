'use client';
import {Suspense, lazy} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';

const TodayTimelineBody = lazy(() => import('./today-timeline-body'));
/**
 * Today's Day Timeline card (Session AF, L5b; P9.2, ADR-028 H29), exported for the lead to mount (a For you card or the
 * `timeline` id of `zigoals:today-cards:v1`). One DOM root; its body — the time now and the next three blocks, with the
 * door to /app/timeline — loads as its own chunk after Today's first paint and reads no other feature's source (the
 * Checklist's dots stay on the timeline page). One short block on a phone; viewing writes nothing.
 */
export function TodayTimelineCard(layout: Partial<LayoutAttrs>) {
  return <section {...layout} className="panel today-timeline-card" aria-labelledby="today-timeline-title">
    <LoadBoundary quiet><Suspense fallback={<p className="eyebrow" id="today-timeline-title">Your day</p>}><TodayTimelineBody /></Suspense></LoadBoundary>
  </section>;
}
export default TodayTimelineCard;
