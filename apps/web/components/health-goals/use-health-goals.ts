'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {HEALTH_GOALS_KEY, emptyHealthGoals, type HealthGoals} from '../../lib/health-goals/schema';
import {readHealthGoals, startOverHealthGoals, updateHealthGoals} from '../../lib/health-goals/store';

const EVENT = 'zigoals:health-goals-change';
/** This device's health goals (lib/health-goals). Read after mount, never written on view: only the creator, "Mark done", "Close", "Reopen" and "Start over" write. */
export function useHealthGoals() {
  const [state, setState] = useState<{data: HealthGoals; unreadable: boolean; loaded: boolean}>({data: emptyHealthGoals(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readHealthGoals(getAppStorage()), loaded: true}); } catch { setState({data: emptyHealthGoals(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(HEALTH_GOALS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const update = useCallback((change: (current: HealthGoals) => HealthGoals) => {
    const next = updateHealthGoals(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(() => {
    const next = startOverHealthGoals(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, update, startOver};
}
export type HealthGoalsStore = ReturnType<typeof useHealthGoals>;
