'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {GUIDE_KEY, emptyGuide, type Guide} from '../../lib/coach/schema';
import {dismissNudge, readGuide, setGuideEnabled} from '../../lib/coach/store';

const EVENT = 'zigoals:guide-change';
export type GuideStore = {data: Guide; unreadable: boolean; loaded: boolean; setEnabled: (enabled: boolean, today: string) => Guide; dismiss: (id: string, today: string) => Guide};
/** This device's Guide choice (lib/coach). Read after mount, never written on view: only the switch and "Not today" write. */
export function useGuide(): GuideStore {
  const [state, setState] = useState<{data: Guide; unreadable: boolean; loaded: boolean}>({data: emptyGuide(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readGuide(getAppStorage()), loaded: true}); } catch { setState({data: emptyGuide(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(GUIDE_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const setEnabled = useCallback((enabled: boolean, today: string) => { const next = setGuideEnabled(getAppStorage(), enabled, today); setState({data: next, unreadable: false, loaded: true}); window.dispatchEvent(new Event(EVENT)); return next; }, []);
  const dismiss = useCallback((id: string, today: string) => { const next = dismissNudge(getAppStorage(), id, today); setState({data: next, unreadable: false, loaded: true}); window.dispatchEvent(new Event(EVENT)); return next; }, []);
  return {...state, setEnabled, dismiss};
}
