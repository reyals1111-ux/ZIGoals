import {describe, expect, test} from 'vitest';
import {AM_CATALOG_LABELS, AM_DISPLAY_KEYS, AM_ERASE_KEYS, AM_EXPORT_KEYS, AM_PERSONAL_KEYS, NOVA_STAGE_KEY_LITERAL, NOVA_WORLD_KEY_LITERAL} from './am-device-keys';
import {NOVA_STAGE, NOVA_STAGE_KEY} from './nova/stage/record';
import {NOVA_WORLD, NOVA_WORLD_KEY} from './nova/world/record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';
import {backupFormatVersion} from './vault/backup';

// Session AM (ADR-038 D16, D17): every key this session adds is wired into the shared registries, device only (the
// lib/al-device-keys.test.ts checks, for this session's module).
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AM_PERSONAL_KEYS, ...AM_DISPLAY_KEYS];

describe('Session AM device keys', () => {
  test('the literals equal the owners\' constants', () => {
    expect(NOVA_STAGE_KEY_LITERAL).toBe(NOVA_STAGE_KEY);
    expect(NOVA_STAGE.key).toBe(NOVA_STAGE_KEY_LITERAL);
    expect(NOVA_WORLD_KEY_LITERAL).toBe(NOVA_WORLD_KEY);
    expect(NOVA_WORLD.key).toBe(NOVA_WORLD_KEY_LITERAL);
  });
  test('versioned keys; personal ones make a device not new, display ones do not', () => {
    expect([...all].sort()).toEqual([NOVA_STAGE_KEY_LITERAL, NOVA_WORLD_KEY_LITERAL].sort());
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    for (const key of AM_PERSONAL_KEYS) { expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key); }
    for (const key of AM_DISPLAY_KEYS) {
      expect(NON_PERSONAL_KEYS).toContain(key); expect(DEVICE_RECORD_KEYS).not.toContain(key);
      const {storage} = memory(); storage.setItem(key, JSON.stringify({version: 1}));
      expect(noExistingData(storage), key).toBe(true);
    }
    for (const key of AM_PERSONAL_KEYS) {
      const {storage} = memory(); storage.setItem(key, JSON.stringify({version: 1}));
      expect(noExistingData(storage), key).toBe(false);
    }
  });
  test('in Export everything under its own names, never a synced module key', () => {
    expect(Object.values(AM_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AM_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists each key once, on this device only, with its label and area', () => {
    expect(Object.keys(AM_CATALOG_LABELS).sort()).toEqual(Object.keys(AM_EXPORT_KEYS).sort());
    for (const [name, key] of Object.entries(AM_EXPORT_KEYS)) {
      const [label, area] = (AM_CATALOG_LABELS as Record<string, readonly [string, string]>)[name]!;
      expect(DEVICE_ONLY.filter(entry => entry.key === key)).toEqual([{key, label, home: 'device', area}]);
      expect(SYNCED.map(entry => entry.key)).not.toContain(key);
    }
  });
  test('the account erase removes every key and leaves other records alone', () => {
    expect([...AM_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    for (const key of all) storage.setItem(key, JSON.stringify({version: 1}));
    storage.setItem('zigoals:unrelated-am-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    for (const key of all) expect(m.has(key), key).toBe(false);
    expect(m.has('zigoals:unrelated-am-test:v1')).toBe(true);
  });
  test('a restore brings each record back with its own reader, in Today and Life, outside the Health choice', () => {
    const expected = [
      {name: 'novaStage', key: NOVA_STAGE_KEY, label: 'NOVA requests and made widgets', schema: NOVA_STAGE.schema},
      {name: 'novaWorld', key: NOVA_WORLD_KEY, label: 'NOVA weather choice and place', schema: NOVA_WORLD.schema},
    ];
    for (const want of expected) {
      const parts = DEVICE_PARTS.filter(part => part.key === want.key);
      expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: part.health}))).toEqual([{id: `device:${want.name}`, name: want.name, label: want.label, group: 'Today and Life', health: false}]);
      expect(parts[0]!.schema).toBe(want.schema);
      // The export's name and the restore's name are one name, so "Restore from a backup" finds the record in everything.json.
      expect((AM_EXPORT_KEYS as Record<string, string>)[want.name]).toBe(want.key);
      // The encrypted backup (format 4) carries it in its Today and Life section, by the same judgement.
      expect(sectionOf(parts[0]!)).toBe('lifeRecords');
    }
  });
  test('the encrypted backup carries both in its Today and Life section, still format 4, and a fresh device gets them back', () => {
    const stage = {version: 1, made: [{id: 'weight', at: '2026-11-11T09:00:00.000Z'}], params: {weight: {range: 'month'}}, asks: [{id: 'a1', at: '2026-11-11T09:00:00.000Z', text: 'What is my weight progress this month?', widgets: ['weight'], device: 'computer', by: 'device'}]};
    const world = {version: 1, on: true, place: {name: 'Brussels', lat: 50.85, lon: 4.35}};
    const here = memory();
    here.storage.setItem(NOVA_STAGE_KEY, JSON.stringify(stage)); here.storage.setItem(NOVA_WORLD_KEY, JSON.stringify(world));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections)).toEqual(['lifeRecords']);
    expect(backupFormatVersion(Object.keys(sections))).toBe(4);
    expect(Object.keys((JSON.parse(sections.lifeRecords!) as {records: Record<string, unknown>}).records).sort()).toEqual(['device:novaStage', 'device:novaWorld']);
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'lifeRecords', sections.lifeRecords!)).toEqual({restored: ['NOVA requests and made widgets', 'NOVA weather choice and place'], skipped: 0});
    expect(JSON.parse(fresh.m.get(NOVA_STAGE_KEY)!)).toEqual(stage);
    expect(JSON.parse(fresh.m.get(NOVA_WORLD_KEY)!)).toEqual(world);
    // A record that is only its empty value is not carried.
    const empty = memory();
    empty.storage.setItem(NOVA_STAGE_KEY, JSON.stringify(NOVA_STAGE.empty())); empty.storage.setItem(NOVA_WORLD_KEY, JSON.stringify(NOVA_WORLD.empty()));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
  });
});
