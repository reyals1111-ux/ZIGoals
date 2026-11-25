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
});
