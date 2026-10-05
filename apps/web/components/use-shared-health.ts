'use client';
import {useSyncExternalStore} from 'react';
import {ACCOUNT_CHANGE, getAccountScope, isAccountLocked} from '../lib/account-session';
import {getAppStorage, isShowcase, storageLockKey} from '../lib/showcase-storage';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../lib/health';
import {readPrivateStore} from '../lib/private-storage';
import {isDurableMarker, readDurableStore} from '../lib/vault/local';
import {blockedReadMessage} from '../lib/storage-error-copy';

/**
 * Session U Part 9: one read of the Health module shared by every view of the records that live in it once the switch is
 * on (fasts, health goals, habit-health links, the review's Health notes). A page with twenty habit cards then parses
 * Health once per change, not once per card. Reads like usePrivateStore (browser storage or the durable database, the
 * same messages when the vault is locked or storage is blocked) and refreshes on the same change signals; it never writes.
 */
type Snapshot = {storage: Storage | null; data: HealthData; loaded: boolean; error: string};
const initial: Snapshot = {storage: null, data: createEmptyHealth(), loaded: false, error: ''};
let snapshot = initial, generation = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
async function refresh() {
  const current = ++generation;
  let storage: Storage | null = null;
  try {
    storage = getAppStorage();
    const data = isDurableMarker(storage.getItem(HEALTH_STORAGE_KEY)) ? await readDurableStore(storage, HEALTH_STORAGE_KEY, healthSchema) : readPrivateStore(storage, HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth);
    if (current !== generation) return;
    snapshot = {storage, data, loaded: true, error: ''};
  } catch (error) {
    if (current !== generation) return;
    let locked = false; try { locked = !!getAccountScope() && isAccountLocked(); } catch { /* not locked */ }
    snapshot = {storage, data: createEmptyHealth(), loaded: true, error: locked ? 'Account records are locked. Verify your account and unlock the vault in Settings.' : blockedReadMessage(error) ?? 'Private data could not be read. It has not been changed. Export the original from Settings before restoring a backup.'};
  }
  notify();
}
const onChange = (event: Event) => { if ((event as CustomEvent<string>).detail === HEALTH_STORAGE_KEY) void refresh(); };
const onStorage = (event: StorageEvent) => { try { if (!isShowcase() && (!event.key || event.key === storageLockKey(getAppStorage(), HEALTH_STORAGE_KEY))) void refresh(); } catch { void refresh(); } };
const onAccount = () => { generation++; snapshot = initial; notify(); void refresh(); };
let channel: BroadcastChannel | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('zigoals:private-change', onChange); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, onAccount);
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('zigoals:private-updates:v1') : null;
    if (channel) channel.onmessage = (event: MessageEvent) => { if (!isShowcase() && event.data === HEALTH_STORAGE_KEY) void refresh(); };
  }
  let storage: Storage | null = null; try { storage = getAppStorage(); } catch { /* refresh reports it */ }
  if (!snapshot.loaded || snapshot.storage !== storage) void refresh();
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener('zigoals:private-change', onChange); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, onAccount);
    channel?.close(); channel = null;
    // Nobody is looking: the next view reads afresh rather than trusting what may have changed meanwhile.
    generation++; snapshot = initial;
  };
}
const read = () => snapshot, serverRead = () => initial;
export function useSharedHealth(): Snapshot { return useSyncExternalStore(subscribe, read, serverRead); }
