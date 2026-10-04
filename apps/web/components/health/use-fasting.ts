'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {FASTING_KEY, emptyFasting, type Fasting} from '../../lib/fasting/schema';
import {applyAutoStop, runningSession} from '../../lib/fasting/engine';
import {readFasting, startOverFasting, updateFasting} from '../../lib/fasting/store';

const EVENT = 'zigoals:fasting-change';
/**
 * This device's fasts (lib/fasting). Read after mount; a running fast older than 24 hours is stopped at exactly 24 hours
 * before anything renders (one write). `now` ticks once a minute while the page is visible, so the clock text updates.
 */
export function useFasting() {
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
  const update = useCallback((change: (current: Fasting) => Fasting) => {
    const next = updateFasting(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true}); setNow(new Date());
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(() => {
    const next = startOverFasting(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, now, running: runningSession(state.data), update, startOver};
}
export type FastingStore = ReturnType<typeof useFasting>;
