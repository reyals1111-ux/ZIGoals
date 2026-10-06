'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {readDeviceRecord} from '../../lib/device-record';
import {AI_ACTIONS, type AiAction} from '../../lib/ai/store/actions';
import {AI_ACTIONS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';

/**
 * The records the person confirmed from ZIGi's cards (Session V Part 7), for Activity's "Actions by ZIGi" filter and
 * marks. Read after mount from this device, again after a card is added or undone on this page, in another tab, or on
 * an account change. Reading never writes.
 */
export function useZigiActions(): {actions: readonly AiAction[]; ids: ReadonlySet<string>} {
  const [actions, setActions] = useState<readonly AiAction[]>([]);
  const refresh = useCallback(() => { try { setActions(readDeviceRecord(getAppStorage(), AI_ACTIONS).data.actions ?? []); } catch { setActions([]); } }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === AI_ACTIONS_KEY) refresh(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(AI_ACTIONS_KEY)) refresh(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  return {actions, ids: new Set(actions.map(a => a.activityId))};
}
