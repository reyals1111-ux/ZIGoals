'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';

/**
 * One of ZIGi's Session V device records (lib/ai/store/records.ts), or one of Session W's (lib/w-device-records.ts), in a
 * component: read after mount through the app
 * storage (per account; the tab's session storage in Showcase), read again after a save anywhere on the page, a change
 * in another tab or an account change. `update` writes the person's choice and tells every other reader; it throws, with
 * nothing written, when the result is invalid or storage refuses. A read never writes.
 */
export type DeviceRecordState<T> = {data: T; loaded: boolean; unreadable: boolean; update: (change: (current: T) => T) => T;
  /** Removes the record from this device (Part 8: "Delete all notes"); every reader then reads it as empty. */
  clear: () => void};
export function useDeviceRecord<T>(spec: DeviceRecordSpec<T>): DeviceRecordState<T> {
  const [state, setState] = useState<{data: T; loaded: boolean; unreadable: boolean}>(() => ({data: spec.empty(), loaded: false, unreadable: false}));
  const refresh = useCallback(() => {
    try { const read = readDeviceRecord(getAppStorage(), spec); setState({data: read.data, loaded: true, unreadable: read.unreadable}); }
    catch { setState({data: spec.empty(), loaded: true, unreadable: true}); }
  }, [spec]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === spec.key) refresh(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(spec.key)) refresh(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh, spec.key]);
  const update = useCallback((change: (current: T) => T) => {
    const next = updateDeviceRecord(getAppStorage(), spec, change);
    setState({data: next, loaded: true, unreadable: false});
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: spec.key}));
    return next;
  }, [spec]);
  const clear = useCallback(() => {
    getAppStorage().removeItem(spec.key);
    setState({data: spec.empty(), loaded: true, unreadable: false});
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: spec.key}));
  }, [spec]);
  return {...state, update, clear};
}
