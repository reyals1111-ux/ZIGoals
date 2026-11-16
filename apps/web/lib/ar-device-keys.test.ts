import {describe, expect, test} from 'vitest';
import {AR_CATALOG_LABELS, AR_DISPLAY_KEYS, AR_ERASE_KEYS, AR_EXPORT_KEYS, AR_PERSONAL_KEYS, TODAY_ORBITS_KEY_LITERAL} from './ar-device-keys';
import {TODAY_ORBITS, TODAY_ORBITS_KEY, setOrbitsShown} from './today-orbits/record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';
import {backupFormatVersion} from './vault/backup';

// Session AR (6b; TIER 3 stored format): "Your orbits" on Today is wired into every shared registry (the
// lib/am2-device-keys.test.ts checks, for this session's module), and it never travels in encrypted sync.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AR_PERSONAL_KEYS, ...AR_DISPLAY_KEYS];
const on = setOrbitsShown(TODAY_ORBITS.empty(), true);

describe('Session AR device keys', () => {
  test('the literal equals its owner\'s constant', () => {
    expect(TODAY_ORBITS_KEY_LITERAL).toBe(TODAY_ORBITS_KEY);
    expect(TODAY_ORBITS.key).toBe('zigoals:today-orbits:v1');
  });
  test('a versioned display key: a device holding only it is still new', () => {
    expect(all).toEqual([TODAY_ORBITS_KEY_LITERAL]);
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    expect(NON_PERSONAL_KEYS).toContain(TODAY_ORBITS_KEY); expect(DEVICE_RECORD_KEYS).not.toContain(TODAY_ORBITS_KEY);
    const {storage} = memory(); storage.setItem(TODAY_ORBITS_KEY, JSON.stringify(on));
    expect(noExistingData(storage)).toBe(true);
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(Object.values(AR_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AR_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists it once, on this device only; no encrypted sync section carries it', () => {
    expect(Object.keys(AR_CATALOG_LABELS).sort()).toEqual(Object.keys(AR_EXPORT_KEYS).sort());
    const [label, area] = AR_CATALOG_LABELS.todayOrbits;
    expect(DEVICE_ONLY.filter(entry => entry.key === TODAY_ORBITS_KEY)).toEqual([{key: TODAY_ORBITS_KEY, label, home: 'device', area}]);
    expect(SYNCED.map(entry => entry.key)).not.toContain(TODAY_ORBITS_KEY);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(TODAY_ORBITS_KEY);
  });
  test('the account erase removes it and leaves other records alone', () => {
    expect([...AR_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    storage.setItem(TODAY_ORBITS_KEY, JSON.stringify(on));
    storage.setItem('zigoals:unrelated-ar-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    expect(m.has(TODAY_ORBITS_KEY)).toBe(false);
    expect(m.has('zigoals:unrelated-ar-test:v1')).toBe(true);
  });
  test('a restore brings it back with its own reader, in Today and Life, outside the Health choice', () => {
    const parts = DEVICE_PARTS.filter(part => part.key === TODAY_ORBITS_KEY);
    expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: part.health}))).toEqual([{id: 'device:todayOrbits', name: 'todayOrbits', label: 'Your orbits on Today', group: 'Today and Life', health: false}]);
    expect(parts[0]!.schema).toBe(TODAY_ORBITS.schema);
    expect(sectionOf(parts[0]!)).toBe('lifeRecords');
    // A crafted file: a version this build does not know is refused; a field from a newer build is kept.
    expect(parts[0]!.schema.safeParse({version: 2, shown: true}).success).toBe(false);
    expect(parts[0]!.schema.safeParse({version: 1, shown: 'yes'}).success).toBe(false);
    expect(parts[0]!.schema.parse({version: 1, shown: true, size: 'S'})).toEqual({version: 1, shown: true, size: 'S'});
  });
  test('the encrypted backup carries it in its Today and Life section, still format 4; a fresh device gets it back', () => {
    const here = memory();
    here.storage.setItem(TODAY_ORBITS_KEY, JSON.stringify(on));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections)).toEqual(['lifeRecords']);
    expect(backupFormatVersion(Object.keys(sections))).toBe(4);
    expect((JSON.parse(sections.lifeRecords!) as {records: Record<string, unknown>}).records).toEqual({'device:todayOrbits': on});
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'lifeRecords', sections.lifeRecords!)).toEqual({restored: ['Your orbits on Today'], skipped: 0});
    expect(JSON.parse(fresh.m.get(TODAY_ORBITS_KEY)!)).toEqual(on);
    // The record at its empty value (off, never chosen) is not carried.
    const empty = memory();
    empty.storage.setItem(TODAY_ORBITS_KEY, JSON.stringify(TODAY_ORBITS.empty()));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
  });
});
