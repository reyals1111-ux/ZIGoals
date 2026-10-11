import * as z from 'zod';

/**
 * Sign-in tokens of the services a person links (Session W Parts 8 and 20, [TIER 3] (tokens)): Spotify, and the health
 * services reached through the health-link Worker (Oura, Withings, Polar, Strava). Sealed exactly like ZIGi's provider
 * keys (lib/ai/keys.ts): AES-GCM 256 with a non-extractable CryptoKey that lives only in this browser's IndexedDB
 * (`zigoals-link-tokens-v1`), bound by additional data to the scope (account id or "local") and the service, decrypted
 * only in memory for the moment of a request. Never in localStorage, a URL, a log, an error message, an export, a backup
 * or sync; removed on Disconnect, sign-out, erase and "Forget". Showcase never links anything. Honest limit (as ADR-012):
 * this protects tokens against casual reading of the profile's files, not against script in this origin or malware.
 */
export const LINK_TOKENS_DATABASE = 'zigoals-link-tokens-v1';
export const LINK_SERVICES = ['spotify', 'oura', 'withings', 'polar', 'strava'] as const;
export type LinkService = typeof LINK_SERVICES[number];
const WRAP = 'wrap', TOKENS = 'tokens', WRAP_ID = 'device', LIMIT_MS = 3000;
export const SHOWCASE_LINK_SCOPE = 'showcase';
const base64 = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const sealedTokensSchema = z.strictObject({version: z.literal(1), scope: z.string().min(1).max(80), service: z.enum(LINK_SERVICES), iv: base64.length(16), ciphertext: base64.min(22).max(16_000), createdAt: z.iso.datetime()});
/** What is sealed: the tokens and when the access token stops working. Nothing else about the person. */
export const linkTokensSchema = z.strictObject({accessToken: z.string().min(1).max(4000), refreshToken: z.string().min(1).max(4000).optional(), expiresAt: z.iso.datetime().optional(), scope: z.string().max(1000).optional()});
export type LinkTokens = z.infer<typeof linkTokensSchema>;
const slot = (scope: string, service: LinkService) => `${scope}:${service}`;
const encode = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const aad = (scope: string, service: LinkService) => new TextEncoder().encode(JSON.stringify(['zigoals-link-tokens', 1, scope, service]));
const available = () => typeof indexedDB !== 'undefined' && !!indexedDB;
function limited<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false; const timer = setTimeout(() => { settled = true; reject(Error('Sign-in storage did not answer in time.')); }, LIMIT_MS);
    work.then(value => { clearTimeout(timer); if (!settled) { settled = true; resolve(value); } }, error => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
  });
}
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error ?? Error('Sign-in storage refused the change.')); t.onerror = () => undefined; });
/** The database if it exists, never creating it: null when this browser never linked a service. */
async function existing(): Promise<IDBDatabase | null> {
  if (!available()) return null;
  if (typeof indexedDB.databases === 'function' && !(await limited(indexedDB.databases())).some(d => d.name === LINK_TOKENS_DATABASE)) return null;
  return limited(new Promise<IDBDatabase | null>((resolve, reject) => {
    let missing = false, request: IDBOpenDBRequest;
    try { request = indexedDB.open(LINK_TOKENS_DATABASE); } catch (error) { reject(error); return; }
    request.onupgradeneeded = event => { if (event.oldVersion === 0) { missing = true; request.transaction?.abort(); } };
    request.onerror = event => { if (missing) { event.preventDefault(); resolve(null); } else reject(request.error); };
    request.onsuccess = () => { const db = request.result; if (!db.objectStoreNames.contains(WRAP) || !db.objectStoreNames.contains(TOKENS)) { db.close(); resolve(null); return; } db.onversionchange = () => db.close(); resolve(db); };
  }));
}
function writable(): Promise<IDBDatabase> {
  if (!available()) return Promise.reject(Error('Sign-in storage is unavailable in this browser.'));
  return limited(new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(LINK_TOKENS_DATABASE, 1); } catch (error) { reject(error); return; }
    request.onupgradeneeded = () => { const db = request.result; for (const name of [WRAP, TOKENS]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  }));
}
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
/** Seals a service's tokens for this device (a rotated refresh token replaces the old one). Refused for Showcase. */
export async function sealTokens(scope: string, service: LinkService, tokens: LinkTokens): Promise<void> {
  if (scope === SHOWCASE_LINK_SCOPE) throw Error('Showcase does not link services.');
  const valid = linkTokensSchema.parse(tokens), db = await writable();
  try {
    const wrap = await loadWrapKey(db, true); if (!wrap) throw Error('The sign-in could not be protected on this device.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad(scope, service), tagLength: 128}, wrap, new TextEncoder().encode(JSON.stringify(valid))));
    const record = sealedTokensSchema.parse({version: 1, scope, service, iv: encode(iv), ciphertext: encode(ciphertext), createdAt: new Date().toISOString()});
    const t = db.transaction(TOKENS, 'readwrite'); t.objectStore(TOKENS).put(record, slot(scope, service)); await finished(t);
  } finally { db.close(); }
}
/** The tokens for one request, decrypted for this call only; null when there are none or they cannot be opened. */
export async function readTokens(scope: string, service: LinkService): Promise<LinkTokens | null> {
  const db = await existing(); if (!db) return null;
  try {
    const parsed = sealedTokensSchema.safeParse(await answer(db.transaction(TOKENS, 'readonly').objectStore(TOKENS).get(slot(scope, service))));
    if (!parsed.success || parsed.data.scope !== scope || parsed.data.service !== service) return null;
    const wrap = await loadWrapKey(db, false); if (!wrap) return null;
    try { return linkTokensSchema.parse(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(parsed.data.iv), additionalData: aad(scope, service), tagLength: 128}, wrap, decode(parsed.data.ciphertext))))); }
    catch { return null; }
  } finally { db.close(); }
}
/** Whether a service is linked for this scope, without decrypting anything. */
export async function hasTokens(scope: string, service: LinkService): Promise<boolean> {
  const db = await existing(); if (!db) return false;
  try { return sealedTokensSchema.safeParse(await answer(db.transaction(TOKENS, 'readonly').objectStore(TOKENS).get(slot(scope, service)))).success; } finally { db.close(); }
}
/** Disconnect: forgets one service's tokens on this device. */
export async function forgetTokens(scope: string, service: LinkService): Promise<void> {
  const db = await existing(); if (!db) return;
  try { const t = db.transaction(TOKENS, 'readwrite'); t.objectStore(TOKENS).delete(slot(scope, service)); await finished(t); } finally { db.close(); }
}
/** Sign-out of an account, its deletion or erase, "Forget": every service's tokens of one scope. */
export async function forgetLinkTokens(scope: string): Promise<void> {
  const db = await existing(); if (!db) return;
  try {
    const t = db.transaction(TOKENS, 'readwrite'), store = t.objectStore(TOKENS), keys = await answer(store.getAllKeys());
    for (const key of keys) if (typeof key === 'string' && key.startsWith(`${scope}:`)) store.delete(key);
    await finished(t);
  } finally { db.close(); }
}
/** The scopes that hold linked services (for tests and the settings' honesty line). Never the tokens themselves. */
export async function linkedScopes(): Promise<string[]> {
  const db = await existing(); if (!db) return [];
  try { const keys = await answer(db.transaction(TOKENS, 'readonly').objectStore(TOKENS).getAllKeys()); return [...new Set(keys.flatMap(key => typeof key === 'string' ? [key.slice(0, key.lastIndexOf(':'))] : []))]; } finally { db.close(); }
}
