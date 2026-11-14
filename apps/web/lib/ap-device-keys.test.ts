import {describe, expect, test} from 'vitest';
import {AP_CATALOG_LABELS, AP_DISPLAY_KEYS, AP_ERASE_KEYS, AP_EXPORT_KEYS, AP_PERSONAL_KEYS, DAY_GOAL_KEY_LITERAL} from './ap-device-keys';
import {DAY_GOAL_KEY} from './checklist/day-goal';
import {DAY_GOAL_KEY_LITERAL as CORE_DAY_GOAL_KEY} from './checklist/day-goal-core';
import {EVERYTHING_KEYS} from './export/everything';
import {DEVICE_ONLY} from './data-health/catalog';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS} from './onboarding';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';

describe('Session AP device keys are in every registry', () => {
  test('each literal equals its owner\'s constant', () => { expect(DAY_GOAL_KEY_LITERAL).toBe(DAY_GOAL_KEY); expect(CORE_DAY_GOAL_KEY).toBe(DAY_GOAL_KEY); });
  test('Export everything, the catalog, the welcome check, restore and the account erase carry every key', () => {
    const all = [...AP_PERSONAL_KEYS, ...AP_DISPLAY_KEYS];
    for (const key of all) {
      expect(EVERYTHING_KEYS, key).toContain(key);
      expect(DEVICE_ONLY.map(e => e.key), key).toContain(key);
      expect(AP_ERASE_KEYS, key).toContain(key);
    }
    for (const key of AP_DISPLAY_KEYS) expect(NON_PERSONAL_KEYS, key).toContain(key);
    for (const key of AP_PERSONAL_KEYS) expect(DEVICE_RECORD_KEYS, key).toContain(key);
    expect(Object.keys(AP_CATALOG_LABELS).sort()).toEqual(Object.keys(AP_EXPORT_KEYS).sort());
    for (const key of Object.values(AP_EXPORT_KEYS)) expect(DEVICE_PARTS.map(p => p.key), key).toContain(key);
  });
  test('the account erase removes them', () => {
    const removed: string[] = [];
    forgetAaDeviceRecords({removeItem: (k: string) => { removed.push(k); }});
    for (const key of AP_ERASE_KEYS) expect(removed, key).toContain(key);
  });
});
