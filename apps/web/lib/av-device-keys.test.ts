import {describe, expect, test} from 'vitest';
import {AV_CATALOG_LABELS, AV_DISPLAY_KEYS, AV_ERASE_KEYS, AV_EXPORT_KEYS, AV_PERSONAL_KEYS, COUNTDOWN_EXTRAS_KEY_LITERAL} from './av-device-keys';
import {COUNTDOWN_EXTRAS, COUNTDOWN_EXTRAS_KEY, emptyCountdownExtras, withExtra} from './countdowns/extras';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {RESTORE_KEYS} from './restore/apply';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';

// Session AV (ADR-045 F-COUNTDOWN-YEARLY; TIER 3 stored format): the yearly countdowns' record is wired into every shared
// registry (the lib/au-device-keys.test.ts checks, for this session's module), restored with "Today and Life", and never
// travels in encrypted sync.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AV_PERSONAL_KEYS, ...AV_DISPLAY_KEYS];
const birthday = withExtra(emptyCountdownExtras(), 'countdown_t1', {yearly: true, remindDays: 7});

describe('Session AV device keys', () => {
  test('the literal equals its owner\'s constant', () => {
    expect(COUNTDOWN_EXTRAS_KEY_LITERAL).toBe(COUNTDOWN_EXTRAS_KEY);
    expect(COUNTDOWN_EXTRAS.key).toBe('zigoals:countdown-extras:v1');
  });
  test('a versioned personal key: a device holding it is not new', () => {
    expect(all).toEqual([COUNTDOWN_EXTRAS_KEY_LITERAL]);
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    expect(DEVICE_RECORD_KEYS).toContain(COUNTDOWN_EXTRAS_KEY); expect(NON_PERSONAL_KEYS).not.toContain(COUNTDOWN_EXTRAS_KEY);
    const {storage} = memory(); storage.setItem(COUNTDOWN_EXTRAS_KEY, JSON.stringify(birthday));
    expect(noExistingData(storage)).toBe(false);
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(Object.values(AV_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AV_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists it once, in Today, on this device only; no encrypted sync section carries it', () => {
    expect(Object.keys(AV_CATALOG_LABELS).sort()).toEqual(Object.keys(AV_EXPORT_KEYS).sort());
    const [label, area] = AV_CATALOG_LABELS.countdownExtras;
    expect(area).toBe('Today');
    expect(DEVICE_ONLY.filter(entry => entry.key === COUNTDOWN_EXTRAS_KEY)).toEqual([{key: COUNTDOWN_EXTRAS_KEY, label, home: 'device', area}]);
    expect(SYNCED.map(entry => entry.key)).not.toContain(COUNTDOWN_EXTRAS_KEY);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(COUNTDOWN_EXTRAS_KEY);
  });
  test('the account erase removes it and leaves other records alone', () => {
    expect([...AV_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    storage.setItem(COUNTDOWN_EXTRAS_KEY, JSON.stringify(birthday));
    storage.setItem('zigoals:unrelated-av-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    expect(m.has(COUNTDOWN_EXTRAS_KEY)).toBe(false);
    expect(m.has('zigoals:unrelated-av-test:v1')).toBe(true);
  });
  test('a restore brings it back with its own reader, with "Today and Life"', () => {
    expect(RESTORE_KEYS).toContain(COUNTDOWN_EXTRAS_KEY);
    const parts = DEVICE_PARTS.filter(part => part.key === COUNTDOWN_EXTRAS_KEY);
    expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: !!part.health}))).toEqual([{id: 'device:countdownExtras', name: 'countdownExtras', label: 'Days until: yearly and reminders', group: 'Today and Life', health: false}]);
    expect(parts[0]!.schema).toBe(COUNTDOWN_EXTRAS.schema);
    // A crafted file: a version this build does not know is refused; a field from a newer build is kept; a bad value is dropped.
    expect(parts[0]!.schema.safeParse({version: 2, items: {}}).success).toBe(false);
    expect(parts[0]!.schema.parse({...birthday, later: true})).toEqual({...birthday, later: true});
    expect(COUNTDOWN_EXTRAS.schema.parse({version: 1, items: {c: {yearly: 'often', remindDays: 99}}})).toEqual({version: 1, items: {c: {}}});
  });
  test('the encrypted backup carries it in its own section; a fresh device gets it back', () => {
    const part = DEVICE_PARTS.find(p => p.key === COUNTDOWN_EXTRAS_KEY)!, section = sectionOf(part)!;
    expect(section).toBeTruthy();
    const here = memory();
    here.storage.setItem(COUNTDOWN_EXTRAS_KEY, JSON.stringify(birthday));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    expect((JSON.parse(sections[section]!) as {records: Record<string, unknown>}).records['device:countdownExtras']).toEqual(birthday);
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, section, sections[section]!).restored).toContain('Days until: yearly and reminders');
    expect(JSON.parse(fresh.m.get(COUNTDOWN_EXTRAS_KEY)!)).toEqual(birthday);
  });
});
