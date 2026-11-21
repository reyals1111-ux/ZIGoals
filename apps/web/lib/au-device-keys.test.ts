import {describe, expect, test} from 'vitest';
import {AU_CATALOG_LABELS, AU_DISPLAY_KEYS, AU_ERASE_KEYS, AU_EXPORT_KEYS, AU_PERSONAL_KEYS, MEAL_WORDS_KEY_LITERAL} from './au-device-keys';
import {MEAL_WORDS, MEAL_WORDS_KEY, addMealWords, emptyMealWords} from './meal-words/schema';
import {MOOD_TAGS_KEY} from './mood-tags/schema';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {RESTORE_KEYS} from './restore/apply';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';

// Session AU (ADR-044 F-MEAL; TIER 3 stored format): meals logged in words alone are wired into every shared registry (the
// lib/ar-device-keys.test.ts checks, for this session's module), classed as Health-type data like the mood tags, and
// never travel in encrypted sync.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AU_PERSONAL_KEYS, ...AU_DISPLAY_KEYS];
const lunch = addMealWords(emptyMealWords(), {id: 'words_t1', date: '2026-11-19', meal: 'Lunch', words: 'Soup and bread', at: '2026-11-19T12:30:00.000Z'});

describe('Session AU device keys', () => {
  test('the literal equals its owner\'s constant', () => {
    expect(MEAL_WORDS_KEY_LITERAL).toBe(MEAL_WORDS_KEY);
    expect(MEAL_WORDS.key).toBe('zigoals:meal-words:v1');
  });
  test('a versioned personal key: a device holding it is not new', () => {
    expect(all).toEqual([MEAL_WORDS_KEY_LITERAL]);
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    expect(DEVICE_RECORD_KEYS).toContain(MEAL_WORDS_KEY); expect(NON_PERSONAL_KEYS).not.toContain(MEAL_WORDS_KEY);
    const {storage} = memory(); storage.setItem(MEAL_WORDS_KEY, JSON.stringify(lunch));
    expect(noExistingData(storage)).toBe(false);
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(Object.values(AU_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AU_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists it once, in Health, on this device only; no encrypted sync section carries it', () => {
    expect(Object.keys(AU_CATALOG_LABELS).sort()).toEqual(Object.keys(AU_EXPORT_KEYS).sort());
    const [label, area] = AU_CATALOG_LABELS.mealWords;
    expect(area).toBe('Health');
    expect(DEVICE_ONLY.filter(entry => entry.key === MEAL_WORDS_KEY)).toEqual([{key: MEAL_WORDS_KEY, label, home: 'device', area}]);
    expect(SYNCED.map(entry => entry.key)).not.toContain(MEAL_WORDS_KEY);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(MEAL_WORDS_KEY);
  });
  test('the account erase removes it and leaves other records alone', () => {
    expect([...AU_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    storage.setItem(MEAL_WORDS_KEY, JSON.stringify(lunch));
    storage.setItem('zigoals:unrelated-au-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    expect(m.has(MEAL_WORDS_KEY)).toBe(false);
    expect(m.has('zigoals:unrelated-au-test:v1')).toBe(true);
  });
  test('a restore brings it back with its own reader, in Health, only with the Health choice (as the mood tags)', () => {
    expect(RESTORE_KEYS).toContain(MEAL_WORDS_KEY);
    const parts = DEVICE_PARTS.filter(part => part.key === MEAL_WORDS_KEY);
    expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: part.health}))).toEqual([{id: 'device:mealWords', name: 'mealWords', label: 'Meals in your own words', group: 'Health', health: true}]);
    expect(DEVICE_PARTS.find(part => part.key === MOOD_TAGS_KEY)?.health).toBe(true);
    expect(parts[0]!.schema).toBe(MEAL_WORDS.schema);
    expect(sectionOf(parts[0]!)).toBe('healthRecords');
    // A crafted file: a version this build does not know is refused; a field from a newer build is kept.
    expect(parts[0]!.schema.safeParse({version: 2, entries: []}).success).toBe(false);
    expect(parts[0]!.schema.safeParse({version: 1, entries: [{...lunch.entries[0], meal: 'Brunch'}]}).success).toBe(false);
    expect(parts[0]!.schema.parse({...lunch, later: true})).toEqual({...lunch, later: true});
  });
  test('the encrypted backup carries it only in its Health section, only when Health is included; a fresh device gets it back', () => {
    const here = memory();
    here.storage.setItem(MEAL_WORDS_KEY, JSON.stringify(lunch));
    expect(exportRecordSections(here.storage, {health: false}).sections).toEqual({});
    const {sections, warnings} = exportRecordSections(here.storage, {health: true});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections)).toEqual(['healthRecords']);
    expect((JSON.parse(sections.healthRecords!) as {records: Record<string, unknown>}).records).toEqual({'device:mealWords': lunch});
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'healthRecords', sections.healthRecords!)).toEqual({restored: ['Meals in your own words'], skipped: 0});
    expect(JSON.parse(fresh.m.get(MEAL_WORDS_KEY)!)).toEqual(lunch);
    const empty = memory();
    empty.storage.setItem(MEAL_WORDS_KEY, JSON.stringify(emptyMealWords()));
    expect(exportRecordSections(empty.storage, {health: true}).sections).toEqual({});
  });
});
