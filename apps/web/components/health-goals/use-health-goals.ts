'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {HEALTH_GOALS_KEY, emptyHealthGoals, type HealthGoals} from '../../lib/health-goals/schema';
import {readHealthGoals, startOverHealthGoals, updateHealthGoals} from '../../lib/health-goals/store';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {healthGoalsIn} from '../../lib/vault/sync-homes';
import {updateHome} from '../../lib/sync-homes-store';
import {useSharedHealth} from '../use-shared-health';
import {useDeviceMerge} from '../use-device-merge';

const EVENT = 'zigoals:health-goals-change';
/** This device's health goals (lib/health-goals), switch off. Read after mount, never written on view: only the creator, "Mark done", "Close", "Reopen" and "Start over" write. */
function useDeviceHealthGoals() {
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
  const update = useCallback(async (change: (current: HealthGoals) => HealthGoals) => {
    const next = updateHealthGoals(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(async () => {
    const next = startOverHealthGoals(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, error: '', update, startOver};
}

/** Switch on: the goals live in Health v3 (`healthGoals`), merged with this device's key, and sync with Health under its consent. Still never written on view. */
function useHomeHealthGoals() {
  const health = useSharedHealth();
  const settled = useDeviceMerge(health.loaded && !health.error);
  const data = useMemo(() => healthGoalsIn(health.data), [health.data]);
  const update = useCallback((change: (current: HealthGoals) => HealthGoals) => updateHome('healthGoals', change), []);
  const startOver = useCallback(async (): Promise<HealthGoals> => { throw Error(health.error || 'Nothing was changed.'); }, [health.error]);
  return {data, unreadable: !!health.error, error: health.error, loaded: health.loaded && (settled || !!health.error), update, startOver};
}

export const useHealthGoals: () => ReturnType<typeof useDeviceHealthGoals> = SYNC_WRITES ? useHomeHealthGoals : useDeviceHealthGoals;
export type HealthGoalsStore = ReturnType<typeof useHealthGoals>;
