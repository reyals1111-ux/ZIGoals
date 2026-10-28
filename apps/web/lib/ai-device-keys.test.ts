import {expect, test} from 'vitest';
import {AI_ERASE_KEYS, AI_PERSONAL_KEYS} from './ai-device-keys';
import {DEVICE_RECORD_KEYS, noExistingData} from './onboarding';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {MONEY_LOG_KEY} from './money-log/schema';
import {JOURNAL_KEY} from './journal/schema';
import {ENERGY_KEY} from './energy/schema';
import {MEAL_ESTIMATES_KEY} from './meal-estimates/schema';
import {TASKS_KEY} from './tasks/schema';
import {RECEIPTS_KEY} from './portfolio/receipts';
import {IMPORTS_KEY} from './portfolio/wallet-import';
import {EXCHANGES_KEY} from './exchanges/record';
import {ZIGI_METRICS_KEY} from './ai/store/metrics';

// Session AI: this session's personal keys are the owners' constants, make a device "not new", and go with the account.
test('the literals equal the owners\' constants', () => expect(AI_PERSONAL_KEYS).toEqual([MONEY_LOG_KEY, JOURNAL_KEY, ENERGY_KEY, MEAL_ESTIMATES_KEY, TASKS_KEY, RECEIPTS_KEY, IMPORTS_KEY, EXCHANGES_KEY, ZIGI_METRICS_KEY]));
test('each one makes a device not new, and the account erase removes it', () => {
  for (const key of AI_PERSONAL_KEYS) {
    expect(DEVICE_RECORD_KEYS).toContain(key);
    const m = new Map<string, string>([[key, '{}']]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => { m.delete(k); }};
    expect(noExistingData(storage), key).toBe(false);
    forgetAaDeviceRecords(storage);
    for (const erased of AI_ERASE_KEYS) expect(m.has(erased)).toBe(false);
  }
});
