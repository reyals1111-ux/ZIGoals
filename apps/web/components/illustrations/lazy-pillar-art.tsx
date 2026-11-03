'use client';
import {Suspense, lazy} from 'react';
import {LoadBoundary} from '../load-boundary';
import type {ArtPillar} from './motifs';
import './placement.css';

/**
 * Session AK (F6): the pillar illustration, loaded only when an empty state mounts it (route weights stay as they were).
 * Nothing shows while it loads, and a failed load (offline, a replaced version) simply leaves it out: it is decoration.
 */
const PillarArt = lazy(() => import('./pillar-art'));
export function LazyPillarArt(props: {pillar: ArtPillar; size?: number; className?: string}) {
  return <LoadBoundary quiet><Suspense fallback={null}><PillarArt {...props}/></Suspense></LoadBoundary>;
}
