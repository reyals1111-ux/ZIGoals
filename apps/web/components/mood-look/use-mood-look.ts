'use client';
import {useSyncExternalStore} from 'react';
import {ENERGY_KEY} from '../../lib/energy/schema';
import {readMoodLook, type MoodLook} from '../../lib/daylio/rule';
import {getAppStorage} from '../../lib/showcase-storage';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';

/**
 * Session AV lane 2 (habits; LEDGER #178): the five mood words and symbols as this device keeps them (your own, or the
 * app's), for every place that shows a mood. The app's words on the server and before hydration, so the first paint
 * matches; then this device's, following every write of the energy record (this tab's store event, other tabs' storage).
 */
const DEFAULT = readMoodLook(null);
let cache: {raw: string | null; look: MoodLook} = {raw: null, look: DEFAULT};
function snapshot(): MoodLook {
  let raw: string | null = null;
  try { raw = getAppStorage().getItem(ENERGY_KEY); } catch { raw = null; }
  if (raw === cache.raw) return cache.look;
  let look = DEFAULT;
  try { look = raw ? readMoodLook(JSON.parse(raw)) : DEFAULT; } catch { look = DEFAULT; }
  cache = {raw, look};
  return look;
}
function subscribe(on: () => void) {
  const onStore = (e: Event) => { const key = (e as CustomEvent).detail; if (!key || key === ENERGY_KEY) on(); };
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === ENERGY_KEY) on(); };
  window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', onStorage);
  return () => { window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', onStorage); };
}
export function useMoodLook(): MoodLook { return useSyncExternalStore(subscribe, snapshot, () => DEFAULT); }
