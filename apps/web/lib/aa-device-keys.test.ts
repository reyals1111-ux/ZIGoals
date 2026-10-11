import {describe, expect, test} from 'vitest';
import {AA_DISPLAY_KEYS, AA_PERSONAL_KEYS, GAME_KEY, HABIT_EXTRAS_KEY, LIFE_AREAS_KEY} from './aa-device-keys';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {habitDataSchema, emptyHabitData, HABITS_KEY} from './habits';
import {healthSchema, createEmptyHealth, HEALTH_STORAGE_KEY} from './health';
import {dashboardSettingsSchema, emptyDashboardSettings, DASHBOARD_SETTINGS_KEY} from './dashboard-settings';
import {buildShowcase} from './showcase-data';

const memory = () => { const m = new Map<string, string>(); return {m, storage: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage}; };
describe('Session AA-Local device keys (ADR-022 B1): device-only, versioned, loose; every path knows them', () => {
  test('every key is versioned, unique, in the welcome check, in Export everything, and never a synced module key', () => {
    const all = [...AA_PERSONAL_KEYS, ...AA_DISPLAY_KEYS];
    expect(all.every(k => /^zigoals:[a-z-]+:v1$/.test(k))).toBe(true); expect(new Set(all).size).toBe(all.length);
    for (const k of AA_PERSONAL_KEYS) expect(DEVICE_RECORD_KEYS).toContain(k);
    for (const k of AA_DISPLAY_KEYS) expect(NON_PERSONAL_KEYS).toContain(k);
    for (const k of all) { expect(EVERYTHING_KEYS).toContain(k); expect(Object.values(MODULE_KEYS)).not.toContain(k); }
    expect(Object.values(DEVICE_KEYS)).toContain(GAME_KEY);
    expect(all).not.toContain(LIFE_AREAS_KEY); // AA-Cloud's key: read here, never owned here
  });
  test('a device holding only this session\'s display preference is still new; a personal record makes it not new', () => {
    const {storage} = memory();
    for (const k of AA_DISPLAY_KEYS) storage.setItem(k, '{}');
    expect(noExistingData(storage)).toBe(true);
    storage.setItem(HABIT_EXTRAS_KEY, '{"version":1}');
    expect(noExistingData(storage)).toBe(false);
  });
  test('the synced records are byte-identical with every AA key beside them (an older build reads them unchanged), and the erase removes the personal keys', () => {
    const {m, storage} = memory();
    const habits = JSON.stringify(emptyHabitData()), health = JSON.stringify(createEmptyHealth()), settings = JSON.stringify(emptyDashboardSettings());
    storage.setItem(HABITS_KEY, habits); storage.setItem(HEALTH_STORAGE_KEY, health); storage.setItem(DASHBOARD_SETTINGS_KEY, settings);
    for (const k of [...AA_PERSONAL_KEYS, ...AA_DISPLAY_KEYS]) storage.setItem(k, JSON.stringify({version: 1, later: {x: 1}}));
    // The strict synced schemas see exactly what they saw before: no AA field is inside them.
    expect(habitDataSchema.parse(JSON.parse(storage.getItem(HABITS_KEY)!))).toEqual(JSON.parse(habits));
    expect(healthSchema.parse(JSON.parse(storage.getItem(HEALTH_STORAGE_KEY)!))).toEqual(JSON.parse(health));
    expect(dashboardSettingsSchema.parse(JSON.parse(storage.getItem(DASHBOARD_SETTINGS_KEY)!))).toEqual(JSON.parse(settings));
    const showcase = buildShowcase('2026-10-07', 'UTC');
    for (const [k, v] of Object.entries(showcase.records)) { const parsed = JSON.parse(v); expect(Object.keys(parsed)).not.toContain('game'); expect(Object.keys(parsed)).not.toContain('habitExtras'); void k; }
    forgetAaDeviceRecords(storage);
    for (const k of AA_PERSONAL_KEYS) expect(m.has(k)).toBe(false);
    for (const k of AA_DISPLAY_KEYS) expect(m.has(k)).toBe(true);
    expect(m.has(HABITS_KEY)).toBe(true);
  });
});
