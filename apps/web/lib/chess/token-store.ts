import * as z from 'zod';
import {TOKEN_PATTERN} from './oauth';
import {revokeToken} from './lichess';
import {getAccountScope, isAccountLocked} from '../account-session';
import {readLock, UNLOCKED_SESSION_KEY} from '../device-lock';
import {isShowcase} from '../showcase-storage';
import {forgetTokens, linkedScopes, readConnection, sealConnection} from '../links/token-store';

/**
 * Session AK (ADR-036 Q8, lane C; security review M1, lane W): the Lichess connection — the token and the account name
 * Lichess gave, so the page can tell the person's colour — sealed in this browser's sign-in store
 * (lib/links/token-store.ts, `zigoals-link-tokens-v1`) exactly like Spotify's: AES-GCM with a non-extractable device key,
 * bound to the scope (the open account's id, or "local" without an account) and to "lichess". Never synced, never in
 * Export everything or a backup, never logged, and sent only to https://lichess.org in the Authorization header.
 * Nothing is read, kept or used while ZIGoals is locked (the screen lock of lib/device-lock.ts on this tab, or a locked
 * account) or in the Showcase: `lichessAccess()` says which, and every function here takes its answer.
 * `forgetLichess()` forgets the scope's connection first (so the device forgets it even offline), then asks Lichess to
 * revoke the token. The first build of Session AK kept one plaintext record for the whole device in its own database
 * (`zigoals-lichess-v1`, never released); any copy of it left on a device is revoked and deleted on sight.
 */
export const LICHESS_DATABASE = 'zigoals-lichess-v1';
export const LICHESS_SERVICE = 'lichess' as const;
export const lichessConnectionSchema = z.strictObject({
  version: z.literal(1),
  accessToken: z.string().regex(TOKEN_PATTERN),
  expiresAt: z.iso.datetime().nullable(),
  connectedAt: z.iso.datetime(),
  account: z.strictObject({id: z.string().min(1).max(40), username: z.string().min(1).max(40)}).nullable(),
});
export type LichessConnection = z.infer<typeof lichessConnectionSchema>;
export const lichessStorageAvailable = () => typeof indexedDB !== 'undefined' && !!indexedDB;

/** Whether this tab may use a Lichess connection now, and under which scope. */
export type LichessAccess = {kind: 'open'; scope: string} | {kind: 'locked'} | {kind: 'showcase'};
export type LichessAccessInputs = {showcase: boolean; accountScope: string | null; accountLocked: boolean; deviceLocked: boolean};
export function lichessAccessFrom(i: LichessAccessInputs): LichessAccess {
  if (i.showcase) return {kind: 'showcase'};
  if (i.deviceLocked) return {kind: 'locked'};
  if (i.accountScope) return i.accountLocked ? {kind: 'locked'} : {kind: 'open', scope: i.accountScope};
  return {kind: 'open', scope: 'local'};
}
/** The screen lock is on and this tab has not been unlocked (fails closed when the tab's own storage cannot be read). */
export function deviceLockedHere(): boolean {
  if (typeof window === 'undefined') return true;
  let local: Storage | null = null;
  try { local = window.localStorage; } catch { /* no lock can be set without it */ }
  if (!readLock(local)) return false;
  try { return window.sessionStorage.getItem(UNLOCKED_SESSION_KEY) !== '1'; } catch { return true; }
}
/** This tab's answer: Showcase, locked (screen lock or account), or open with the scope the connection is sealed under. */
export function lichessAccess(): LichessAccess {
  if (typeof window === 'undefined') return {kind: 'locked'};
  try { return lichessAccessFrom({showcase: isShowcase(), accountScope: getAccountScope(), accountLocked: isAccountLocked(), deviceLocked: deviceLockedHere()}); }
  catch { return {kind: 'locked'}; }
}
const refusal = (access: LichessAccess) => access.kind === 'showcase' ? 'The Showcase connects to nothing.' : 'Unlock ZIGoals to connect Lichess.';

