'use client';
import {Suspense, lazy} from 'react';
import {useShowcase} from '../showcase-controls';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';

// Session AK (B): the Notes page's body loads on its own chunk after the page header; it reads the address (?view=, ?day=,
// ?note=, ?capture=1), so it sits inside its own Suspense boundary (Next: useSearchParams in a prerendered route).
const NotesWorkspace = lazy(() => import('./notes-workspace'));
/** Session AK (B): the Notes page's client part (the Showcase label follows the Showcase switch). */
export function NotesPageClient() {
  const showcase = useShowcase();
  return <LoadBoundary label="Notes"><Suspense fallback={<Skeleton label="Opening your notes…" lines={4}/>}><NotesWorkspace showcase={showcase}/></Suspense></LoadBoundary>;
}
