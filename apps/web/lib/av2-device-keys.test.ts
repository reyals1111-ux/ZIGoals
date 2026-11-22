import {describe, expect, test} from 'vitest';
import {AV2_CATALOG_LABELS, AV2_DISPLAY_KEYS, AV2_ERASE_KEYS, AV2_EXPORT_KEYS, AV2_PERSONAL_KEYS, BUDGET_PERIODS_KEY_LITERAL, TASK_AREA_KEY_LITERAL, TASK_PLAN_KEY_LITERAL, TASK_TEMPLATES_KEY_LITERAL} from './av2-device-keys';
import {TASK_PLAN, TASK_PLAN_KEY} from './tasks/plan-record';
import {TASK_TEMPLATES, TASK_TEMPLATES_KEY} from './tasks/templates';
import {BUDGET_PERIODS, BUDGET_PERIODS_KEY} from './budgets/periods';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {RESTORE_KEYS} from './restore/apply';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';

// Session AV lane 2 (owner follow-up 4; TIER 3 stored formats): lane 2's device records are wired into every shared
// registry (the lib/av-device-keys.test.ts checks, for lane 2's module), restored with their group, never synced.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const RECORDS = [
  {name: 'taskPlan', key: TASK_PLAN_KEY, spec: TASK_PLAN, sample: {version: 1, dayLimit: 300, dailyGoal: 5}, group: 'Today and Life', label: 'Tasks: planning choices and timers'},
  {name: 'taskTemplates', key: TASK_TEMPLATES_KEY, spec: TASK_TEMPLATES, sample: {version: 1, items: [{id: 'tpl_1', name: 'Moving', createdAt: '2026-11-22T10:00:00.000Z', items: [{title: 'Book a van'}]}]}, group: 'Today and Life', label: 'Tasks: project templates'},
  {name: 'budgetPeriods', key: BUDGET_PERIODS_KEY, spec: BUDGET_PERIODS, sample: {version: 1, payday: 25}, group: 'Goals and Wealth', label: 'Budgets: pay periods and the paycheck fill'},
] as const;

describe('Session AV lane 2 device keys', () => {
  test('each literal equals its owner\'s constant', () => {
    expect([TASK_PLAN_KEY_LITERAL, TASK_TEMPLATES_KEY_LITERAL, BUDGET_PERIODS_KEY_LITERAL]).toEqual([TASK_PLAN_KEY, TASK_TEMPLATES_KEY, BUDGET_PERIODS_KEY]);
    for (const r of RECORDS) expect(r.spec.key).toBe(r.key);
  });
  test('versioned personal keys: a device holding one is not new; the area choice is a display key', () => {
    for (const key of AV2_PERSONAL_KEYS) {
      expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
      expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key);
    }
    for (const r of RECORDS) { const {storage} = memory(); storage.setItem(r.key, JSON.stringify(r.sample)); expect(noExistingData(storage)).toBe(false); }
    expect(AV2_DISPLAY_KEYS).toEqual([TASK_AREA_KEY_LITERAL]);
    expect(NON_PERSONAL_KEYS).toContain(TASK_AREA_KEY_LITERAL); expect(DEVICE_RECORD_KEYS).not.toContain(TASK_AREA_KEY_LITERAL);
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(Object.values(AV2_EXPORT_KEYS).sort()).toEqual([...AV2_PERSONAL_KEYS].sort());
    for (const [name, key] of Object.entries(AV2_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists each once, on this device only; no encrypted sync section carries one', () => {
    expect(Object.keys(AV2_CATALOG_LABELS).sort()).toEqual(Object.keys(AV2_EXPORT_KEYS).sort());
    for (const [name, [label, area]] of Object.entries(AV2_CATALOG_LABELS)) {
      const key = (AV2_EXPORT_KEYS as Record<string, string>)[name]!;
      expect(DEVICE_ONLY.filter(entry => entry.key === key)).toEqual([{key, label, home: 'device', area}]);
      expect(SYNCED.map(entry => entry.key)).not.toContain(key);
      expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(key);
    }
  });
  test('the account erase removes them and leaves other records alone', () => {
    expect([...AV2_ERASE_KEYS].sort()).toEqual([...AV2_PERSONAL_KEYS, ...AV2_DISPLAY_KEYS].sort());
    const {m, storage} = memory();
    for (const key of AV2_ERASE_KEYS) storage.setItem(key, '{"version":1}');
    storage.setItem('zigoals:unrelated-av2-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    for (const key of AV2_ERASE_KEYS) expect(m.has(key)).toBe(false);
    expect(m.has('zigoals:unrelated-av2-test:v1')).toBe(true);
  });
  test('a restore brings each back with its own reader and group, and the encrypted backup carries it', () => {
    for (const r of RECORDS) {
      expect(RESTORE_KEYS).toContain(r.key);
      const parts = DEVICE_PARTS.filter(part => part.key === r.key);
      expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group}))).toEqual([{id: `device:${r.name}`, name: r.name, label: r.label, group: r.group}]);
      expect(parts[0]!.schema.safeParse({version: 2}).success).toBe(false);
      const section = sectionOf(parts[0]!)!;
      expect(section).toBeTruthy();
      const here = memory(); here.storage.setItem(r.key, JSON.stringify(r.sample));
      const {sections, warnings} = exportRecordSections(here.storage, {health: false});
      expect(warnings).toEqual([]);
      expect((JSON.parse(sections[section]!) as {records: Record<string, unknown>}).records[`device:${r.name}`]).toEqual(r.sample);
      const fresh = memory();
      expect(restoreRecordSection(fresh.storage, section, sections[section]!).restored).toContain(r.label);
      expect(JSON.parse(fresh.m.get(r.key)!)).toEqual(r.sample);
    }
  });
});
