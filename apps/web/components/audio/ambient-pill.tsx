'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useSyncExternalStore} from 'react';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {isShown} from '../../lib/pages/visibility';
import {usePagesView} from '../pages/use-pages-view';
const AmbientPillStop = lazy(() => import('./ambient-pill-stop'));

/**
 * A small Stop pill (Session W Part 6) while a focus sound plays on another page than Meditation, at the side opposite
 * ZIGi's button. Nothing renders until a sound plays (never on the server), so the shell stays as it was. Session W Part
 * 20: while the music button shows, it takes this place and carries the sound (its ring, its panel and mini-bar).
 */
export function AmbientPill() {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), pathname = usePathname(), music = isShown(usePagesView(), 'music');
  if (!state.playing || music) return null;
  if (pathname === '/app/health' && new URLSearchParams(window.location.search).get('view') === 'meditation') return null;
  return <Suspense fallback={null}><AmbientPillStop sound={state.sound}/></Suspense>;
}
