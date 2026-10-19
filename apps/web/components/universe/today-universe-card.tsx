'use client';
import {Suspense, lazy} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';

const TodayUniverseBody = lazy(() => import('./today-universe-body'));
/**
 * Today's My Universe card (Session AF, L5b; P9.1, ADR-028 H29, H77, H79), exported for the lead to mount (a For you card
 * or the `universe` id of `zigoals:today-cards:v1`). One DOM root (a layout region moves and labels it), so Today's bundle
 * carries only this slot; the four small planets, the newest milestone and the door to Journey load as their own chunk
 * after Today's first paint. On a phone it is one short block. Works with Gamify off; viewing writes nothing.
 */
export function TodayUniverseCard(layout: Partial<LayoutAttrs>) {
  return <section {...layout} className="panel today-universe-card" aria-labelledby="today-universe-title">
    <LoadBoundary quiet><Suspense fallback={<p className="eyebrow" id="today-universe-title">My universe</p>}><TodayUniverseBody /></Suspense></LoadBoundary>
  </section>;
}
export default TodayUniverseCard;
