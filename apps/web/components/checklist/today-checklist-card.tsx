'use client';
import {Suspense, lazy} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import type {LayoutAttrs} from '../layout-edit';
import {LoadBoundary} from '../load-boundary';
// Session AF (the lead): the card's CSS loads with Today, not with the lazy body — a CSS chunk fetched after first paint and
// cancelled by a quick navigation left an unhandled ChunkLoadError in WebKit (CI's webkit-earn trace).
import './today-checklist.css';

const TodayChecklistBody = lazy(() => import('./today-checklist-body'));
/**
 * Today's Checklist card (Session AF, L3; P7.21): the layout item `today:checklist`. One DOM root (the layout region
 * moves and labels it), so the card is this small slot in Today's bundle; its body ("4 of 6 dots today", the bar, the next
 * dot, the streak, a gentle nudge) loads as its own chunk after Today's first paint, and the path engine never loads on
 * Today. Off in Settings (this device), the slot stays empty and hidden.
 */
export function TodayChecklistCard(layout: LayoutAttrs) {
  const prefs = useUiPrefs(), on = prefs.loaded && !prefs.unreadable && checklistPrefsOf(prefs.data).launcher;
  return <section {...layout} className="panel today-checklist-card" aria-labelledby={on ? 'today-checklist-title' : undefined} hidden={!on || undefined}>
    {on && <LoadBoundary quiet><Suspense fallback={<p className="eyebrow" id="today-checklist-title">Checklist</p>}><TodayChecklistBody/></Suspense></LoadBoundary>}
  </section>;
}
export default TodayChecklistCard;
