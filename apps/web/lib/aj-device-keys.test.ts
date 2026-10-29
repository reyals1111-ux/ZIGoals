import {expect, test} from 'vitest';
import {AJ_ERASE_KEYS, AJ_PERSONAL_KEYS} from './aj-device-keys';
import {DEVICE_RECORD_KEYS} from './onboarding';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {READING_SOURCES_KEY} from './wealth-sources/schema';
import {PRICE_ALERTS_KEY} from './price-alerts/schema';
import {FOCUS_SESSIONS_KEY} from './focus-sessions/schema';
import {EVERYTHING_KEYS} from './export/everything';

// Session AJ: this session's personal keys are the owners' constants, make a device "not new", go with the account, and
// are in Export everything.
test('the literals equal the owners\' constants', () => expect(AJ_PERSONAL_KEYS).toEqual([READING_SOURCES_KEY, PRICE_ALERTS_KEY, FOCUS_SESSIONS_KEY]));
test('each one makes a device not new, is exported, and the account erase removes it', async () => {
  for (const key of AJ_PERSONAL_KEYS) {
    expect(DEVICE_RECORD_KEYS).toContain(key);
    expect(EVERYTHING_KEYS).toContain(key);
    const m = new Map<string, string>([[key, '{}']]);
    await forgetAaDeviceRecords({getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k)} as Storage);
    expect(m.has(key)).toBe(false);
  }
  expect(AJ_ERASE_KEYS).toEqual(AJ_PERSONAL_KEYS);
});
