'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {HABIT_HEALTH_LINKS_KEY, emptyHabitHealthLinks, type HabitHealthLinks} from '../../lib/habit-health-links/schema';
import {readHabitHealthLinks, startOverHabitHealthLinks, updateHabitHealthLinks} from '../../lib/habit-health-links/store';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {habitLinksIn} from '../../lib/vault/sync-homes';
import {updateHome} from '../../lib/sync-homes-store';
import {useSharedHealth} from '../use-shared-health';
import {useDeviceMerge} from '../use-device-merge';

export const HABIT_HEALTH_LINKS_EVENT = 'zigoals:habit-health-links-change';
/**
 * This device's Health links and automatic check-in markers (lib/habit-health-links), switch off. Read after mount,
 * never written on view: only saving a link, an automatic check-in, its undo or "Start over" writes. In Showcase the app
 * storage is the tab's session storage, so the demo links end with it.
 */
function useDeviceHabitHealthLinks() {
  const [state, setState] = useState<{data: HabitHealthLinks; unreadable: boolean; loaded: boolean}>({data: emptyHabitHealthLinks(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readHabitHealthLinks(getAppStorage()), loaded: true}); } catch { setState({data: emptyHabitHealthLinks(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(HABIT_HEALTH_LINKS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(HABIT_HEALTH_LINKS_EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(HABIT_HEALTH_LINKS_EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  /** Rejects, with nothing written, when the key is unreadable, storage refuses or the result is invalid. */
  const update = useCallback(async (change: (current: HabitHealthLinks) => HabitHealthLinks) => {
    const next = updateHabitHealthLinks(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(HABIT_HEALTH_LINKS_EVENT));
    return next;
  }, []);
  /** The person's explicit choice to replace unreadable links; the old bytes are kept as a recovery copy. */
  const startOver = useCallback(async () => {
    const next = startOverHabitHealthLinks(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(HABIT_HEALTH_LINKS_EVENT));
    return next;
  }, []);
  return {...state, error: '', update, startOver};
}

/**
 * Switch on: links and markers live in Health v3 (`habitLinks`), merged with this device's key, and sync with Health
 * under its consent, so a habit ticked off from Health on one device is not ticked off again on another. Still never
 * written on view.
 */
function useHomeHabitHealthLinks() {
  const health = useSharedHealth();
  const settled = useDeviceMerge(health.loaded && !health.error);
  const data = useMemo(() => habitLinksIn(health.data), [health.data]);
  const update = useCallback((change: (current: HabitHealthLinks) => HabitHealthLinks) => updateHome('habitLinks', change), []);
  const startOver = useCallback(async (): Promise<HabitHealthLinks> => { throw Error(health.error || 'Nothing was changed.'); }, [health.error]);
  return {data, unreadable: !!health.error, error: health.error, loaded: health.loaded && (settled || !!health.error), update, startOver};
}

export const useHabitHealthLinks: () => ReturnType<typeof useDeviceHabitHealthLinks> = SYNC_WRITES ? useHomeHabitHealthLinks : useDeviceHabitHealthLinks;
export type HabitHealthLinksStore = ReturnType<typeof useHabitHealthLinks>;
