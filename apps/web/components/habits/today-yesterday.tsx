'use client';
import {lazy, Suspense} from 'react';
import {LoadBoundary} from '../load-boundary';
import {useHabits} from './use-habits';

const YesterdayOpen = lazy(() => import('./yesterday-open'));
/**
 * Session AV (q4 #19, #32; Habitica shows yesterday on the day's first action): yesterday's open habits and "What got in
 * the way?" on Today, from its first open, through the habits store (the same list, Undo and "Not now" as on Habits).
 * Loaded with Today's focus line; the list itself is its own chunk and draws nothing when yesterday is all handled.
 */
export default function TodayYesterday({extras}: {extras: unknown}) {
  const store = useHabits();
  if (!store.loaded || store.error) return null;
  return <LoadBoundary quiet><Suspense fallback={null}><YesterdayOpen data={store.data} today={store.today} update={store.update} extras={extras} place="today"/></Suspense></LoadBoundary>;
}
