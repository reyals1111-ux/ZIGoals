'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {REMINDERS_KEY, emptyReminders, type Reminders} from '../../lib/reminders/schema';
import {readReminders, updateReminders} from '../../lib/reminders/store';

const EVENT = 'zigoals:reminders-change';
/**
 * This device's reminder times (lib/reminders). Read after mount, never written on view: only setting a time or
 * dismissing a card writes. In Showcase the app storage is the tab's session storage, so demo reminders end with it.
 */
export function useReminders() {
  const [state, setState] = useState<{data: Reminders; unreadable: boolean; loaded: boolean}>({data: emptyReminders(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readReminders(getAppStorage()), loaded: true}); } catch { setState({data: emptyReminders(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(REMINDERS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  /** Throws, with nothing written, when storage refuses or the result is invalid. */
  const update = useCallback((today: string, change: (current: Reminders) => Reminders) => {
    const next = updateReminders(getAppStorage(), today, change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, update};
}
