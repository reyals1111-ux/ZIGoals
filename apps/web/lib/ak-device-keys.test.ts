import {expect, test} from 'vitest';
import {AK_DATABASES, AK_ERASE_KEYS, AK_PERSONAL_KEYS} from './ak-device-keys';
import {forgetAaDeviceRecords, ERASED_DATABASES} from './aa-device-forget';
import {NOTIFY_KEY} from './notify/prefs';
import {NOTIFY_ACTIONS_DB, NOTIFY_DB} from './notify/db';
import {GENERIC_FOOD_DATABASE} from './food-generic/store';
import {MUSIC_MIX_KEY} from './music/mix-store';
import {EVERYTHING_KEYS} from './export/everything';
import {KNOWN_DATABASES} from './erase-everything';

// Session AK: this session's keys are the owners' constants, are exported, and go with the account's erase.
test('the literals equal the owners\' constants', () => {
  expect(AK_PERSONAL_KEYS).toEqual([NOTIFY_KEY, MUSIC_MIX_KEY]);
  expect(AK_DATABASES).toEqual([NOTIFY_DB, NOTIFY_ACTIONS_DB, GENERIC_FOOD_DATABASE, 'zigoals-music-byo-v1']);
});
test('each key is exported and the account erase removes it; each database is erased by both erases', async () => {
  for (const key of AK_PERSONAL_KEYS) {
    expect(EVERYTHING_KEYS).toContain(key);
    const m = new Map<string, string>([[key, '{}']]);
    forgetAaDeviceRecords({getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k)} as Storage);
    expect(m.has(key)).toBe(false);
  }
  expect(AK_ERASE_KEYS).toEqual(AK_PERSONAL_KEYS);
  for (const db of AK_DATABASES) { expect(KNOWN_DATABASES).toContain(db); expect(ERASED_DATABASES).toContain(db); }
});
