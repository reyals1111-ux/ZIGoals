'use client';
import {lazy, Suspense} from 'react';
import {LoadBoundary} from '../../load-boundary';

const HermesGuide = lazy(() => import('./hermes-guide'));
/** The Hermes guide loads on use: the route's first paint carries only this shell. */
export function NovaHermesPage() {
  return <LoadBoundary label="Connect your Hermes Agent"><Suspense fallback={<p className="ai-note" role="status">Opening the guide…</p>}><HermesGuide/></Suspense></LoadBoundary>;
}
