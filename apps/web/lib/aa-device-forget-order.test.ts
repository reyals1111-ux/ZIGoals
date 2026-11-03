import {readFileSync} from 'node:fs';
import {afterEach, expect, test, vi} from 'vitest';
import {forgetAaDeviceRecordsInOrder} from './aa-device-forget';

/**
 * Session AK Part 15 (F1): the account's erase used to delete `zigoals-notify-v1` (the device's push id and secret) without
 * first sending DELETE /api/push-device, so the Worker kept a registration nothing could remove. Notifications now turn
 * off first, best effort and bounded, and only then do the records and databases go.
 */
const log: string[] = [];
const storage = {removeItem: (key: string) => { log.push(`key:${key}`); }};
afterEach(() => { log.length = 0; vi.unstubAllGlobals(); });
function stubIndexedDb() { vi.stubGlobal('indexedDB', {deleteDatabase: (name: string) => { log.push(`db:${name}`); return {}; }}); }

test('notifications turn off (the DELETE with the device secret) before the notify database is deleted', async () => {
  stubIndexedDb();
  await forgetAaDeviceRecordsInOrder({turnOffNotifications: async () => { await Promise.resolve(); log.push('turn-off'); }}, storage);
  expect(log[0]).toBe('turn-off');
  expect(log).toContain('db:zigoals-notify-v1');
  expect(log.indexOf('turn-off')).toBeLessThan(log.indexOf('db:zigoals-notify-v1'));
});

test('a failing turn-off never stops the erase', async () => {
  stubIndexedDb();
  await forgetAaDeviceRecordsInOrder({turnOffNotifications: async () => { throw new Error('offline'); }}, storage);
  expect(log).toContain('db:zigoals-notify-v1');
  expect(log.some(entry => entry.startsWith('key:'))).toBe(true);
});

test('a turn-off that never answers is bounded in time', async () => {
  stubIndexedDb();
  await forgetAaDeviceRecordsInOrder({turnOffNotifications: () => new Promise<void>(() => {}), timeoutMs: 5}, storage);
  expect(log).toContain('db:zigoals-notify-v1');
});

test('the account erase in Settings uses the ordered forget with the notifications turn-off', () => {
  const controls = readFileSync(new URL('../components/vault-sync-controls.tsx', import.meta.url), 'utf8');
  const erase = controls.slice(controls.indexOf('async function eraseAccount('), controls.indexOf('return result;}', controls.indexOf('async function eraseAccount(')));
  expect(erase).toContain('forgetAaDeviceRecordsInOrder({turnOffNotifications:');
  expect(erase).toContain("import('../lib/notify/device').then(n=>n.turnOffNotifications())");
  expect(erase).not.toMatch(/m\.forgetAaDeviceRecords\(\)/);
});
