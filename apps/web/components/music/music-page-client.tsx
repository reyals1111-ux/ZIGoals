'use client';
import {Suspense, lazy} from 'react';
import './music-route.css';
import {Skeleton} from '../ui/skeleton';
const MusicFull = lazy(() => import('./music-full'));
/** /app/music's client part (Session AK): the full player, loaded as its own chunk so the route's own script stays small. */
export function MusicPageClient() {
  return <div className="music-page-body"><Suspense fallback={<Skeleton label="Loading the player…" block lines={3}/>}><MusicFull/></Suspense></div>;
}
