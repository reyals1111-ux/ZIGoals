import {z} from 'zod';

/**
 * Session AH (SE14, owner amendment 4): an optional screen lock for this device. Off unless the person turns it on.
 * It hides ZIGoals behind a PIN when a new tab or window opens; it does not encrypt anything and never makes the records
 * unreachable: "Forgot the PIN?" removes the lock after a short wait, with every record untouched. The PIN is kept only
 * as a salted PBKDF2-SHA-256 hash (WebCrypto, no dependency) in this device's own storage, never synced or exported.
 * After three wrong PINs each try waits a little longer (30 s, then 60 s, capped at 5 minutes).
 */
export const DEVICE_LOCK_KEY = 'zigoals:device-lock:v1';
export const UNLOCKED_SESSION_KEY = 'zigoals:device-lock:unlocked';
export const PIN_RULE = /^\d{4,8}$/;
export const FORGOT_WAIT_MS = 60_000;
const ITERATIONS = 120_000;
const lockSchema = z.object({version: z.literal(1), salt: z.string().regex(/^[0-9a-f]{32}$/), hash: z.string().regex(/^[0-9a-f]{64}$/), failures: z.number().int().min(0).max(1000), retryAt: z.number().int().min(0)});
export type DeviceLock = z.infer<typeof lockSchema>;

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = (text: string) => new Uint8Array(text.match(/../g)!.map(h => parseInt(h, 16)));
export async function pinHash(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: ITERATIONS}, key, 256));
}
export async function newLock(pin: string): Promise<DeviceLock> {
  if (!PIN_RULE.test(pin)) throw new Error('Use 4 to 8 digits.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return {version: 1, salt, hash: await pinHash(pin, salt), failures: 0, retryAt: 0};
}
/** The wait after a wrong PIN: none for the first three, then 30 s, doubling, at most 5 minutes. */
export const waitAfter = (failures: number) => failures < 3 ? 0 : Math.min(300_000, 30_000 * 2 ** (failures - 3));
export async function tryPin(lock: DeviceLock, pin: string, now: number): Promise<{ok: boolean; lock: DeviceLock; waitMs: number}> {
  if (now < lock.retryAt) return {ok: false, lock, waitMs: lock.retryAt - now};
  if (await pinHash(pin, lock.salt) === lock.hash) return {ok: true, lock: {...lock, failures: 0, retryAt: 0}, waitMs: 0};
  const failures = lock.failures + 1, wait = waitAfter(failures);
  return {ok: false, lock: {...lock, failures, retryAt: wait ? now + wait : 0}, waitMs: wait};
}
export function readLock(storage: Pick<Storage, 'getItem'> | null): DeviceLock | null {
  try { const raw = storage?.getItem(DEVICE_LOCK_KEY); if (!raw) return null; const parsed = lockSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data : null; } catch { return null; }
}
export function writeLock(storage: Pick<Storage, 'setItem' | 'removeItem'>, lock: DeviceLock | null) {
  if (lock) storage.setItem(DEVICE_LOCK_KEY, JSON.stringify(lockSchema.parse(lock))); else storage.removeItem(DEVICE_LOCK_KEY);
}
