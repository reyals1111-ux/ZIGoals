import {describe, expect, it} from 'vitest';
import {areaOfKey, areasOf, listAreas, OTHER_AREA} from './erase-areas';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {MODULE_KEYS} from './export/everything';

describe('Session AV lane 2 (CR-19): Erase names each area it erased, in the export catalogue\'s areas', () => {
  it('names a record by its catalogue area, on this device, in an account and as a recovery copy', () => {
    expect(areaOfKey(MODULE_KEYS.habits)).toBe('Habits');
    expect(areaOfKey(`zigoals:account:v1:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${MODULE_KEYS.health}`)).toBe('Health');
    expect(areaOfKey(`${MODULE_KEYS.finance}:recovery:11111111-1111-4111-8111-111111111111`)).toBe('Goals & Wealth');
    expect(areaOfKey('zigoals:some-cache:v1')).toBe(OTHER_AREA);
  });
  it('every catalogue entry is named by its own area', () => {
    for (const e of [...SYNCED, ...DEVICE_ONLY]) expect(areaOfKey(e.key)).toBe(e.area);
  });
  it('lists each area once, in the catalogue\'s order, the rest last', () => {
    const areas = areasOf(['zigoals:x:v1', MODULE_KEYS.health, MODULE_KEYS.habits, MODULE_KEYS.habits]);
    expect(areas).toEqual(['Habits', 'Health', OTHER_AREA]);
    expect(listAreas(areas)).toBe(`Habits, Health and ${OTHER_AREA}`);
    expect(listAreas(['Today'])).toBe('Today');
    expect(areasOf([])).toEqual([]);
  });
});
