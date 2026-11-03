import {describe, expect, test} from 'vitest';
import {AF_CHECKLIST_CATALOG_LABELS, AF_CHECKLIST_EXPORT_KEYS, AF_CHECKLIST_NEVER_RESTORED, AF_CHECKLIST_PERSONAL_KEYS} from './af-checklist-keys';
import {EARN_CATALOG_LABELS, EARN_DISPLAY_KEYS, EARN_ERASE_KEYS, EARN_EXPORT_KEYS, EARN_PERSONAL_KEYS} from './af-earn-keys';
import {SIGNING_CHUNK3_ROWS, STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY} from './af-signing-keys';
import {AF_ZIGI_CATALOG_LABELS, AF_ZIGI_DISPLAY_KEYS, AF_ZIGI_ERASE_KEYS, AF_ZIGI_EXPORT_KEYS, AF_ZIGI_NEVER_RESTORED, AF_ZIGI_PERSONAL_KEYS} from './af-zigi-keys';
import {AF_EXTRAS_CATALOG_LABELS, AF_EXTRAS_DISPLAY_KEYS, AF_EXTRAS_ERASE_KEYS, AF_EXTRAS_EXPORT_KEYS, AF_EXTRAS_NEVER_RESTORED, AF_EXTRAS_PERSONAL_KEYS} from './af-extras-keys';
import {WALLET_CATALOG_LABELS, WALLET_ERASE_KEYS, WALLET_EXPORT_KEYS, WALLET_NEVER_RESTORED, WALLET_PERSONAL_KEYS} from './af-wallet-keys';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {NEVER_RESTORED} from './restore/plan';

// Session AF (the lead, ADR-028 H73): the positive half of the lanes' never-synced guards. Each lane named its keys in an
// append-only module and could not assert the shared registries before the lead wired them; this proves every row landed:
// the welcome check, Export everything, the data catalog (device only, never synced), the account erase and the restore
// plan's "never restored" sentence.
const memory = () => { const m = new Map<string, string>(); return {m, storage: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage}; };
const lanes = [
  {lane: 'Checklist (L3)', personal: [...AF_CHECKLIST_PERSONAL_KEYS], display: [] as string[], exportKeys: AF_CHECKLIST_EXPORT_KEYS as Record<string, string>, labels: AF_CHECKLIST_CATALOG_LABELS as Record<string, readonly [string, string]>, erase: [...AF_CHECKLIST_PERSONAL_KEYS]},
  {lane: 'Native staking (L2a)', personal: [STAKING_JOURNAL_KEY, ...SIGNING_CHUNK3_ROWS.personal], display: [STAKING_PREFS_KEY], exportKeys: {stakingJournal: STAKING_JOURNAL_KEY, stakingPrefs: STAKING_PREFS_KEY, ...SIGNING_CHUNK3_ROWS.exportNames} as Record<string, string>, labels: {stakingJournal: ['Staking and vote transactions', 'Wallet'], stakingPrefs: ['Staking choices: practice or real', 'Wallet'], validatorAlerts: [SIGNING_CHUNK3_ROWS.catalogLabels.validatorAlerts[0]!, SIGNING_CHUNK3_ROWS.catalogLabels.validatorAlerts[1]!]} as Record<string, readonly [string, string]>, erase: [STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY]},
  {lane: 'Wallets and Goal Vaults (L2b)', personal: [...WALLET_PERSONAL_KEYS], display: [] as string[], exportKeys: WALLET_EXPORT_KEYS as Record<string, string>, labels: WALLET_CATALOG_LABELS as Record<string, readonly [string, string]>, erase: [...WALLET_ERASE_KEYS]},
  {lane: 'ZIGi (L4)', personal: [...AF_ZIGI_PERSONAL_KEYS], display: [...AF_ZIGI_DISPLAY_KEYS], exportKeys: AF_ZIGI_EXPORT_KEYS as Record<string, string>, labels: AF_ZIGI_CATALOG_LABELS as Record<string, readonly [string, string]>, erase: [...AF_ZIGI_ERASE_KEYS]},
  {lane: 'Extras (L5b)', personal: [...AF_EXTRAS_PERSONAL_KEYS], display: [...AF_EXTRAS_DISPLAY_KEYS], exportKeys: AF_EXTRAS_EXPORT_KEYS as Record<string, string>, labels: AF_EXTRAS_CATALOG_LABELS as Record<string, readonly [string, string]>, erase: [...AF_EXTRAS_ERASE_KEYS]},
  {lane: 'Earn (L1)', personal: [...EARN_PERSONAL_KEYS], display: [...EARN_DISPLAY_KEYS], exportKeys: EARN_EXPORT_KEYS as Record<string, string>, labels: EARN_CATALOG_LABELS as Record<string, readonly [string, string]>, erase: [...EARN_ERASE_KEYS]},
];

