'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useSyncExternalStore} from 'react';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
const AmbientPillStop = lazy(() => import('./ambient-pill-stop'));

/**
 * A small Stop pill (Session W Part 6) while a focus sound plays on another page than Meditation, at the side opposite
 * ZIGi's button. Nothing renders until a sound plays (never on the server), so the shell stays as it was.
 */
export function AmbientPill() {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), pathname = usePathname();
  if (!state.playing) return null;
  if (pathname === '/app/health' && new URLSearchParams(window.location.search).get('view') === 'meditation') return null;
  return <Suspense fallback={null}><AmbientPillStop sound={state.sound}/></Suspense>;
}
