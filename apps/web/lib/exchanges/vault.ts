import type {ExchangeId} from './allowlist';

/**
 * Session AI (J14, owner amendment 3): an exchange key is kept on this device only, encrypted with a non-extractable
 * AES-GCM-256 key that lives in IndexedDB (`zigoals-exchange-keys-v1`) and can never be read out; the sealed record is
 * bound to its exchange (additional data). The secret is never in localStorage, never in Export everything, never synced
 * and never logged; it is decrypted for one signing and dropped. "Remove exchange" deletes its record; the account's
 * erase and "Erase everything" delete the whole database (`forgetAllExchangeKeys`).
 */
export const EXCHANGE_KEYS_DATABASE = 'zigoals-exchange-keys-v1';
const WRAP = 'wrap', KEYS = 'keys', WRAP_ID = 'device';
export type ExchangeSecret = {keyId: string; secret: string};
const enc = new TextEncoder(), dec = new TextDecoder();
const aad = (exchange: ExchangeId) => enc.encode(JSON.stringify(['zigoals-exchange-key', 1, exchange]));
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error ?? Error('Key storage refused the change.')); });
function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(Error('Key storage is unavailable in this browser.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(EXCHANGE_KEYS_DATABASE, 1);
    request.onupgradeneeded = () => { const db = request.result; for (const name of [WRAP, KEYS]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  });
}
async function wrapKey(db: IDBDatabase, create: boolean): Promise<CryptoKey | null> {
  const current = await answer(db.transaction(WRAP, 'readonly').objectStore(WRAP).get(WRAP_ID)) as unknown;
  if (current instanceof CryptoKey && !current.extractable && (current.algorithm as AesKeyAlgorithm).name === 'AES-GCM') return current;
  if (!create) return null;
  const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  const t = db.transaction(WRAP, 'readwrite'); t.objectStore(WRAP).put(key, WRAP_ID); await finished(t);
  return key;
}
/** Seals one exchange's key id and secret on this device (replacing an earlier one). */
export async function sealExchangeKey(exchange: ExchangeId, value: ExchangeSecret): Promise<void> {
  const db = await open();
  try {
    const wrap = await wrapKey(db, true); if (!wrap) throw Error('The key could not be protected on this device.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad(exchange)}, wrap, enc.encode(JSON.stringify(value)));
    const t = db.transaction(KEYS, 'readwrite'); t.objectStore(KEYS).put({version: 1, exchange, iv, ciphertext, at: new Date().toISOString()}, exchange); await finished(t);
  } finally { db.close(); }
}
/** The key for one signing, or null; a record bound to another exchange or that does not decrypt reads as none. */
export async function openExchangeKey(exchange: ExchangeId): Promise<ExchangeSecret | null> {
  const db = await open();
  try {
    const record = await answer(db.transaction(KEYS, 'readonly').objectStore(KEYS).get(exchange)) as {exchange?: string; iv?: Uint8Array<ArrayBuffer>; ciphertext?: ArrayBuffer} | undefined;
    if (!record || record.exchange !== exchange || !record.iv || !record.ciphertext) return null;
    const wrap = await wrapKey(db, false); if (!wrap) return null;
    try { const value = JSON.parse(dec.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: record.iv, additionalData: aad(exchange)}, wrap, record.ciphertext))) as ExchangeSecret; return typeof value.keyId === 'string' && typeof value.secret === 'string' ? value : null; }
    catch { return null; }
  } finally { db.close(); }
}
/** "Remove exchange": its sealed key goes. */
export async function forgetExchangeKey(exchange: ExchangeId): Promise<void> {
  const db = await open();
  try { const t = db.transaction(KEYS, 'readwrite'); t.objectStore(KEYS).delete(exchange); await finished(t); } finally { db.close(); }
}
/** The account's erase and "Erase everything": the whole database, wrapping key included. */
export function forgetAllExchangeKeys(): Promise<void> {
  return new Promise(resolve => { try { const r = indexedDB.deleteDatabase(EXCHANGE_KEYS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); } catch { resolve(); } });
}
