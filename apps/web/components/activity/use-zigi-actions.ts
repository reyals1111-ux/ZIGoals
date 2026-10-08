'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {readDeviceRecord} from '../../lib/device-record';
import type {AiAction} from '../../lib/ai/store/actions';
import {AI_ACTIONS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';

type ActionsModule = typeof import('../../lib/ai/store/actions');
/** A confirmed card with where its records live (Activity's category, icon and link). */
export type ZigiAction = AiAction & ReturnType<ActionsModule['actionPlace']>;
// Session X P2.3: the record's module (its schema, and with it the schema library's whole namespace as ZIGi's files
// import it) loads with the first read instead of with Today and Activity; that read already waited for mount.
let actionsModule: Promise<ActionsModule> | undefined;
const loadActions = () => (actionsModule ??= import('../../lib/ai/store/actions'));

/**
 * The records the person confirmed from ZIGi's cards (Session V Part 7), for Activity's "Actions by ZIGi" filter and
 * marks. Read after mount from this device, again after a card is added or undone on this page, in another tab, or on
 * an account change. Reading never writes.
 */
export function useZigiActions(): {actions: readonly ZigiAction[]; ids: ReadonlySet<string>} {
  const [actions, setActions] = useState<readonly ZigiAction[]>([]);
  const refresh = useCallback(() => loadActions().then(({AI_ACTIONS, actionPlace}) => {
    try { setActions((readDeviceRecord(getAppStorage(), AI_ACTIONS).data.actions ?? []).map(a => ({...a, ...actionPlace(a.kind)}))); } catch { setActions([]); }
  }, () => setActions([])), []);
  useEffect(() => {
    let active = true;
    const read = () => { if (active) void refresh(); };
    queueMicrotask(read);
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === AI_ACTIONS_KEY) read(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(AI_ACTIONS_KEY)) read(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { active = false; window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, [refresh]);
  return {actions, ids: new Set(actions.map(a => a.activityId))};
}
