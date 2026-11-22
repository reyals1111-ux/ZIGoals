import {DEVICE_ONLY, SYNCED, recoveryCopyEntry} from './data-health/catalog';

/**
 * Session AV lane 2 (owner decision CR-19, follow-up 3): "Erase everything" names each area it erased, in the export
 * catalogue's own area names (lib/data-health/catalog.ts, the Data health page's areas). The keys are read before the
 * erase: a key of this device, of an account on it (`zigoals:account:v1:<id>:<key>`), or a restore's recovery copy is
 * named by its record's area; any other ZIGoals key (a choice, a cache) counts as "Other choices and caches". Stores
 * (IndexedDB) are named apart. Pure: the caller passes the keys.
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
