'use client';
import {useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {readDevices} from '../../lib/vault/device-unlock';
import {SyncJournal} from '../../lib/vault/cloud-sync';
import {useVaultStatus} from '../vault-sync-controls';

/**
 * The account's Health permission, read fail-closed from what this device has persisted (ADR-012): the remembered
 * device record's Health choice (ADR-008 M1 e) and the sync journal's held domains. The checkbox in the vault controls
 * lives in that component's memory and is not reachable from here without editing it (Session U's file), so an
 * unremembered device counts as not permitted and the settings say so. Reads only; never a key, never a record.
 */
export type HealthConsent = {accountActive: boolean; accountHealthPermitted: boolean | null; loaded: boolean};
export function useHealthConsent(): HealthConsent {
  const {opened, account} = useVaultStatus();
  const [state, setState] = useState<{permitted: boolean | null; loaded: boolean}>({permitted: null, loaded: false});
  useEffect(() => {
    let active = true;
    if (!opened || !account) { setState({permitted: null, loaded: true}); return; }
    const read = async () => {
      setState(current => ({...current, loaded: false}));
      try {
        const scope = account.toLowerCase();
        const [devices, journal] = await Promise.all([readDevices().catch(() => []), new SyncJournal(scope).read().catch(() => null)]);
        const remembered = devices.find(d => d.account === scope);
        const held = journal === null ? true : !!journal.heldDomains?.includes('health');
        if (active) setState({permitted: remembered?.health === true && !held, loaded: true});
      } catch { if (active) setState({permitted: null, loaded: true}); }
    };
    void read();
    window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { active = false; window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, [opened, account]);
  return {accountActive: !!(opened && account), accountHealthPermitted: state.permitted, loaded: state.loaded};
}
