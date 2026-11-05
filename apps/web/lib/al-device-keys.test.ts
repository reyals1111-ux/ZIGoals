import {describe, expect, test} from 'vitest';
import {AL_CATALOG_LABELS, AL_DISPLAY_KEYS, AL_ERASE_KEYS, AL_EXPORT_KEYS, AL_PERSONAL_KEYS, APPS_PREFS_KEY_LITERAL} from './al-device-keys';
import {APPS_PREFS_KEY} from './ui-prefs/apps';
import {WALLET_NAMES_KEY} from './staking/tracked-wallets';
import {PUZZLE_PROGRESS_KEY} from './chess/puzzle';
import {NOVA_HUD_KEY} from './nova/layout';
import {HEALTH_EXTRAS_KEY} from './health-extras';
import {STABLECOINS_AS_CASH_KEY} from './wealth';
import {PUZZLE_LOG_KEY} from './chess/puzzle-log';
import {TVL_HISTORY_KEY} from './zigchain-eco/tvl-history';
import {PROFILE_NAME_KEY} from './onboarding-setup';
import {WATCHLIST_MORE_KEY} from './markets-watchlist-more';
import {CHESS_PUZZLE_KEY_LITERAL, HEALTH_EXTRAS_KEY_LITERAL, NOVA_HUD_KEY_LITERAL, PROFILE_NAME_KEY_LITERAL, WATCHLIST_MORE_KEY_LITERAL, PUZZLE_LOG_KEY_LITERAL, STABLECOINS_AS_CASH_KEY_LITERAL, TVL_HISTORY_KEY_LITERAL, WALLET_NAMES_KEY_LITERAL} from './al-device-keys';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {NEVER_RESTORED} from './restore/plan';

// Session AL (ADR-037): every key this session adds is wired into the shared registries, device only (the
// lib/af-lead-registries.test.ts checks, for this session's module).
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AL_PERSONAL_KEYS, ...AL_DISPLAY_KEYS];

describe('Session AL device keys', () => {
  test('the literals equal the owners\' constants', () => {
    expect(APPS_PREFS_KEY_LITERAL).toBe(APPS_PREFS_KEY);
    expect(WALLET_NAMES_KEY_LITERAL).toBe(WALLET_NAMES_KEY);
    expect(CHESS_PUZZLE_KEY_LITERAL).toBe(PUZZLE_PROGRESS_KEY);
    expect(NOVA_HUD_KEY_LITERAL).toBe(NOVA_HUD_KEY);
    expect(HEALTH_EXTRAS_KEY_LITERAL).toBe(HEALTH_EXTRAS_KEY);
    expect(STABLECOINS_AS_CASH_KEY_LITERAL).toBe(STABLECOINS_AS_CASH_KEY);
    expect(PUZZLE_LOG_KEY_LITERAL).toBe(PUZZLE_LOG_KEY);
    expect(TVL_HISTORY_KEY_LITERAL).toBe(TVL_HISTORY_KEY);
    expect(PROFILE_NAME_KEY_LITERAL).toBe(PROFILE_NAME_KEY);
    expect(WATCHLIST_MORE_KEY_LITERAL).toBe(WATCHLIST_MORE_KEY);
  });
  test('versioned keys; personal ones make a device not new, display ones do not', () => {
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    for (const key of AL_PERSONAL_KEYS) { expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key); }
    for (const key of AL_DISPLAY_KEYS) {
      expect(NON_PERSONAL_KEYS).toContain(key); expect(DEVICE_RECORD_KEYS).not.toContain(key);
      const {storage} = memory(); storage.setItem(key, JSON.stringify({version: 1}));
      expect(noExistingData(storage), key).toBe(true);
    }
    for (const key of AL_PERSONAL_KEYS) {
      const {storage} = memory(); storage.setItem(key, JSON.stringify({version: 1}));
      expect(noExistingData(storage), key).toBe(false);
    }
  });
  test('in Export everything under its own names, never a synced module key', () => {
    expect(Object.values(AL_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AL_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists each key once, on this device only, with its label and area', () => {
    for (const [name, key] of Object.entries(AL_EXPORT_KEYS)) {
      const [label, area] = (AL_CATALOG_LABELS as Record<string, readonly [string, string]>)[name]!;
      expect(DEVICE_ONLY.filter(entry => entry.key === key)).toEqual([{key, label, home: 'device', area}]);
      expect(SYNCED.map(entry => entry.key)).not.toContain(key);
    }
  });
  test('the account erase removes every key and leaves other records alone', () => {
    expect([...AL_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    for (const key of all) storage.setItem(key, JSON.stringify({version: 1}));
    storage.setItem('zigoals:unrelated-al-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    for (const key of all) expect(m.has(key), key).toBe(false);
    expect(m.has('zigoals:unrelated-al-test:v1')).toBe(true);
  });
  test('display choices are never restored (the restore plan says so)', () => {
    expect(NEVER_RESTORED).toContain('display choices');
  });
});
