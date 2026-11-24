'use client';
import {useSyncExternalStore} from 'react';
import type {Controls} from './vault-sync-controls';
import type {ExtrasOutcome} from '../lib/vault/extras-sync';

/**
 * Session AV lane 2 (owner follow-up 4, 4d A45-1; TIER 3 sync): what every page reads of the account-sync engine, without
 * the engine. The engine (components/vault-sync-controls.tsx, about 80 kB with its vault code) loads as its own chunk as the
 * app hydrates (components/vault-sync-lazy.tsx) and publishes its controls here; until it has, a page reads what it read
 * before the provider's first render: no controls, a closed vault. Every hook and type pages import lives here, so no page's
 * first scripts hold the engine. `vault-sync-controls.tsx` re-exports these for the code that already imports them there.
 */
/** Session AD item 11 (ADR-026): one section's last sync in this session, and whether it brought another device's changes in. */
export type SectionSync = {at: string; merged: boolean};
/** Session AB-Cloud Part 2 (ADR-023 C1–C5): what the extras' last run said, for Settings → Sync. */
export type ExtrasStatus = {state: 'off'} | {state: 'synced'; outcomes: ExtrasOutcome[]; at: string} | {state: 'error'; message: string} | {state: 'removed'} | {state: 'deleted-elsewhere'};

let current: Controls | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = () => current;
const none = () => null;

/** The engine's one way in: its controls after each of its renders, and null when it unmounts. */
export function publishVaultControls(next: Controls | null): void {
  if (next === current) return;
  current = next;
  for (const listener of [...listeners]) listener();
}

/** The provider's controls, for the Settings panel (components/vault-sync-panel.tsx, Session X Part 5b); null until the engine has loaded. */
export function useVaultControls(): Controls | null { return useSyncExternalStore(subscribe, read, none); }

/** Public status only; keys, recovery material and private records never leave the provider. */
export function useVaultStatus() {
  const c = useVaultControls();
  return {opened: c?.opened ?? false, busy: c?.busy ?? false, message: c?.message ?? '', error: c?.error ?? '', last: c?.last ?? '', account: c?.account ?? null};
}
