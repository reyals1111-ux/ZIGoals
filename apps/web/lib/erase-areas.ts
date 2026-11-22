import {DEVICE_ONLY, SYNCED, recoveryCopyEntry} from './data-health/catalog';

/**
 * Session AV lane 2 (owner decision CR-19, follow-up 3): "Erase everything" names each area it erased, in the export
 * catalogue's own area names (lib/data-health/catalog.ts, the Data health page's areas). The keys are read before the
 * erase: a key of this device, of an account on it (`zigoals:account:v1:<id>:<key>`), or a restore's recovery copy is
 * named by its record's area; any other ZIGoals key (a choice, a cache) counts as "Other choices and caches". Stores
 * (IndexedDB) are named apart (`storesOf`, review b1 #11). Pure: the caller passes the keys and the databases.
 */
const ACCOUNT_SCOPE = /^zigoals:account:v1:[0-9a-f-]{36}:/i;
const BY_KEY = new Map([...SYNCED, ...DEVICE_ONLY].map(e => [e.key, e.area]));
/** The catalogue's areas in its own order (synced modules first, then this device's records), each once. */
const ORDER = [...new Set([...SYNCED, ...DEVICE_ONLY].map(e => e.area))];
export const OTHER_AREA = 'Other choices and caches';

export function areaOfKey(key: string): string {
  const own = key.replace(ACCOUNT_SCOPE, '');
  return BY_KEY.get(own) ?? recoveryCopyEntry(own)?.area ?? OTHER_AREA;
}

/** The areas the keys hold, in the catalogue's order, "Other choices and caches" last. */
export function areasOf(keys: readonly string[]): string[] {
  const found = new Set(keys.map(areaOfKey));
  return [...ORDER.filter(a => found.has(a)), ...(found.has(OTHER_AREA) ? [OTHER_AREA] : [])];
}

/** "Today, Habits and Health" (a plain list for the erase's status line). */
export function listAreas(areas: readonly string[]): string {
  if (areas.length <= 1) return areas[0] ?? '';
  return `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`;
}

/**
 * Review b1 #11: the stores (IndexedDB databases) named in plain words — photos and recordings first, as the Data health
 * page lists them (lib/data-health/catalog.ts DEVICE_STORES) — so a browser that holds only photos still sees what goes.
 * A ZIGoals store this build does not know is "Other stores".
 */
export const STORE_NAMES: Readonly<Record<string, string>> = {
  'zigoals-journal-media-v1': 'Journal photos and voice notes', 'zigoals-task-attachments-v1': 'Task photos and voice notes',
  'zigoals-notes-photos-v1': 'Photos in notes', 'zigoals-money-photos-v1': 'Receipt photos', 'zigoals-meal-photos-v1': 'Meal photos',
  'zigoals-progress-photos': 'Progress photos', 'zigoals-vision-v1': 'Vision photos', 'zigoals-ai-chats-v1': 'ZIGi’s conversations',
  'zigoals-notify-v1': 'Notifications', 'zigoals-notify-actions-v1': 'Notifications', 'zigoals-push-labels-v1': 'Notifications',
  'zigoals-food-generic-v1': 'Offline food library', 'zigoals-music-byo-v1': 'Your Spotify client id', 'zigoals-offline-queue-v1': 'Requests waiting for a connection',
  'zigoals-lichess-v1': 'Connections (Lichess)', 'zigoals-link-tokens-v1': 'Connections (Lichess)', 'zigoals-ai-keys-v1': 'AI provider keys',
  'zigoals-exchange-keys-v1': 'Exchange keys', 'zigoals-xpub-v1': 'Wallets you watch', 'zigoals-private-vault-v1': 'Private vault',
  'zigoals-account-sync-v1': 'Account sync', 'zigoals-extras-sync-v1': 'Account sync', 'zigoals-attestation-v1': 'Screen lock and device unlock',
  'zigoals-device-unlock-v1': 'Screen lock and device unlock', 'zigoals-market-catalog-v1': 'Market list (a cache)',
};
export const OTHER_STORES = 'Other stores';
const STORE_ORDER = [...new Set(Object.values(STORE_NAMES))];
/** The stores' plain names, each once, photos and recordings first, "Other stores" last. */
export function storesOf(databases: readonly string[]): string[] {
  const found = new Set(databases.map(d => STORE_NAMES[d] ?? OTHER_STORES));
  return [...STORE_ORDER.filter(n => found.has(n)), ...(found.has(OTHER_STORES) ? [OTHER_STORES] : [])];
}
