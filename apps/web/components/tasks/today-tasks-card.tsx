'use client';
import {Suspense, lazy} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';

const Body = lazy(() => import('./tasks-body'));
/** Session AI (tasks): Today's tasks card, one DOM root; the body loads after Today's first paint. */
export function TodayTasksCard(layout: Partial<LayoutAttrs>) {
  return <section {...layout} id="tasks" className="panel today-tasks-card" aria-labelledby="today-tasks-title">
    <p className="eyebrow">TASKS</p><h3 id="today-tasks-title">To do</h3>
    <LoadBoundary quiet><Suspense fallback={<p className="fine">Loading…</p>}><Body/></Suspense></LoadBoundary>
  </section>;
}
export default TodayTasksCard;
