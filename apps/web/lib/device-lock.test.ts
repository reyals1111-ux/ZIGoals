import {expect, test} from 'vitest';
import {newLock, readLock, tryPin, waitAfter, writeLock, DEVICE_LOCK_KEY} from './device-lock';

// Session AH (SE14): the optional device lock; a fictional PIN.
const memory = () => { const m = new Map<string, string>(); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }}; };
test('the PIN is kept only as a salted hash; the right PIN opens, a wrong one counts', async () => {
  const lock = await newLock('2468');
  expect(JSON.stringify(lock)).not.toContain('2468');
  expect((await tryPin(lock, '2468', 0)).ok).toBe(true);
  const wrong = await tryPin(lock, '1111', 0);
  expect(wrong).toMatchObject({ok: false, waitMs: 0, lock: {failures: 1}});
  await expect(newLock('12a4')).rejects.toThrow('Use 4 to 8 digits.');
});
test('after three wrong PINs each try waits, briefly and capped', async () => {
  expect([0, 1, 2, 3, 4, 5, 20].map(waitAfter)).toEqual([0, 0, 0, 30_000, 60_000, 120_000, 300_000]);
  let lock = await newLock('2468');
  for (let i = 0; i < 3; i++) lock = (await tryPin(lock, '0000', 1000)).lock;
  const early = await tryPin(lock, '2468', 1000 + 10_000);
  expect(early).toMatchObject({ok: false, waitMs: 20_000});
  expect((await tryPin(lock, '2468', 1000 + 30_000)).ok).toBe(true);
});
test('the record reads back, and a damaged one reads as no lock (never locks the person out)', async () => {
  const s = memory();
  writeLock(s, await newLock('2468'));
  expect(readLock(s)?.version).toBe(1);
  s.setItem(DEVICE_LOCK_KEY, '{"version":1,"hash":"x"}');
  expect(readLock(s)).toBeNull();
  writeLock(s, null);
  expect(s.m.size).toBe(0);
});
