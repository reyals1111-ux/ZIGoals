'use client';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import {NOVA_STORE, instructionsOf, personaOf, type NovaRecord, type Persona} from '../../lib/nova/store';
import {novaMotionLevelNow} from '../../lib/nova/orb';
import {loopRuns} from '../../lib/motion-loops/loops';
import type {MotionLevel} from '../../lib/motion/level';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's hooks. `useNova` is the device record (`zigoals:nova:v1`, read after
 * mount through the app storage: per account, the tab's own in Showcase). `usePersona` is what other lanes read (NB's chat
 * names NOVA with it and shows its avatar): the name, the avatar, and the person's custom instructions.
 */
export const useNova = (): DeviceRecordState<NovaRecord> => useDeviceRecord(NOVA_STORE);
export function usePersona(): Persona & {instructions: string; loaded: boolean} {
  const nova = useNova();
  return {...personaOf(nova.data), instructions: instructionsOf(nova.data), loaded: nova.loaded};
}

/** Whether NOVA may move right now: the device's reduced motion and the app's Motion setting, kept in step. */
function watchMotion(change: () => void): () => void {
  const observer = new MutationObserver(change), query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-app-motion']});
  query?.addEventListener?.('change', change);
  return () => { observer.disconnect(); query?.removeEventListener?.('change', change); };
}
/** Session AK (FU): the level itself (Full / Calm / Off; Off on the server), for words that name it. */
export const useNovaMotionLevel = (): MotionLevel => useSyncExternalStore(watchMotion, () => novaMotionLevelNow(), () => 'off');
/** Movement (the starfield's drift, the opening) only at Full; Calm and Off draw still. */
export const useNovaMotion = (): boolean => loopRuns(useNovaMotionLevel());

/** The wall clock, ticking each second while the page is visible (null before mount, so the server never guesses a time). */
export function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => { setNow(new Date()); timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5); };
    const visible = () => { window.clearTimeout(timer); if (document.visibilityState !== 'hidden') tick(); };
    tick();
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return now;
}
/** Whether the browser says it is online (true before mount). */
export function useOnline(): boolean {
  return useSyncExternalStore(change => { window.addEventListener('online', change); window.addEventListener('offline', change); return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); }; }, () => navigator.onLine !== false, () => true);
}
