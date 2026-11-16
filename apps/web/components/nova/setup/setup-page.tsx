'use client';
import {lazy, Suspense} from 'react';
import {LoadBoundary} from '../../load-boundary';

const NovaSetupGuide = lazy(() => import('./setup-guide'));
/** Session AM-2 (owner's step 4d): "Make NOVA your own agent", a second path under the ten planets; its own chunk. */
const AgentGuide = lazy(() => import('../agent/agent-guide'));
/** The guide loads on use: the route's first paint carries only this shell (route weight held; the path is its own chunk). */
export function NovaSetupPage() {
  return <>
    <LoadBoundary label="Build your own NOVA"><Suspense fallback={<p className="ai-note" role="status">Opening the guide…</p>}><NovaSetupGuide/></Suspense></LoadBoundary>
    <LoadBoundary label="Make NOVA your own agent"><Suspense fallback={<p className="ai-note" role="status">Opening “Make NOVA your own agent”…</p>}><AgentGuide/></Suspense></LoadBoundary>
  </>;
}
