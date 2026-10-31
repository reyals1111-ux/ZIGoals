'use client';
import {Suspense, lazy} from 'react';
const MusicFull = lazy(() => import('./music-full'));
/** /app/music's client part (Session AK): the full player, loaded as its own chunk so the route's own script stays small. */
export function MusicPageClient() {
  return <Suspense fallback={<p className="fine" role="status">Loading the player…</p>}><MusicFull/></Suspense>;
}
