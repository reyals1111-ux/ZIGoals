import * as z from 'zod';
import type {ProviderId} from './providers';

/**
 * The key store (ADR-012, [TIER 3]). A provider key the person chose to remember is sealed with a non-extractable
 * AES-GCM 256 CryptoKey that lives only in this browser's IndexedDB (`zigoals-ai-keys-v1`), bound by additional data to
 * the scope (account id or "local") and the provider, and decrypted only in memory for the moment of a request. "This
 * session only" keys live in a module-level map and vanish with the page. Honest limit: this protects a key against
 * casual reading of the profile's files and backups; it does not protect it against script running in this origin or
 * malware on the device (the same limit as ADR-008's remembered device). Nothing here touches the vault key, the wallet
 * or the recovery secret, and nothing is ever written to localStorage, a URL, a log or an error message.
 */
export const AI_KEYS_DATABASE = 'zigoals-ai-keys-v1';
const WRAP = 'wrap', KEYS = 'keys', WRAP_ID = 'device', LIMIT_MS = 3000;
/** Showcase keys are never remembered: the demo lives in the tab and leaves nothing behind. */
export const SHOWCASE_SCOPE = 'showcase';
const base64 = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const sealedKeySchema = z.strictObject({version: z.literal(1), scope: z.string().min(1).max(80), provider: z.string().min(1).max(40), iv: base64.length(16), ciphertext: base64.min(22).max(4000), createdAt: z.iso.datetime()});
export type SealedKey = z.infer<typeof sealedKeySchema>;
const memory = new Map<string, string>();
const slot = (scope: string, provider: ProviderId) => `${scope}:${provider}`;
const encode = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const aad = (scope: string, provider: ProviderId) => new TextEncoder().encode(JSON.stringify(['zigoals-ai-key', 1, scope, provider]));
const available = () => typeof indexedDB !== 'undefined' && !!indexedDB;
function limited<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false; const timer = setTimeout(() => { settled = true; reject(Error('Key storage did not answer in time.')); }, LIMIT_MS);
    work.then(value => { clearTimeout(timer); if (!settled) { settled = true; resolve(value); } }, error => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
  });
}
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error ?? Error('Key storage refused the change.')); t.onerror = () => undefined; });
/** The database if it exists, never creating it: null when this browser never remembered a key. */
async function existing(): Promise<IDBDatabase | null> {
  if (!available()) return null;
  if (typeof indexedDB.databases === 'function' && !(await limited(indexedDB.databases())).some(d => d.name === AI_KEYS_DATABASE)) return null;
  return limited(new Promise<IDBDatabase | null>((resolve, reject) => {
    let missing = false, request: IDBOpenDBRequest;
    try { request = indexedDB.open(AI_KEYS_DATABASE); } catch (error) { reject(error); return; }
    request.onupgradeneeded = event => { if (event.oldVersion === 0) { missing = true; request.transaction?.abort(); } };
    request.onerror = event => { if (missing) { event.preventDefault(); resolve(null); } else reject(request.error); };
    request.onsuccess = () => { const db = request.result; if (!db.objectStoreNames.contains(WRAP) || !db.objectStoreNames.contains(KEYS)) { db.close(); resolve(null); return; } db.onversionchange = () => db.close(); resolve(db); };
  }));
}
function writable(): Promise<IDBDatabase> {
  if (!available()) return Promise.reject(Error('Key storage is unavailable in this browser.'));
  return limited(new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(AI_KEYS_DATABASE, 1); } catch (error) { reject(error); return; }
    request.onupgradeneeded = () => { const db = request.result; for (const name of [WRAP, KEYS]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  }));
}
/** The wrapping key must be exactly what this module makes: AES-GCM 256, not extractable, encrypt and decrypt only. */
function wrapKey(value: unknown): value is CryptoKey {
  if (typeof CryptoKey === 'undefined' || !(value instanceof CryptoKey)) return false;
  const algorithm = value.algorithm as AesKeyAlgorithm;
  return value.type === 'secret' && !value.extractable && algorithm.name === 'AES-GCM' && algorithm.length === 256 && [...value.usages].sort().join(',') === 'decrypt,encrypt';
}
async function loadWrapKey(db: IDBDatabase, create: boolean): Promise<CryptoKey | null> {
  const current = await answer(db.transaction(WRAP, 'readonly').objectStore(WRAP).get(WRAP_ID));
  if (wrapKey(current)) return current;
  if (!create) return null;
  const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  const t = db.transaction(WRAP, 'readwrite'); t.objectStore(WRAP).put(key, WRAP_ID); await finished(t);
  return key;
}
/** Keeps a key for this page only. Nothing is written anywhere. */
export function holdKey(scope: string, provider: ProviderId, key: string): void { memory.set(slot(scope, provider), key); }
/** Drops every in-memory key: lock, sign-out, account switch, "Turn off ZIGi". */
export function dropMemoryKeys(): void { memory.clear(); }
/** Seals a key for this device. Refused for Showcase. The plaintext stays only in the caller's hands. */
export async function rememberKey(scope: string, provider: ProviderId, key: string): Promise<void> {
  if (scope === SHOWCASE_SCOPE) throw Error('Showcase keys are kept for this tab only.');
  if (!key) throw Error('Enter a key first.');
  const db = await writable();
  try {
    const wrap = await loadWrapKey(db, true); if (!wrap) throw Error('The key could not be protected on this device.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad(scope, provider), tagLength: 128}, wrap, new TextEncoder().encode(key)));
    const record = sealedKeySchema.parse({version: 1, scope, provider, iv: encode(iv), ciphertext: encode(ciphertext), createdAt: new Date().toISOString()});
    const t = db.transaction(KEYS, 'readwrite'); t.objectStore(KEYS).put(record, slot(scope, provider)); await finished(t);
    memory.delete(slot(scope, provider));
  } finally { db.close(); }
}
/** The key for a request: the in-memory copy, else the remembered one decrypted for this call only; null when there is none. */
export async function readKey(scope: string, provider: ProviderId): Promise<string | null> {
  const held = memory.get(slot(scope, provider)); if (held !== undefined) return held;
  const db = await existing(); if (!db) return null;
  try {
    const parsed = sealedKeySchema.safeParse(await answer(db.transaction(KEYS, 'readonly').objectStore(KEYS).get(slot(scope, provider))));
    if (!parsed.success || parsed.data.scope !== scope || parsed.data.provider !== provider) return null;
    const wrap = await loadWrapKey(db, false); if (!wrap) return null;
    try { return new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(parsed.data.iv), additionalData: aad(scope, provider), tagLength: 128}, wrap, decode(parsed.data.ciphertext))); }
    catch { return null; }
  } finally { db.close(); }
}
/** Whether a remembered (sealed) key exists for this scope and provider, without decrypting it. */
export async function hasRememberedKey(scope: string, provider: ProviderId): Promise<boolean> {
  const db = await existing(); if (!db) return false;
  try { return sealedKeySchema.safeParse(await answer(db.transaction(KEYS, 'readonly').objectStore(KEYS).get(slot(scope, provider)))).success; } finally { db.close(); }
}
/** Forgets one provider's key on this device, remembered or held. */
export async function forgetKey(scope: string, provider: ProviderId): Promise<void> {
  memory.delete(slot(scope, provider));
  const db = await existing(); if (!db) return;
  try { const t = db.transaction(KEYS, 'readwrite'); t.objectStore(KEYS).delete(slot(scope, provider)); await finished(t); } finally { db.close(); }
}
/** Forgets every key of one scope: disconnect, "Turn off ZIGi", sign-out of that account, its deletion or erase. */
export async function forgetAiKeys(scope: string): Promise<void> {
  for (const key of [...memory.keys()]) if (key.startsWith(`${scope}:`)) memory.delete(key);
  const db = await existing(); if (!db) return;
  try {
    const t = db.transaction(KEYS, 'readwrite'), store = t.objectStore(KEYS), keys = await answer(store.getAllKeys());
    for (const key of keys) if (typeof key === 'string' && key.startsWith(`${scope}:`)) store.delete(key);
    await finished(t);
  } finally { db.close(); }
}
/** The scopes that hold a remembered key (for the export test and the settings' honesty line). Never the keys themselves. */
export async function rememberedScopes(): Promise<string[]> {
  const db = await existing(); if (!db) return [];
  try { const keys = await answer(db.transaction(KEYS, 'readonly').objectStore(KEYS).getAllKeys()); return [...new Set(keys.flatMap(key => typeof key === 'string' ? [key.slice(0, key.lastIndexOf(':'))] : []))]; } finally { db.close(); }
}