/** The kept connection of this scope; null when locked, in the Showcase, when there is none, it cannot be read, or it has expired. */
export async function readLichessConnection(access: LichessAccess, now = Date.now()): Promise<LichessConnection | null> {
  if (access.kind !== 'open' || !lichessStorageAvailable()) return null;
  await dropLegacyLichess().catch(() => undefined);
  try {
    const parsed = lichessConnectionSchema.safeParse(await readConnection(access.scope, LICHESS_SERVICE));
    if (!parsed.success) return null;
    return parsed.data.expiresAt && Date.parse(parsed.data.expiresAt) <= now ? null : parsed.data;
  } catch { return null; }
}
export async function saveLichessConnection(access: LichessAccess, value: LichessConnection): Promise<void> {
  if (access.kind !== 'open') throw new Error(refusal(access));
  const record = lichessConnectionSchema.parse(value);
  if (!lichessStorageAvailable()) throw new Error('This browser cannot keep a Lichess connection (no IndexedDB).');
  await sealConnection(access.scope, LICHESS_SERVICE, record);
}
/** Forgets this scope's Lichess connection on this device and revokes the token at Lichess when it can be reached. */
export async function forgetLichess(access: LichessAccess, fetcher: typeof fetch = fetch): Promise<{hadToken: boolean; revoked: boolean}> {
  await dropLegacyLichess(fetcher).catch(() => undefined);
  if (access.kind !== 'open') return {hadToken: false, revoked: false};
  const kept = await readLichessConnection(access, Number.NEGATIVE_INFINITY).catch(() => null);
  await forgetTokens(access.scope, LICHESS_SERVICE).catch(() => undefined);
  if (!kept) return {hadToken: false, revoked: false};
  return {hadToken: true, revoked: await revokeToken(kept.accessToken, fetcher)};
}
/**
 * Erase everything on this device (security review L4): every scope's Lichess token is revoked at Lichess, best effort,
 * before the databases go. The person asked to erase the whole device, so every account's connection on it ends.
 */
export async function revokeEveryLichess(fetcher: typeof fetch = fetch): Promise<number> {
  if (!lichessStorageAvailable()) return 0;
  let revoked = 0;
  if (await dropLegacyLichess(fetcher).catch(() => false)) revoked++;
  for (const scope of await linkedScopes().catch(() => [] as string[])) {
    let kept: LichessConnection | null = null;
    try { const parsed = lichessConnectionSchema.safeParse(await readConnection(scope, LICHESS_SERVICE)); kept = parsed.success ? parsed.data : null; } catch { /* unreadable: the erase removes it */ }
    if (!kept) continue;
    await forgetTokens(scope, LICHESS_SERVICE).catch(() => undefined);
    if (await revokeToken(kept.accessToken, fetcher)) revoked++;
  }
  return revoked;
}

const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
/** The unreleased first build's plaintext database, opened only if it exists (never created). */
async function legacyDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB.databases === 'function' && !(await indexedDB.databases()).some(d => d.name === LICHESS_DATABASE)) return null;
  return new Promise(resolve => {
    let missing = false, request: IDBOpenDBRequest;
    try { request = indexedDB.open(LICHESS_DATABASE); } catch { resolve(null); return; }
    request.onupgradeneeded = event => { if (event.oldVersion === 0) { missing = true; request.transaction?.abort(); } };
    request.onerror = event => { if (missing) event.preventDefault(); resolve(null); };
    request.onblocked = () => resolve(null);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  });
}
/** Revokes and deletes a plaintext Lichess record left by the first build; true when it held a token that Lichess revoked. */
async function dropLegacyLichess(fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!lichessStorageAvailable()) return false;
  const db = await legacyDatabase(); if (!db) return false;
  let token: string | null = null;
  try {
    if (db.objectStoreNames.contains('connection')) {
      const value = await answer(db.transaction('connection', 'readonly').objectStore('connection').get('lichess')) as {accessToken?: unknown} | undefined;
      token = typeof value?.accessToken === 'string' && TOKEN_PATTERN.test(value.accessToken) ? value.accessToken : null;
    }
  } catch { /* unreadable: deleted below all the same */ } finally { db.close(); }
  await new Promise<void>(resolve => { try { const r = indexedDB.deleteDatabase(LICHESS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); } catch { resolve(); } });
  return token ? revokeToken(token, fetcher) : false;
}
