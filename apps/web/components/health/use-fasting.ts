'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {FASTING_KEY, emptyFasting, type Fasting} from '../../lib/fasting/schema';
import {applyAutoStop, runningSession} from '../../lib/fasting/engine';
import {readFasting, startOverFasting, updateFasting} from '../../lib/fasting/store';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {fastingIn} from '../../lib/vault/sync-homes';
import {updateHome} from '../../lib/sync-homes-store';
import {useSharedHealth} from '../use-shared-health';
import {useDeviceMerge} from '../use-device-merge';

const EVENT = 'zigoals:fasting-change';
/**
 * This device's fasts (lib/fasting), switch off (lib/vault/sync-writes.ts). Read after mount; a running fast older than
 * 24 hours is stopped at exactly 24 hours before anything renders (one write). `now` ticks once a minute while the page
 * is visible, so the clock text updates.
 */
function useDeviceFasting() {
  const [state, setState] = useState<{data: Fasting; unreadable: boolean; loaded: boolean}>({data: emptyFasting(), unreadable: false, loaded: false});
  const [now, setNow] = useState(() => new Date());
  const settling = useRef(false);
  const refresh = useCallback(() => {
    try {
      const storage = getAppStorage(), read = readFasting(storage);
      if (!read.unreadable && !settling.current) {
        const stopped = applyAutoStop(read.data, new Date());
        if (stopped !== read.data) { settling.current = true; try { const next = updateFasting(storage, () => stopped); setState({data: next, unreadable: false, loaded: true}); window.dispatchEvent(new Event(EVENT)); return; } catch { /* the limit note still shows from the computed state */ } finally { settling.current = false; } }
      }
      setState({...read, loaded: true});
    } catch { setState({data: emptyFasting(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(FASTING_KEY)) refresh(); };
    const tick = () => { if (document.visibilityState === 'visible') { setNow(new Date()); refresh(); } };
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh); window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [refresh]);
  const update = useCallback(async (change: (current: Fasting) => Fasting) => {
    const next = updateFasting(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true}); setNow(new Date());
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(async () => {
    const next = startOverFasting(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, error: '', now, running: runningSession(state.data), update, startOver};
}

/**
 * Switch on: the fasts live in Health (v2, `fasting`), merged with what this device's key holds, and sync with Health
 * under its consent. The same 24-hour stop and the same minute clock; the device key is never rewritten.
 */
function useHomeFasting() {
  const health = useSharedHealth();
  const ready = health.loaded && !health.error, settled = useDeviceMerge(ready);
  const data = useMemo(() => fastingIn(health.data), [health.data]);
  const [now, setNow] = useState(() => new Date());
  const settling = useRef(false);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    if (!ready || !settled || settling.current || applyAutoStop(data, now) === data) return;
    settling.current = true;
    void updateHome('fasting', current => applyAutoStop(current, new Date())).catch(() => { /* the limit note still shows from the computed state */ }).finally(() => { settling.current = false; });
  }, [ready, settled, data, now]);
  const update = useCallback(async (change: (current: Fasting) => Fasting) => { const next = await updateHome('fasting', change); setNow(new Date()); return next; }, []);
  // Health that cannot be read is never replaced from here; Settings shows how to restore it.
  const startOver = useCallback(async (): Promise<Fasting> => { throw Error(health.error || 'Nothing was changed.'); }, [health.error]);
  return {data, unreadable: !!health.error, error: health.error, loaded: health.loaded && (settled || !!health.error), now, running: runningSession(data), update, startOver};
}

export const useFasting: () => ReturnType<typeof useDeviceFasting> = SYNC_WRITES ? useHomeFasting : useDeviceFasting;
export type FastingStore = ReturnType<typeof useFasting>;
