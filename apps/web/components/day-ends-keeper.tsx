'use client';
import {useLayoutEffect} from 'react';
import {ACCOUNT_CHANGE} from '../lib/account-session';
import {DAY_ENDS_RECORD, emptyDayEnds, setCurrentDayEnds} from '../lib/day-boundary';
import {readDeviceRecord} from '../lib/device-record';
import {ZIGI_STORE_EVENT} from '../lib/ai/store/keys';
import {getAppStorage} from '../lib/showcase-storage';

/**
 * Session AO (C-DVG-22): "My day ends at" for the whole page, read from this device's record (lib/day-boundary.ts) in a
 * layout effect, before any passive effect of the same commit (the day-dependent writers, as with the journal zone),
 * and again after a save, a change in another tab or an account change. Unreadable: midnight, as before.
 */
export function useDayEndsKeeper(): void {
  useLayoutEffect(() => {
    const apply = () => { try { setCurrentDayEnds(readDeviceRecord(getAppStorage(), DAY_ENDS_RECORD).data); } catch { setCurrentDayEnds(emptyDayEnds()); } };
    apply();
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === DAY_ENDS_RECORD.key) apply(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(DAY_ENDS_RECORD.key)) apply(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, apply);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, apply); };
  }, []);
}
