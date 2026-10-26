import {expect, test} from 'vitest';
import {AH_DISPLAY_KEYS, AH_ERASE_KEYS, AH_PERSONAL_KEYS, AH_VIEW_CHOICES} from './ah-device-keys';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {WORKOUTS_KEY} from './workouts/schema';
import {LAST_VISIT_KEY} from './portfolio/last-visit';
import {HIDE_AMOUNTS_KEY} from '../components/hide-amounts';

// Session AH: this session's device keys are the owners' constants, in the welcome check, and erased with the account.
test('the literals equal the owners\' constants', () => {
  expect(AH_PERSONAL_KEYS).toEqual([WORKOUTS_KEY, LAST_VISIT_KEY]);
  expect(AH_DISPLAY_KEYS).toContain(HIDE_AMOUNTS_KEY);
  expect(AH_VIEW_CHOICES.length).toBe(4);
});

test('personal keys make a device not new and go with the account; display keys do neither', () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => { m.delete(k); }};
  for (const key of AH_PERSONAL_KEYS) { expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key); }
  for (const key of AH_DISPLAY_KEYS) { expect(NON_PERSONAL_KEYS).toContain(key); expect(DEVICE_RECORD_KEYS).not.toContain(key); m.set(key, '1'); }
  expect(noExistingData(storage)).toBe(true);
  for (const key of AH_PERSONAL_KEYS) m.set(key, '{}');
  expect(noExistingData(storage)).toBe(false);
  forgetAaDeviceRecords(storage);
  for (const key of AH_ERASE_KEYS) expect(m.has(key)).toBe(false);
  for (const key of AH_DISPLAY_KEYS) expect(m.has(key)).toBe(true);
});
