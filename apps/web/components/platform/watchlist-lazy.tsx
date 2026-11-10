'use client';
import {Suspense, lazy} from 'react';
import {LoadBoundary} from '../load-boundary';

/**
 * CI13 (weights; the pattern Wealth uses for the same card, wealth-view.tsx `later`): the favourite-markets card with its
 * "Add a market" picker loads as its own chunk on Today and Portfolio. While its code arrives a quiet placeholder of the
 * card's height holds the place, so nothing below it moves twice.
 */
const Watchlist = lazy(() => import('./watchlist').then(m => ({default: m.Watchlist})));
export function LazyWatchlist({compact = false}: {compact?: boolean}) {
  return <LoadBoundary label="Your market watch"><Suspense fallback={<div aria-busy="true" style={{minHeight: 120}}/>}><Watchlist compact={compact}/></Suspense></LoadBoundary>;
}
