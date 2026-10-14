import {getAppStorage, storageLockKey} from './showcase-storage';
import {withStorageLock} from './storage';
import {SYNC_WRITES} from './vault/sync-writes';
import {PLATFORM_KEY, emptyPlatform, platformSchema, type Platform} from './positions';
import {readPrivateStore, updatePrivateStore} from './private-storage';
import {isDurableMarker, readDurableStore, updateDurableStore} from './vault/local';
import {readDeviceRecord} from './device-record';
import {ACCOUNTS, ACCOUNTS_KEY} from './accounts/schema';
import {MILESTONE_DATES, MILESTONE_DATES_KEY} from './goals/milestone-dates';
import {announceSyncedChanges, announceSyncedDeviceChanges} from './vault/account-data';
import {FINANCE_HOMES_KEY, emptyFinanceHomesMarker, financeHomesMarkerSchema, reconcileFinanceHomes, type FinanceHomesMarker, type Reconciled} from './vault/finance-homes';

/**
 * Session AB-Cloud Part 1 ([TIER 3] (data formats / sync), ADR-023 C6): runs the finance-homes reconcile
 * (lib/vault/finance-homes.ts) against this storage view. Account sync calls it before it captures the sections (so an
 * upload carries the device keys' latest accounts and dates) and after it applied the cloud's (so the device keys show
 * what another device synced). Under one lock per storage view; finance through its own store (browser storage or the
 * durable database, a version raise keeping a recovery copy); the device keys written only when their content changes;
 * the marker last, so an interrupted run reconciles again. Never runs while SYNC_WRITES is off.
 */
export const FINANCE_HOMES_DEVICE_KEYS = [ACCOUNTS_KEY, MILESTONE_DATES_KEY] as const;
export const FINANCE_HOMES_LOCK = 'zigoals:finance-homes';

export function readFinanceHomesMarker(storage: Pick<Storage, 'getItem'>): FinanceHomesMarker {
  try { const raw = storage.getItem(FINANCE_HOMES_KEY); if (raw !== null) return financeHomesMarkerSchema.parse(JSON.parse(raw)); } catch { /* reconciled again from scratch: both sides' records are kept (C6) */ }
  return emptyFinanceHomesMarker();
}
async function updateFinance(storage: Storage, updater: (latest: Platform) => Platform): Promise<Platform> {
  return isDurableMarker(storage.getItem(PLATFORM_KEY)) ? updateDurableStore(storage, PLATFORM_KEY, platformSchema, updater) : updatePrivateStore(storage, PLATFORM_KEY, platformSchema, emptyPlatform, updater);
}
export async function readFinance(storage: Storage): Promise<Platform> {
  return isDurableMarker(storage.getItem(PLATFORM_KEY)) ? readDurableStore(storage, PLATFORM_KEY, platformSchema) : readPrivateStore(storage, PLATFORM_KEY, platformSchema, emptyPlatform);
}

/** Returns what changed: finance (`platform`) and the device keys by name. */
export async function reconcileFinanceHomesNow(storage: Storage = getAppStorage(), {syncWrites = SYNC_WRITES}: {syncWrites?: boolean} = {}): Promise<{platform: boolean; keys: string[]}> {
  if (!syncWrites) return {platform: false, keys: []};
  return withStorageLock(storageLockKey(storage, FINANCE_HOMES_LOCK), async () => {
    // The bytes as read: the device keys and the marker are written back only while they still hold exactly these, so
    // an edit made meanwhile (this tab or another) is never overwritten; it is reconciled by the next run.
    const before = [ACCOUNTS_KEY, MILESTONE_DATES_KEY, FINANCE_HOMES_KEY].map(key => storage.getItem(key));
    const accounts = readDeviceRecord(storage, ACCOUNTS), dates = readDeviceRecord(storage, MILESTONE_DATES), marker = readFinanceHomesMarker(storage);
    const device = {accounts: accounts.unreadable ? null : accounts.data, dates: dates.unreadable ? null : dates.data};
    if (!device.accounts && !device.dates) return {platform: false, keys: []};
    // An empty device and a finance record that holds neither accounts nor dates: nothing to do, and no finance record
    // is created for a person who never had one.
    if (storage.getItem(PLATFORM_KEY) === null && !device.accounts?.items.length && !Object.keys(device.dates?.dates ?? {}).length) return {platform: false, keys: []};
    let result: Reconciled | undefined;
    await updateFinance(storage, latest => { result = reconcileFinanceHomes(latest, device, marker); return result.platform; });
    const done = result!, keys: string[] = [];
    if ([ACCOUNTS_KEY, MILESTONE_DATES_KEY, FINANCE_HOMES_KEY].some((key, i) => storage.getItem(key) !== before[i])) {
      if (done.changed && typeof window !== 'undefined') announceSyncedChanges([PLATFORM_KEY]);
      return {platform: done.changed, keys};
    }
    if (done.accounts) { storage.setItem(ACCOUNTS_KEY, JSON.stringify(done.accounts)); keys.push(ACCOUNTS_KEY); }
    if (done.dates) { storage.setItem(MILESTONE_DATES_KEY, JSON.stringify(done.dates)); keys.push(MILESTONE_DATES_KEY); }
    storage.setItem(FINANCE_HOMES_KEY, JSON.stringify(financeHomesMarkerSchema.parse(done.marker)));
    // Told to open views as sync's own writes (account sync runs this reconcile), never as local edits to sync again.
    announceSyncedDeviceChanges(keys);
    if (done.changed && typeof window !== 'undefined') announceSyncedChanges([PLATFORM_KEY]);
    return {platform: done.changed, keys};
  });
}
