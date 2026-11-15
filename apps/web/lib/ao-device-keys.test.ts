import {describe, expect, test} from 'vitest';
import {AO_CATALOG_LABELS, AO_DISPLAY_KEYS, AO_ERASE_KEYS, AO_EXPORT_KEYS, AO_PERSONAL_KEYS, DAY_ENDS_KEY_LITERAL} from './ao-device-keys';
import {DAY_ENDS_KEY} from './day-boundary';
import {EVERYTHING_KEYS} from './export/everything';
import {DEVICE_ONLY} from './data-health/catalog';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS} from './onboarding';
import {forgetAaDeviceRecords} from './aa-device-forget';

describe('Session AO device keys are in every registry', () => {
  test('each literal equals its owner\'s constant', () => { expect(DAY_ENDS_KEY_LITERAL).toBe(DAY_ENDS_KEY); });
  test('Export everything, the catalog, the welcome check and the account erase carry every key', () => {
    const all = [...AO_PERSONAL_KEYS, ...AO_DISPLAY_KEYS];
    for (const key of all) {
      expect(EVERYTHING_KEYS, key).toContain(key);
      expect(DEVICE_ONLY.map(e => e.key), key).toContain(key);
      expect(AO_ERASE_KEYS, key).toContain(key);
    }
    for (const key of AO_DISPLAY_KEYS) expect(NON_PERSONAL_KEYS, key).toContain(key);
    for (const key of AO_PERSONAL_KEYS) expect(DEVICE_RECORD_KEYS, key).toContain(key);
    expect(Object.keys(AO_CATALOG_LABELS).sort()).toEqual(Object.keys(AO_EXPORT_KEYS).sort());
  });
  test('the account erase removes them', () => {
    const removed: string[] = [];
    forgetAaDeviceRecords({removeItem: (k: string) => { removed.push(k); }});
    for (const key of AO_ERASE_KEYS) expect(removed, key).toContain(key);
  });
});