describe('Session AF lanes: every device key is wired into the shared registries, device only', () => {
  for (const {lane, personal, display, exportKeys, labels, erase} of lanes) {
    const all = [...personal, ...display];
    test(`${lane}: versioned keys; personal ones make a device not new, display ones do not`, () => {
      expect(all.length).toBeGreaterThan(0);
      for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v1$/);
      for (const key of personal) { expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key); }
      for (const key of display) { expect(NON_PERSONAL_KEYS).toContain(key); expect(DEVICE_RECORD_KEYS).not.toContain(key); }
      for (const key of personal) {
        const {storage} = memory();
        expect(noExistingData(storage)).toBe(true);
        storage.setItem(key, JSON.stringify({version: 1}));
        expect(noExistingData(storage), key).toBe(false);
      }
      for (const key of display) {
        const {storage} = memory();
        storage.setItem(key, JSON.stringify({version: 1}));
        expect(noExistingData(storage), key).toBe(true);
      }
    });
    test(`${lane}: in Export everything under its own names, never a synced module key`, () => {
      expect(Object.values(exportKeys).sort()).toEqual([...all].sort());
      for (const [name, key] of Object.entries(exportKeys)) {
        expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
        expect(EVERYTHING_KEYS).toContain(key);
        expect(Object.values(MODULE_KEYS)).not.toContain(key);
      }
    });
    test(`${lane}: the data catalog lists each key once, on this device only, with the lane's label and area`, () => {
      for (const [name, key] of Object.entries(exportKeys)) {
        // Session AK (8.10, AFL8): the Checklist's two keys travel in the encrypted extras section `checklist`, so the
        // catalog lists each once under "synced" (account consent), with the lane's label and area, and not as device-only.
        const synced = lane === 'Checklist (L3)';
        expect((synced ? SYNCED : DEVICE_ONLY).filter(entry => entry.key === key)).toEqual([{key, label: labels[name]![0], home: synced ? 'sync' : 'device', area: labels[name]![1]}]);
        expect((synced ? DEVICE_ONLY : SYNCED).map(entry => entry.key)).not.toContain(key);
      }
    });
    test(`${lane}: the account erase removes every key and leaves other records alone`, () => {
      expect([...erase].sort()).toEqual([...all].sort());
      const {m, storage} = memory();
      for (const key of all) storage.setItem(key, JSON.stringify({version: 1}));
      storage.setItem('zigoals:unrelated-af-test:v1', '{}');
      forgetAaDeviceRecords(storage);
      for (const key of all) expect(m.has(key), key).toBe(false);
      expect(m.has('zigoals:unrelated-af-test:v1')).toBe(true);
    });
  }
  test('the restore plan says neither lane\'s records come back', () => {
    expect(NEVER_RESTORED).toContain(AF_CHECKLIST_NEVER_RESTORED);
    expect(NEVER_RESTORED).toContain('Earn progress and choices');
    expect(NEVER_RESTORED).toContain('the staking journal and the practice/real choice');
    expect(NEVER_RESTORED).toContain('validator health alerts');
    expect(NEVER_RESTORED).toContain(AF_ZIGI_NEVER_RESTORED);
    expect(NEVER_RESTORED).toContain(AF_EXTRAS_NEVER_RESTORED);
    for (const words of WALLET_NEVER_RESTORED) expect(NEVER_RESTORED).toContain(words);
  });
});
