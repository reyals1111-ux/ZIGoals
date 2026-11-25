import {describe, expect, test} from 'vitest';
import {ACTIVITY_EXTRAS_KEY_LITERAL, AW_KCAL_CATALOG_LABELS, AW_KCAL_DISPLAY_KEYS, AW_KCAL_ERASE_KEYS, AW_KCAL_EXPORT_KEYS, AW_KCAL_PERSONAL_KEYS, AW_KCAL_RESTORE, AW_KCAL_SYNC} from './aw-kcal-keys';
import {ACTIVITY_EXTRAS, ACTIVITY_EXTRAS_KEY} from './aw-kcal/activity-extras';

/** Session AW (kcal; TIER 3 stored formats): the group's one literal equals its owner's constant, and every list names it. */
describe('Session AW kcal device keys', () => {
  test('the literal equals its owner’s constant', () => {
    expect(ACTIVITY_EXTRAS_KEY_LITERAL).toBe(ACTIVITY_EXTRAS_KEY);
    expect(ACTIVITY_EXTRAS.key).toBe('zigoals:activity-extras:v1');
  });
  test('a versioned personal key, listed for export, erase, the catalogue, restore and the Health sync consent', () => {
    expect(AW_KCAL_PERSONAL_KEYS).toEqual([ACTIVITY_EXTRAS_KEY]);
    expect(AW_KCAL_DISPLAY_KEYS).toEqual([]);
    expect(Object.values(AW_KCAL_EXPORT_KEYS)).toEqual([ACTIVITY_EXTRAS_KEY]);
    expect(AW_KCAL_ERASE_KEYS).toEqual([ACTIVITY_EXTRAS_KEY]);
    expect(AW_KCAL_CATALOG_LABELS.activityExtras[1]).toBe('Health');
    expect(AW_KCAL_RESTORE.activityExtras).toEqual(['Activity distance, effort and calories you entered', 'Health']);
    expect(AW_KCAL_SYNC.activityExtras).toEqual({section: 'health', consent: 'health'});
    expect(ACTIVITY_EXTRAS_KEY).toMatch(/^zigoals:[a-z-]+:v1$/);
  });
});
