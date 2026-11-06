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

// Session AL (BN-113, NB-145): the bot typed invalid PINs ("12ab34" twice, nine digits twice) and the old fields
// silently stripped and cut them into a valid PIN, so the lock turned on with a PIN nobody chose. Checked as typed now.
test('BN-113: a new PIN is checked exactly as typed; only two equal 4-8 digit entries turn the lock on', async () => {
  const {checkNewPin} = await import('./device-lock');
  expect(checkNewPin('12', '12')?.pin).toMatch(/4 to 8 digits \(this one has 2\)/);
  expect(checkNewPin('12ab34', '12ab34')?.pin).toMatch(/digits only/);
  expect(checkNewPin('123456789', '123456789')?.pin).toMatch(/this one has 9/);
  expect(checkNewPin(' 1234', ' 1234')?.pin).toMatch(/digits only/);
  expect(checkNewPin('1234', '1235')?.again).toMatch(/differ/);
  expect(checkNewPin('1234', '')?.again).toMatch(/again/);
  expect(checkNewPin('', '')?.pin).toBeTruthy();
  expect(checkNewPin('1234', '1234')).toBeNull();
  expect(checkNewPin('12345678', '12345678')).toBeNull();
});
