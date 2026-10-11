'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {HOSTED_BUILD, hostedActive, hostedEntitlement, hostedHealth, type HostedEntitlement} from '../../lib/ai/hosted';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {useDeviceRecord} from './use-device-record';

/**
 * ZIGoals hosted for a component (Session V Part 17): today's entitlement for the signed-in account, asked once on
 * mount and again on an account change, and whether the route is in use (chosen, agreed to, entitled). Outside a hosted
 * build this asks nothing and the route never shows.
 */
export type HostedState = {entitlement: HostedEntitlement | null; active: Extract<HostedEntitlement, {entitled: true}> | null; health: boolean; refresh: () => void};
export function useHosted(): HostedState {
  const options = useDeviceRecord(AI_OPTIONS);
  const [entitlement, setEntitlement] = useState<HostedEntitlement | null>(() => HOSTED_BUILD ? null : {entitled: false, reason: 'not-in-build'});
  const refresh = useCallback(() => {
    if (!HOSTED_BUILD) return;
    let account: string | null = null; try { account = getAccountScope(); } catch { account = null; }
    void hostedEntitlement(account).then(setEntitlement);
  }, []);
  useEffect(() => {
    if (!HOSTED_BUILD) return;
    queueMicrotask(refresh);
    window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => window.removeEventListener(ACCOUNT_CHANGE, refresh);
  }, [refresh]);
  const active = options.loaded && entitlement && hostedActive(options.data, entitlement) ? entitlement : null;
  return {entitlement, active, health: hostedHealth(options.data), refresh};
}
