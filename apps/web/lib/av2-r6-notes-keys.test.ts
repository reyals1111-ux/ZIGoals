import {describe, expect, test} from 'vitest';
import {AV2_R6_NOTES_DISPLAY_KEYS, AV2_R6_NOTES_NOT_RECORDS, LOCK_AWAY_KEY_LITERAL} from './av2-r6-notes-keys';
import {AWAY_SINCE_SESSION_KEY, LOCK_AWAY_KEY, awayLongEnough, awayWords, readLockAway, writeLockAway} from './device-lock-away';
import {DEVICE_LOCK_KEY, UNLOCKED_SESSION_KEY, newLock, readLock, writeLock} from './device-lock';
import {EVERYTHING_KEYS} from './export/everything';

/**
 * Session AV lane 2 (r6-notes; LEDGER #406, Diarium's lock after a while away): the new display key equals its owner's
 * constant; the choice reads on its own (anything else reads as never); the cover comes back only with a lock, a choice
 * and that long away; the lock's own record and check are untouched; and neither the lock nor its time away travels in
 * Export everything.
 */
const store = () => { const m = new Map<string, string>(); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }}; };
describe('the key and its registry rows', () => {
  test('the literal is the constant, a display key with its reason', () => {
    expect(LOCK_AWAY_KEY_LITERAL).toBe(LOCK_AWAY_KEY);
    expect(AV2_R6_NOTES_DISPLAY_KEYS).toEqual([LOCK_AWAY_KEY]);
    expect(Object.keys(AV2_R6_NOTES_NOT_RECORDS)).toEqual([LOCK_AWAY_KEY]);
    expect(AWAY_SINCE_SESSION_KEY.startsWith('zigoals:device-lock:')).toBe(true);
    expect(UNLOCKED_SESSION_KEY.startsWith('zigoals:device-lock:')).toBe(true);
  });
  test('never in Export everything, as the lock is not', () => {
    expect(EVERYTHING_KEYS).not.toContain(LOCK_AWAY_KEY);
    expect(EVERYTHING_KEYS).not.toContain(DEVICE_LOCK_KEY);
  });
});
describe('lock again after a while away', () => {
  test('5, 15 or 60 minutes kept; anything else reads as never', () => {
    const s = store();
    expect(readLockAway(s)).toBeNull();
    writeLockAway(s, 15); expect(readLockAway(s)).toBe(15);
    s.setItem(LOCK_AWAY_KEY, JSON.stringify({version: 1, minutes: 7})); expect(readLockAway(s)).toBeNull();
    s.setItem(LOCK_AWAY_KEY, '{oops'); expect(readLockAway(s)).toBeNull();
    writeLockAway(s, null); expect(s.m.has(LOCK_AWAY_KEY)).toBe(false);
    expect(readLockAway(null)).toBeNull();
    expect(awayWords(5)).toBe('after 5 minutes away'); expect(awayWords(null)).toBe('only when a new tab or window opens');
  });
  test('the cover comes back only with a lock, a choice and that long away', () => {
    const now = Date.UTC(2026, 10, 22, 9);
    expect(awayLongEnough(now - 15 * 60_000, now, 15, true)).toBe(true);
    expect(awayLongEnough(now - 14 * 60_000, now, 15, true)).toBe(false);
    expect(awayLongEnough(now - 60 * 60_000, now, 15, false)).toBe(false);
    expect(awayLongEnough(now - 60 * 60_000, now, null, true)).toBe(false);
    expect(awayLongEnough(null, now, 5, true)).toBe(false);
    expect(awayLongEnough(now + 60_000, now, 5, true)).toBe(false);
  });
  test('the lock itself is unchanged: its record and its check read as before beside the new key', async () => {
    const s = store(), lock = await newLock('2468');
    writeLock(s, lock); writeLockAway(s, 5);
    expect(readLock(s)).toEqual(lock);
    expect(Object.keys(JSON.parse(s.m.get(DEVICE_LOCK_KEY)!)).sort()).toEqual(['failures', 'hash', 'retryAt', 'salt', 'version']);
  });
});
