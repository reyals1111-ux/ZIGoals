import {z} from 'zod';

/**
 * Session AV lane 2 (r6-notes; LEDGER #406, Diarium's lock after a while away; TIER 3 (auth: the device lock) and TIER 3
 * (stored format), a new device key): "Lock again after 5, 15 or 60 minutes away". When ZIGoals comes back after being
 * hidden that long in the same tab, the existing screen cover (lib/device-lock.ts) is shown again and asks for the same
 * PIN. Nothing about the lock changes: no new key material, no new crypto, the same salted PBKDF2 check, the same
 * "Forgot the PIN?" way out; a new tab or window still asks as before. It only ever covers the screen sooner; it never
 * opens it. Kept in its own small display key beside the lock (the lock's record is a strict object that an older build
 * would rewrite without a field it does not know), never synced or exported, as the lock is not. When ZIGoals went
 * hidden is kept for this tab only (sessionStorage), so a tab the browser reloads after a long time away asks too.
 */
export const LOCK_AWAY_KEY = 'zigoals:device-lock-away:v1';
export const AWAY_SINCE_SESSION_KEY = 'zigoals:device-lock:away-since';
export const AWAY_CHOICES = [5, 15, 60] as const;
export type AwayMinutes = (typeof AWAY_CHOICES)[number];
const awaySchema = z.looseObject({version: z.literal(1), minutes: z.union([z.literal(5), z.literal(15), z.literal(60)])});
/** The chosen minutes away, or null (never: the cover waits for a new tab, as before). */
export function readLockAway(storage: Pick<Storage, 'getItem'> | null): AwayMinutes | null {
  try { const raw = storage?.getItem(LOCK_AWAY_KEY); if (!raw) return null; const parsed = awaySchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data.minutes : null; } catch { return null; }
}
export function writeLockAway(storage: Pick<Storage, 'setItem' | 'removeItem'>, minutes: AwayMinutes | null) {
  if (minutes) storage.setItem(LOCK_AWAY_KEY, JSON.stringify(awaySchema.parse({version: 1, minutes}))); else storage.removeItem(LOCK_AWAY_KEY);
}
/** Whether the cover comes back: a lock is set, a time away is chosen, and ZIGoals was hidden at least that long. */
export function awayLongEnough(awaySince: number | null, now: number, minutes: AwayMinutes | null, hasLock: boolean): boolean {
  return hasLock && !!minutes && awaySince !== null && Number.isFinite(awaySince) && awaySince <= now && now - awaySince >= minutes * 60_000;
}
export const awayWords = (m: AwayMinutes | null) => m ? `after ${m} minutes away` : 'only when a new tab or window opens';
