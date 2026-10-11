'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {INSIGHTS_KEY, emptyInsights, type Insights} from '../../lib/insights/schema';
import {dismissInsight, readInsights, startOverInsights} from '../../lib/insights/store';

const EVENT = 'zigoals:insights-change';
/** This device's dismissed insight cards (lib/insights). Read after mount; only "Dismiss" and "Start over" write. */
export function useInsights() {
  const [state, setState] = useState<{data: Insights; unreadable: boolean; loaded: boolean}>({data: emptyInsights(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readInsights(getAppStorage()), loaded: true}); } catch { setState({data: emptyInsights(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(INSIGHTS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const dismiss = useCallback((id: string, today: string) => {
    const next = dismissInsight(getAppStorage(), id, today);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const startOver = useCallback(() => {
    const next = startOverInsights(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return {...state, dismiss, startOver};
}
