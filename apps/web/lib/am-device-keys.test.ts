import {describe, expect, test} from 'vitest';
import {AM_CATALOG_LABELS, AM_DISPLAY_KEYS, AM_ERASE_KEYS, AM_EXPORT_KEYS, AM_PERSONAL_KEYS, NOVA_STAGE_KEY_LITERAL, NOVA_WORLD_KEY_LITERAL} from './am-device-keys';
import {NOVA_STAGE, NOVA_STAGE_KEY} from './nova/stage/record';
import {NOVA_WORLD, NOVA_WORLD_KEY, NOVA_WORLD_RESTORE, novaWorldRestoreSchema} from './nova/world/record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, NOVA_PARTLY_SYNCED_LABEL, SYNCED} from './data-health/catalog';
import {NOVA_KEY, novaRecordSchema} from './nova/store';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {collectSection} from './vault/extras-sync';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';
import {backupFormatVersion} from './vault/backup';

// Session AM (ADR-038 D16, D17): every key this session adds is wired into the shared registries (the
// lib/al-device-keys.test.ts checks, for this session's module); D18: the stage record also travels in encrypted sync.
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
  // Session AM (D18, deliberate): the stage record travels in the encrypted `nova` extras section, so the catalog lists
  // it once under "synced" (account consent) and not as device-only (was: every key of this session on this device
  // only). The outside-data record is still on this device only, checked as strictly as before.
  test('the data catalog lists each key once, with its label and area: the stage record synced, the outside-data record on this device only', () => {
    expect(Object.keys(AM_CATALOG_LABELS).sort()).toEqual(Object.keys(AM_EXPORT_KEYS).sort());
    expect(Object.entries(AM_EXPORT_KEYS).map(([name, key]) => [name, key, SYNCED.some(entry => entry.key === key)])).toEqual([['novaStage', NOVA_STAGE_KEY, true], ['novaWorld', NOVA_WORLD_KEY, false]]);
    for (const [name, key] of Object.entries(AM_EXPORT_KEYS)) {
      const [label, area] = (AM_CATALOG_LABELS as Record<string, readonly [string, string]>)[name]!;
      const synced = key === NOVA_STAGE_KEY;
      expect((synced ? SYNCED : DEVICE_ONLY).filter(entry => entry.key === key)).toEqual([{key, label, home: synced ? 'sync' : 'device', area}]);
      expect((synced ? DEVICE_ONLY : SYNCED).map(entry => entry.key)).not.toContain(key);
    }
  });
  // Session AM (D18, deliberate): `zigoals:nova:v1` was "this device only" in the catalog. Two of its fields travel now,
  // so it is listed once, with the synced records, under a label that names what travels and what stays; exactly those
  // two fields travel and every other field of the record never does.
  test('zigoals:nova:v1 is listed once, as partly synced: exactly the layout and the pinned widgets travel, every other field never', () => {
    expect([...SYNCED, ...DEVICE_ONLY].filter(entry => entry.key === NOVA_KEY)).toEqual([{key: NOVA_KEY, label: NOVA_PARTLY_SYNCED_LABEL, home: 'sync', area: 'NOVA'}]);
    expect(SYNCED.filter(entry => entry.key === NOVA_KEY)).toHaveLength(1);
    expect(NOVA_PARTLY_SYNCED_LABEL).toBe('NOVA: layout and pinned widgets (quick access, persona, names, instructions and side bars stay on this device)');
    const own = EXTRAS_SECTIONS.flatMap(s => s.records).filter(r => r.spec.key === NOVA_KEY);
    expect(own.map(r => r.syncFields)).toEqual([['layout', 'widgets']]);
    const fields = Object.keys(novaRecordSchema.shape).filter(f => f !== 'version');
    expect(fields.filter(f => !own[0]!.syncFields!.includes(f)).sort()).toEqual([...own[0]!.deviceFields!].sort());
    // Every field at once, and one a later build might add: only the two leave the device.
    const {storage} = memory();
    storage.setItem(NOVA_KEY, JSON.stringify({version: 1, openingSeen: true, layout: 'focus', widgets: [{id: 'orbit', size: 'M', slot: 0}], dock: {order: ['today']}, persona: {name: 'Fictional'}, accent: 'gold', customInstructions: 'Fictional', shortcuts: true, yourName: 'Fictional', panels: {left: 'rail'}, routing: 'auto', wake: true, startOnNova: true, addedLater: 1}));
    const collected = collectSection(storage, EXTRAS_SECTIONS.find(s => s.name === 'nova')!);
    expect(collected.records[NOVA_KEY]).toEqual({layout: 'focus', widgets: [{id: 'orbit', size: 'M', slot: 0}]});
    // No other NOVA key is in any section: the outside-data record and AK's and AL's NOVA records stay on the device.
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key)).filter(key => key.includes('nova')).sort()).toEqual([NOVA_STAGE_KEY, NOVA_KEY].sort());
    for (const key of [NOVA_WORLD_KEY, 'zigoals:nova-bridge:v1', 'zigoals:nova-briefs:v1', 'zigoals:nova-workflows:v1', 'zigoals:nova-setup:v1', 'zigoals:nova-hermes:v1', 'zigoals:nova-hud:v1']) expect(DEVICE_ONLY.filter(entry => entry.key === key).map(entry => entry.home), key).toEqual(['device']);
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
  // Session AM (AM-S9, deliberate): the weather record is restored through its own restore reader (was: NOVA_WORLD's
  // schema, label 'NOVA weather choice and place'). The reader brings the place and never the switch, the reading or the
  // time of the last ask, so the label names the place only. The stage record is checked exactly as before.
  test('a restore brings each record back with its own reader, in Today and Life, outside the Health choice; the weather record through the reader that never brings the switch', () => {
    const expected = [
      {name: 'novaStage', key: NOVA_STAGE_KEY, label: 'NOVA requests and made widgets', schema: NOVA_STAGE.schema},
      {name: 'novaWorld', key: NOVA_WORLD_KEY, label: 'NOVA weather place', schema: NOVA_WORLD_RESTORE.schema},
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
    // The restore reader is not the device's reader: same key and empty value, another schema; the device's own reader keeps the switch.
    expect(NOVA_WORLD_RESTORE.schema).toBe(novaWorldRestoreSchema);
    expect(NOVA_WORLD_RESTORE.schema).not.toBe(NOVA_WORLD.schema);
    expect([NOVA_WORLD_RESTORE.key, NOVA_WORLD_RESTORE.empty()]).toEqual([NOVA_WORLD.key, NOVA_WORLD.empty()]);
    const part = DEVICE_PARTS.find(p => p.key === NOVA_WORLD_KEY)!;
    const reading = {lat: 50.85, lon: 4.35, fetchedAt: '2026-11-11T09:00:00.000Z', expires: '2026-11-11T09:30:00.000Z', now: {at: '2026-11-11T09:00:00.000Z', t: 7, symbol: 'cloudy'}, hours: [], days: []};
    const full = {version: 1, on: true, place: {name: 'Brussels', lat: 50.85, lon: 4.35}, reading, askedAt: '2026-11-11T09:00:00.000Z'};
    expect(NOVA_WORLD.schema.parse(full)).toEqual(full);
    expect(part.schema.parse(full)).toEqual({version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}});
    // A crafted file cannot say "on" in any spelling the device's reader would take, and a switch without a place restores as nothing.
    for (const crafted of [{version: 1, on: true}, {version: 1, on: true, askedAt: '2026-11-11T09:00:00.000Z'}, {version: 1, on: true, reading}]) expect(part.schema.parse(crafted), JSON.stringify(crafted)).toEqual({version: 1});
    for (const refused of [{version: 1, on: 'yes', place: full.place}, {version: 2, place: full.place}]) expect(part.schema.safeParse(refused).success, JSON.stringify(refused)).toBe(false);
  });
  // Session AM (AM-S9, deliberate): the fresh device gets the stage record back whole, as before, and of the weather record
  // the place only (was: the whole record, `on: true` included, under the label 'NOVA weather choice and place'). The
  // switch, the reading and the time of the last ask are not in the backup either. Still format 4.
  test('the encrypted backup carries both in its Today and Life section, still format 4; a fresh device gets the stage record back whole and the weather place without the switch', () => {
    const stage = {version: 1, made: [{id: 'weight', at: '2026-11-11T09:00:00.000Z'}], params: {weight: {range: 'month'}}, asks: [{id: 'a1', at: '2026-11-11T09:00:00.000Z', text: 'What is my weight progress this month?', widgets: ['weight'], device: 'computer', by: 'device'}]};
    const reading = {lat: 50.85, lon: 4.35, fetchedAt: '2026-11-11T09:00:00.000Z', expires: '2026-11-11T09:30:00.000Z', now: {at: '2026-11-11T09:00:00.000Z', t: 7, symbol: 'cloudy'}, hours: [], days: []};
    const world = {version: 1, on: true, place: {name: 'Brussels', lat: 50.85, lon: 4.35}, reading, askedAt: '2026-11-11T09:00:00.000Z'};
    const here = memory();
    here.storage.setItem(NOVA_STAGE_KEY, JSON.stringify(stage)); here.storage.setItem(NOVA_WORLD_KEY, JSON.stringify(world));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections)).toEqual(['lifeRecords']);
    expect(backupFormatVersion(Object.keys(sections))).toBe(4);
    const carried = (JSON.parse(sections.lifeRecords!) as {records: Record<string, unknown>}).records;
    expect(Object.keys(carried).sort()).toEqual(['device:novaStage', 'device:novaWorld']);
    expect(carried['device:novaStage']).toEqual(stage);
    // The backup itself holds the place and nothing else of the weather record.
    expect(carried['device:novaWorld']).toEqual({version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}});
    // Making the backup changes nothing on this device: its switch and reading stay.
    expect(JSON.parse(here.m.get(NOVA_WORLD_KEY)!)).toEqual(world);
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'lifeRecords', sections.lifeRecords!)).toEqual({restored: ['NOVA requests and made widgets', 'NOVA weather place'], skipped: 0});
    expect(JSON.parse(fresh.m.get(NOVA_STAGE_KEY)!)).toEqual(stage);
    const restored = JSON.parse(fresh.m.get(NOVA_WORLD_KEY)!);
    expect(restored).toEqual({version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}});
    for (const field of ['on', 'reading', 'askedAt']) expect(restored, field).not.toHaveProperty(field);
    // A backup made by a build from before this fix (or a crafted one) that says "on": the place arrives, the switch does not.
    const older = JSON.stringify({format: 'zigoals-device-records-backup', version: 1, records: {'device:novaWorld': world}});
    const other = memory();
    expect(restoreRecordSection(other.storage, 'lifeRecords', older)).toEqual({restored: ['NOVA weather place'], skipped: 0});
    expect(JSON.parse(other.m.get(NOVA_WORLD_KEY)!)).toEqual({version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}});
    // A record that is only its empty value is not carried; a switch with no place is nothing to carry either.
    const empty = memory();
    empty.storage.setItem(NOVA_STAGE_KEY, JSON.stringify(NOVA_STAGE.empty())); empty.storage.setItem(NOVA_WORLD_KEY, JSON.stringify(NOVA_WORLD.empty()));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
    empty.storage.setItem(NOVA_WORLD_KEY, JSON.stringify({version: 1, on: true}));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
  });
});
