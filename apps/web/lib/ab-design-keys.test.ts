import {describe, expect, test} from 'vitest';
import {AB_DISPLAY_KEYS, UI_PREFS_KEY} from './ab-design-keys';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {readDeviceRecord, updateDeviceRecord} from './device-record';
import {UI_PREFS, baseCurrencyOf, emptyUiPrefs, themeModeOf, uiPrefsSchema} from './ui-prefs/schema';
import {habitDataSchema, emptyHabitData, HABITS_KEY} from './habits';
import {healthSchema, createEmptyHealth, HEALTH_STORAGE_KEY} from './health';
import {dashboardSettingsSchema, emptyDashboardSettings, DASHBOARD_SETTINGS_KEY} from './dashboard-settings';

const memory = () => { const m = new Map<string, string>(); return {m, storage: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage}; };

describe('Session AB-Design device key (ADR-024 D4): device-only, versioned, loose, a display preference', () => {
  test('the key is versioned, a display preference in the welcome check, in Export everything and the catalog, never a synced module key', () => {
    expect(UI_PREFS_KEY).toBe('zigoals:ui-prefs:v1');
    expect(AB_DISPLAY_KEYS.every(k => /^zigoals:[a-z-]+:v1$/.test(k))).toBe(true);
    for (const k of AB_DISPLAY_KEYS) { expect(NON_PERSONAL_KEYS).toContain(k); expect(DEVICE_RECORD_KEYS).not.toContain(k); expect(EVERYTHING_KEYS).toContain(k); expect(Object.values(MODULE_KEYS)).not.toContain(k); }
    expect(DEVICE_KEYS.uiPrefs).toBe(UI_PREFS_KEY);
    expect(UI_PREFS.key).toBe(UI_PREFS_KEY);
  });
  test('a device holding only the display preference is still new; the erase keeps it', () => {
    const {m, storage} = memory();
    storage.setItem(UI_PREFS_KEY, JSON.stringify({version: 1, heroCollapsed: true}));
    expect(noExistingData(storage)).toBe(true);
    forgetAaDeviceRecords(storage);
    expect(m.has(UI_PREFS_KEY)).toBe(true);
  });
  test('frozen reader: the stored shape is read as it is, unknown fields survive a write, garbage reads as the defaults and is never rewritten', () => {
    const {m, storage} = memory();
    // The shape a build from this session writes.
    const stored = {version: 1, heroCollapsed: true, musicFolded: false, themeMode: 'dark', baseCurrency: 'EUR', dismissed: {alphaNotice: true}};
    storage.setItem(UI_PREFS_KEY, JSON.stringify(stored));
    expect(readDeviceRecord(storage, UI_PREFS)).toEqual({data: stored, unreadable: false});
    // A later build's field is kept through this build's write.
    storage.setItem(UI_PREFS_KEY, JSON.stringify({...stored, later: {x: 1}, themeMode: 'aurora'}));
    const next = updateDeviceRecord(storage, UI_PREFS, p => ({...p, heroCollapsed: false}));
    expect(JSON.parse(m.get(UI_PREFS_KEY)!)).toEqual({...stored, later: {x: 1}, themeMode: 'aurora', heroCollapsed: false});
    expect(themeModeOf(next)).toBe('dark'); // a theme that does not exist yet reads as dark
    expect(baseCurrencyOf(next)).toBe('EUR'); expect(baseCurrencyOf(emptyUiPrefs())).toBe('USD');
    // Garbage, a wrong version and a wrong field type read as the defaults, and the bytes stay as they were.
    for (const bad of ['{', '{"version":2}', '{"version":1,"heroCollapsed":"yes"}', '{"version":1,"baseCurrency":"GBP"}', '[]']) {
      storage.setItem(UI_PREFS_KEY, bad);
      expect(readDeviceRecord(storage, UI_PREFS)).toEqual({data: emptyUiPrefs(), unreadable: true});
      expect(m.get(UI_PREFS_KEY)).toBe(bad);
    }
    expect(readDeviceRecord(memory().storage, UI_PREFS)).toEqual({data: emptyUiPrefs(), unreadable: false});
    expect(uiPrefsSchema.parse({version: 1})).toEqual({version: 1});
  });
  test('the synced records are byte-identical with the key beside them (an older build reads them unchanged)', () => {
    const {storage} = memory();
    const habits = JSON.stringify(emptyHabitData()), health = JSON.stringify(createEmptyHealth()), settings = JSON.stringify(emptyDashboardSettings());
    storage.setItem(HABITS_KEY, habits); storage.setItem(HEALTH_STORAGE_KEY, health); storage.setItem(DASHBOARD_SETTINGS_KEY, settings);
    storage.setItem(UI_PREFS_KEY, JSON.stringify({version: 1, heroCollapsed: true}));
    expect(habitDataSchema.parse(JSON.parse(storage.getItem(HABITS_KEY)!))).toEqual(JSON.parse(habits));
    expect(healthSchema.parse(JSON.parse(storage.getItem(HEALTH_STORAGE_KEY)!))).toEqual(JSON.parse(health));
    expect(dashboardSettingsSchema.parse(JSON.parse(storage.getItem(DASHBOARD_SETTINGS_KEY)!))).toEqual(JSON.parse(settings));
  });
});
