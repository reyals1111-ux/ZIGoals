import {beforeEach, expect, test, vi} from 'vitest';
import {futureEntriesMessage} from '../components/legacy-restore-clock';
import {LOCAL_LEDGER_KEY, restoreLocalSimulation} from './vault/local-simulation-backup';
import {applyLocal, initialLedger} from './local-ledger';

// QA-36 (Session I, Part 10): the five-minute guard stays; a refused legacy restore now says the device clock is behind.
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }
beforeEach(() => { vi.stubGlobal('navigator', {locks: {request: async (_key: string, work: () => unknown) => work()}}); });
const NOW = Date.parse('2026-10-01T12:00:00.000Z');
const section = (at: string) => JSON.stringify({schemaVersion: 1, kind: 'zigoals-local-simulation', ledger: JSON.stringify(applyLocal(initialLedger(), {kind: 'create'}, at)), plans: null});

test('a backup made on a device whose clock was ahead is still refused, and the message names the clock and the latest time', async () => {
  vi.useFakeTimers({now: NOW, toFake: ['Date']});
  try {
    const ahead = section('2026-10-01T13:00:00.000Z'), storage = memoryStorage();
    await expect(restoreLocalSimulation(storage, ahead)).rejects.toThrow();
    expect(storage.getItem(LOCAL_LEDGER_KEY)).toBeNull();
    expect(futureEntriesMessage(ahead, NOW, iso => iso)).toBe("This backup has entries dated after this device's clock (latest: 2026-10-01T13:00:00.000Z). Check the device's date and time, then try again. Nothing was changed.");
  } finally { vi.useRealTimers(); }
});

test('within the five-minute allowance, or in the past, there is no clock message', () => {
  expect(futureEntriesMessage(section('2026-10-01T12:04:59.000Z'), NOW)).toBeNull();
  expect(futureEntriesMessage(section('2026-09-30T08:00:00.000Z'), NOW)).toBeNull();
  expect(futureEntriesMessage('{"not":"a backup"}', NOW)).toBeNull();
});
