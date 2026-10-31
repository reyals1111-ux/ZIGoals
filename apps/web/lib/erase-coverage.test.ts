import {describe, expect, test} from 'vitest';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {ERASE_PREFIX, KNOWN_DATABASES, eraseEverything} from './erase-everything';
import {EVERYTHING_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';

/**
 * Session AJ (Part 10, owner amendment A6): every ZIGoals key and IndexedDB database that the code names is accounted
 * for. Each key is erased by "Erase everything" (it removes every key that starts with "zigoals"), and is either in Export
 * everything and the data catalog, or listed below with the reason it is not. Each database is in KNOWN_DATABASES. A new
 * key or database fails here until it is placed. The scan reads the source (lib, components, app), not a hand-made list.
 */
const root = join(__dirname, '..');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => { const p = join(dir, n); if (n === 'node_modules' || n.startsWith('.')) return []; return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []; });
}
const sources = [...files(join(root, 'lib')), ...files(join(root, 'components')), ...files(join(root, 'app'))].map(f => readFileSync(f, 'utf8'));
const KEYS = [...new Set(sources.flatMap(s => [...s.matchAll(/['"`](zigoals:[a-z0-9-]+:v\d+)['"`]/g)].map(m => m[1]!)))].sort();
const DATABASES = [...new Set(sources.flatMap(s => [...s.matchAll(/['"`](zigoals-[a-z0-9-]+-v\d+|zigoals-progress-photos)['"`]/g)].map(m => m[1]!)))].sort();

/** Keys that are not personal records, so neither Export everything nor the catalog lists them; each with its reason. */
const NOT_RECORDS: Record<string, string> = {
  'zigoals:lichess-pending:v1': 'sessionStorage for one Lichess sign-in round trip (PKCE state and verifier), removed when it ends',
  'zigoals:account-lock:v1': 'a BroadcastChannel name that locks the account in other tabs; nothing is stored',
  'zigoals:private-updates:v1': 'a BroadcastChannel name that tells other tabs a record changed; nothing is stored',
  'zigoals:step-up:v1': 'a key-derivation label (HKDF info), not a storage key',
  'zigoals:device-lock:v1': 'the optional device lock\'s verifier; a lock must not travel in an export (Settings → Device lock)',
  'zigoals:deleted-habit:v1': 'a short-lived mark that a habit was deleted for good, so its notes stay hidden; no content',
  'zigoals:extras-sync-choice:v1': 'this device\'s consent for the encrypted extras sync; consent is asked again on a new device',
  'zigoals:portfolio-sync-choice:v1': 'this device\'s consent for Portfolio sync; asked again on a new device',
  'zigoals:portfolio-sync:v1': 'the Portfolio sync state (cursors and digests), not records',
  'zigoals:finance-homes:v1': 'where finance records live (sync bookkeeping), not records',
  'zigoals:sync-homes:v1': 'which sync home each record uses (sync bookkeeping), not records',
  'zigoals:sync-offer:v1': 'whether the sync offer was shown; a display mark',
  'zigoals:local-ledger:v1': 'the local simulation\'s ledger, exported with its own simulation backup (Settings → Backup & restore)',
  // Split like lib/goal-extras/photo-references.test.ts does: only photo-references.ts may name this reserved key.
  ['zigoals:goal-extras:' + 'v2']: 'a reserved next version of the goal extras, only read for photo references; v1 is exported',
  'zigoals:layout:v1': 'how cards are arranged on this screen (a display preference, ADR-022); not a record',
  'zigoals:link-pending:v1': 'a health-link sign-in in progress (one OAuth round trip), removed when it ends',
  'zigoals:link-synced:v1': 'when each linked health source last synced; read again from the source',
  'zigoals:music-pending:v1': 'a music sign-in in progress (one OAuth round trip), removed when it ends',
  'zigoals:logo-intro:v1': 'whether the logo\'s intro played; a display mark',
  'zigoals:motion:v1': 'the Motion setting of this device (display); not a record',
  'zigoals:onboarding:v1': 'whether the welcome was seen; a display mark',
  'zigoals:whats-new:v1': 'which What\'s new card was dismissed; a display mark',
  'zigoals:portfolio-last-visit:v1': 'the Portfolio value at the last visit, for "since your last visit"; recomputed',
  'zigoals:public-market-insights:v1': 'a cache of public market data; nothing personal',
  'zigoals:public-market-quotes:v1': 'a cache of public prices; nothing personal',
  'zigoals:restore-undo:v1': 'the bytes a restore replaced, kept for its Undo; removed after',
  'zigoals:wallet-reconnect-hint:v1': 'a hint that a wallet was connected before (no address); a display mark',
  'zigoals:wallet-session:v1': 'this tab\'s wallet connection; never exported, reconnect in your wallet',
  'zigoals:ai-chats:v1': 'ZIGi\'s conversations, kept in their own IndexedDB store and listed in the catalog\'s device stores; exported from ZIGi\'s own Export chats',
};

describe('A6: every key and database is accounted for', () => {
  test('the scan finds the session\'s keys and databases (it is reading the source)', () => {
    expect(KEYS).toContain('zigoals:price-alerts:v1');
    expect(KEYS).toContain('zigoals:guided-journeys:v1');
    expect(DATABASES).toContain('zigoals-xpub-v1');
    expect(KEYS.length).toBeGreaterThan(100);
  });
  test('every key starts with the prefix Erase everything removes', () => {
    for (const key of KEYS) expect(key.startsWith(ERASE_PREFIX), key).toBe(true);
  });
  test('every key is in Export everything and the data catalog, or is listed with its reason', () => {
    const exported = new Set(EVERYTHING_KEYS), catalogued = new Set([...SYNCED, ...DEVICE_ONLY].map(e => e.key));
    const missing = KEYS.filter(k => !NOT_RECORDS[k] && (!exported.has(k) || !catalogued.has(k)));
    expect(missing, 'add these to Export everything (lib/export/everything.ts) and the catalog (lib/data-health/catalog.ts), or to NOT_RECORDS with a reason').toEqual([]);
    for (const k of Object.keys(NOT_RECORDS)) expect(KEYS, `${k} is listed but no longer in the code`).toContain(k);
  });
  test('every database the code names is in KNOWN_DATABASES (Erase everything deletes it)', () => {
    expect(DATABASES.filter(d => !(KNOWN_DATABASES as readonly string[]).includes(d))).toEqual([]);
    for (const d of KNOWN_DATABASES) expect(DATABASES, `${d} is listed but no longer in the code`).toContain(d);
  });
});

describe('Erase everything', () => {
  const area = (entries: Record<string, string>) => {
    const m = new Map(Object.entries(entries));
    return {map: m, store: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => { m.delete(k); }}};
  };
  test('removes every zigoals key from both storage areas and nothing else, and deletes every known database', async () => {
    const local = area({'zigoals:habits:v1': '{}', 'zigoals:price-alerts:v1': '{}', 'zigoals-indexeddb-pointer': 'x', 'other-site-key': 'keep'});
    const session = area({'zigoals:showcase:platform': '{}', 'theme': 'keep'});
    const deleted: string[] = [];
    const idb = {deleteDatabase: (name: string) => { deleted.push(name); const r = {} as IDBOpenDBRequest; queueMicrotask(() => (r.onsuccess as () => void)?.()); return r; }, databases: async () => [{name: 'zigoals-extra-later-v1'}, {name: 'someone-else'}]};
    const result = await eraseEverything({localStorage: local.store as never, sessionStorage: session.store as never, indexedDB: idb as never});
    expect([...local.map.keys()]).toEqual(['other-site-key']);
    expect([...session.map.keys()]).toEqual(['theme']);
    expect(result).toEqual({keys: 4, databases: KNOWN_DATABASES.length + 1, failed: []});
    expect(deleted.sort()).toEqual([...KNOWN_DATABASES, 'zigoals-extra-later-v1'].sort());
  });
  test('a database held open by another tab is reported, not hidden', async () => {
    const idb = {deleteDatabase: (name: string) => { const r = {} as IDBOpenDBRequest; queueMicrotask(() => (name === 'zigoals-ai-chats-v1' ? r.onblocked as () => void : r.onsuccess as () => void)?.()); return r; }};
    const result = await eraseEverything({localStorage: null, sessionStorage: null, indexedDB: idb as never});
    expect(result.failed).toEqual(['zigoals-ai-chats-v1']);
  });
});

// Session AK (ADR-036 A4): the device services leave first, in order, and a failing step never stops the erase.
describe('Erase everything, the device services (A4)', () => {
  test('notifications off (the Worker DELETE needs the secret still on the device), then the caches, then the queue', async () => {
    const {eraseDeviceServices} = await import('./erase-everything');
    const order: string[] = [];
    await eraseDeviceServices({turnOffNotifications: async () => { order.push('notifications'); throw Error('offline'); }, forgetOfflineCaches: async () => { order.push('caches'); }, forgetOfflineQueue: async () => { order.push('queue'); }});
    expect(order).toEqual(['notifications', 'caches', 'queue']);
  });
});
