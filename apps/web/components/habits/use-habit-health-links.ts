'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {HABIT_HEALTH_LINKS_KEY, emptyHabitHealthLinks, type HabitHealthLinks} from '../../lib/habit-health-links/schema';
import {readHabitHealthLinks, startOverHabitHealthLinks, updateHabitHealthLinks} from '../../lib/habit-health-links/store';

export const HABIT_HEALTH_LINKS_EVENT = 'zigoals:habit-health-links-change';
/**
 * This device's Health links and automatic check-in markers (lib/habit-health-links). Read after mount, never written
 * on view: only saving a link, an automatic check-in, its undo or "Start over" writes. In Showcase the app storage is
 * the tab's session storage, so the demo links end with it.
 */
export function useHabitHealthLinks() {
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
  /** Throws, with nothing written, when the key is unreadable, storage refuses or the result is invalid. */
  const update = useCallback((change: (current: HabitHealthLinks) => HabitHealthLinks) => {
    const next = updateHabitHealthLinks(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(HABIT_HEALTH_LINKS_EVENT));
    return next;
  }, []);
  /** The person's explicit choice to replace unreadable links; the old bytes are kept as a recovery copy. */
  const startOver = useCallback(() => {
    const next = startOverHabitHealthLinks(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(HABIT_HEALTH_LINKS_EVENT));
    return next;
  }, []);
  return {...state, update, startOver};
}
export type HabitHealthLinksStore = ReturnType<typeof useHabitHealthLinks>;
