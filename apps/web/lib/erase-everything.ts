/**
 * Session AJ (Part 10, owner amendment A6): "Erase everything on this device". It removes every ZIGoals record from this
 * browser — every localStorage and sessionStorage key that starts with "zigoals", and every IndexedDB database ZIGoals
 * opens (KNOWN_DATABASES, kept complete by lib/erase-coverage.test.ts) — and nothing else of the site's or the browser's.
 * It cannot reach anything already public on a blockchain, a provider's copy, or a cloud vault (the account's own delete
 * does that, when accounts open). The page asks for a typed confirmation first and offers Export everything before it.
 */
export const KNOWN_DATABASES = [
  'zigoals-account-sync-v1', 'zigoals-ai-chats-v1', 'zigoals-ai-keys-v1', 'zigoals-attestation-v1', 'zigoals-device-unlock-v1',
  'zigoals-exchange-keys-v1', 'zigoals-extras-sync-v1', 'zigoals-link-tokens-v1', 'zigoals-market-catalog-v1', 'zigoals-private-vault-v1',
  'zigoals-progress-photos', 'zigoals-push-labels-v1', 'zigoals-vision-v1', 'zigoals-xpub-v1',
  // Session AK (ADR-036 A1): the notification snapshot and identity, and the queue of notification taps.
  'zigoals-notify-v1', 'zigoals-notify-actions-v1',
  // Session AK (Part 1c): the offline generic food library (public data kept for offline search).
  'zigoals-food-generic-v1',
  // Session AK (Part 1d): the person's own Spotify client id, on this device only.
  'zigoals-music-byo-v1',
  // Session AK (Part 3): network actions asked for while offline, offered again on reconnect.
  'zigoals-offline-queue-v1',
  // Session AK (Part 4.2): meal photos kept on this device, by the person's choice.
  'zigoals-meal-photos-v1',
] as const;
export const ERASE_PREFIX = 'zigoals';
export const ERASE_CONFIRM = 'ERASE';
type KeyStore = Pick<Storage, 'length' | 'key' | 'removeItem'>;
/** The ZIGoals keys of one storage area. */
export function zigoalsKeys(store: KeyStore): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith(ERASE_PREFIX)) out.push(k); }
  return out;
}
export type EraseResult = {keys: number; databases: number; failed: string[]};
/**
 * Removes the keys of both storage areas, then deletes every known database (and any other database whose name starts
 * with "zigoals", where the browser can list them). A database another tab holds open is reported as `failed`.
 */
export async function eraseEverything(scope: {localStorage?: KeyStore | null; sessionStorage?: KeyStore | null; indexedDB?: Pick<IDBFactory, 'deleteDatabase'> & {databases?: () => Promise<{name?: string}[]>} | null} = globalThis as never): Promise<EraseResult> {
  let keys = 0;
  for (const store of [scope.localStorage, scope.sessionStorage]) {
    if (!store) continue;
    for (const k of zigoalsKeys(store)) { store.removeItem(k); keys++; }
  }
  const idb = scope.indexedDB, failed: string[] = [];
  if (!idb) return {keys, databases: 0, failed};
  const names = new Set<string>(KNOWN_DATABASES);
  try { for (const d of await idb.databases?.() ?? []) if (d.name?.startsWith(ERASE_PREFIX)) names.add(d.name); } catch { /* the known list is enough */ }
  let databases = 0;
  for (const name of names) {
    const ok = await new Promise<boolean>(resolve => { try { const r = idb.deleteDatabase(name); r.onsuccess = () => resolve(true); r.onerror = () => resolve(false); r.onblocked = () => resolve(false); } catch { resolve(false); } });
    if (ok) databases++; else failed.push(name);
  }
  return {keys, databases, failed};
}

/**
 * Session AK (ADR-036 A4): before the records go, what lives outside the key list leaves too — the device's notification
 * record on the push Worker (a DELETE with the device's own secret, which is in a database about to be deleted, so this
 * runs first), the browser's push subscription, the offline page caches and the offline queue. Each step is best effort
 * and never stops the erase. The dependencies are passed in so a test can see the order.
 */
export type DeviceServices = {turnOffNotifications: () => Promise<void>; forgetOfflineCaches: () => Promise<void>; forgetOfflineQueue?: () => Promise<void>};
export async function eraseDeviceServices(deps: DeviceServices): Promise<void> {
  try { await deps.turnOffNotifications(); } catch { /* the Worker deletes an unused device after 30 days */ }
  try { await deps.forgetOfflineCaches(); } catch { /* nothing cached */ }
  try { await deps.forgetOfflineQueue?.(); } catch { /* nothing queued */ }
}
/** Erase everything, as the Settings button runs it: the device services first, then every key and database. */
export async function eraseEverythingOnThisDevice(): Promise<EraseResult> {
  const [{turnOffNotifications}, {forgetOfflineCaches}, {forgetOfflineQueue}] = await Promise.all([import('./notify/device'), import('./sw/register'), import('./offline-queue/queue')]);
  await eraseDeviceServices({turnOffNotifications, forgetOfflineCaches, forgetOfflineQueue});
  return eraseEverything();
}
