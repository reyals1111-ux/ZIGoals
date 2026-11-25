import {describe, expect, test} from 'vitest';
import {AW_X7_CATALOG_LABELS, AW_X7_DISPLAY_KEYS, AW_X7_ERASE_KEYS, AW_X7_EXPORT_KEYS, AW_X7_NEVER_RESTORED, AW_X7_NOT_RECORDS, AW_X7_PERSONAL_KEYS, MONEY_REMOVED_KEY_LITERAL} from './aw-x7-money-keys';
import {MONEY_REMOVED, MONEY_REMOVED_KEY} from './money-log/removed';

/** Session AW X7 (money): the literal equals its owner's constant, and each registry row names it as intended. */
describe('round 7 X7 money device key', () => {
  test('the literal is the owner\'s constant', () => {
    expect(MONEY_REMOVED_KEY_LITERAL).toBe(MONEY_REMOVED_KEY);
    expect(MONEY_REMOVED.key).toBe(MONEY_REMOVED_KEY_LITERAL);
  });
  test('personal, erased, catalogued, never exported or restored', () => {
    expect(AW_X7_PERSONAL_KEYS).toEqual([MONEY_REMOVED_KEY]);
    expect(AW_X7_DISPLAY_KEYS).toEqual([]);
    expect(AW_X7_ERASE_KEYS).toEqual([MONEY_REMOVED_KEY]);
    expect(Object.values(AW_X7_EXPORT_KEYS)).not.toContain(MONEY_REMOVED_KEY);
    expect(AW_X7_NEVER_RESTORED).toEqual([MONEY_REMOVED_KEY]);
    expect(Object.keys(AW_X7_NOT_RECORDS)).toEqual([MONEY_REMOVED_KEY]);
    expect(AW_X7_CATALOG_LABELS.moneyRemoved[1]).toBe('Goals and Wealth');
  });
  test('wired by the integrator: the welcome check, the account erase and the catalogue, never Export everything', async () => {
    const {DEVICE_RECORD_KEYS} = await import('./onboarding');
    const {forgetAaDeviceRecords} = await import('./aa-device-forget');
    const {DEVICE_ONLY, KEPT_NOT_EXPORTED} = await import('./data-health/catalog');
    const {EVERYTHING_KEYS} = await import('./export/everything');
    const {NEVER_RESTORED} = await import('./restore/plan');
    expect(DEVICE_RECORD_KEYS).toContain(MONEY_REMOVED_KEY);
    const removed: string[] = [];
    forgetAaDeviceRecords({removeItem: (key: string) => { removed.push(key); }});
    expect(removed).toContain(MONEY_REMOVED_KEY);
    expect(DEVICE_ONLY.find(e => e.key === MONEY_REMOVED_KEY)).toEqual({key: MONEY_REMOVED_KEY, label: AW_X7_CATALOG_LABELS.moneyRemoved[0], home: 'device', area: 'Goals and Wealth'});
    expect(KEPT_NOT_EXPORTED).toContain(MONEY_REMOVED_KEY);
    expect(EVERYTHING_KEYS).not.toContain(MONEY_REMOVED_KEY);
    expect(NEVER_RESTORED).toContain('money entries you removed (Removed recently)');
  });
});
