'use client';
import {lazy, Suspense} from 'react';
import {LoadBoundary} from '../../load-boundary';

const NovaSetupGuide = lazy(() => import('./setup-guide'));
/** The guide loads on use: the route's first paint carries only this shell (route weight held; the path is its own chunk). */
export function NovaSetupPage() {
  return <LoadBoundary label="Build your own NOVA"><Suspense fallback={<p className="ai-note" role="status">Opening the guide…</p>}><NovaSetupGuide/></Suspense></LoadBoundary>;
}
