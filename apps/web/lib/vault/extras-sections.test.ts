import {describe, expect, test} from 'vitest';
import {EXTRAS_KEYS, EXTRAS_SECTIONS} from './extras-sections';
import {EXTRAS_DEVICE_KEYS} from './extras-keys';
import {MODULE_KEYS} from '../export/everything';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {ONBOARDING_SETUP_KEY, PROGRESS_PHOTOS_KEY} from '../aa-device-keys';
import {SEARCH_RECENT_KEY} from '../search/recent';

// Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C4): what the extras sections carry, pinned.
describe('extras sections', () => {
  test('the shell\'s key list is exactly the sections\' records, each key in one section only', () => {
    expect([...EXTRAS_DEVICE_KEYS].sort()).toEqual([...EXTRAS_KEYS].sort());
    expect(new Set(EXTRAS_KEYS).size).toBe(EXTRAS_KEYS.length);
  });
  // Session AM (D18, deliberate): six sections now; NOVA's is the last, under the account's consent (was: five, the Checklist last).
  test('the six sections, in order (the Checklist, AK 8.10 AFL8, then NOVA, AM D18), and only Health under the Health consent', () => {
    expect(EXTRAS_SECTIONS.map(s => [s.name, s.consent])).toEqual([['goals', 'account'], ['life', 'account'], ['habits', 'account'], ['health', 'health'], ['checklist', 'account'], ['nova', 'account']]);
    expect(EXTRAS_SECTIONS.find(s => s.name === 'checklist')!.records.map(r => r.spec.key)).toEqual(['zigoals:checklist:v1', 'zigoals:checklist-days:v1']);
    expect(EXTRAS_SECTIONS.find(s => s.name === 'nova')!.records.map(r => r.spec.key)).toEqual(['zigoals:nova-stage:v1', 'zigoals:nova:v1']);
    expect(EXTRAS_SECTIONS.find(s => s.name === 'health')!.records.map(r => r.spec.key)).toEqual(['zigoals:health-coach:v1', 'zigoals:micro-targets:v1', 'zigoals:macro-mode:v1', 'zigoals:aisles:v1', 'zigoals:measurements-custom:v1', 'zigoals:health-vitamins:v1']);
  });
  test('never a synced module, the Portfolio, a photo, recent searches, the welcome\'s setup or AB-Design\'s display preferences', () => {
    for (const key of [...Object.values(MODULE_KEYS), PORTFOLIO_KEY, PROGRESS_PHOTOS_KEY, SEARCH_RECENT_KEY, ONBOARDING_SETUP_KEY, UI_PREFS_KEY]) expect(EXTRAS_KEYS).not.toContain(key);
  });
  test('every record reads its empty value, and the fields kept on each device are the ones decided (C11; AK: the habit list mode, the Checklist\'s Health inputs and today\'s ticks)', () => {
    for (const section of EXTRAS_SECTIONS) for (const r of section.records) expect(r.spec.schema.safeParse(r.spec.empty()).success, r.spec.key).toBe(true);
    // Session AM (D18, deliberate): the list now also names every field of zigoals:nova:v1 that stays on each device
    // (all but the layout and the pinned widgets); the five entries before them are unchanged.
    // Session AM (AM-S11, deliberate): the stage record's three per-device choices are in the list too, in the section's
    // order (was: no field of zigoals:nova-stage:v1 stayed on the device). Still the whole list, entry for entry.
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.flatMap(r => (r.deviceFields ?? []).map(f => `${r.spec.key}#${f}`)))).toEqual(['zigoals:goal-extras:v1#dormant', 'zigoals:habit-extras:v1#folds', 'zigoals:habit-extras:v1#listMode', 'zigoals:checklist:v1#healthItems', 'zigoals:checklist-days:v1#today',
      'zigoals:nova-stage:v1#keep', 'zigoals:nova-stage:v1#proactive', 'zigoals:nova-stage:v1#gentle',
      'zigoals:nova:v1#openingSeen', 'zigoals:nova:v1#dock', 'zigoals:nova:v1#persona', 'zigoals:nova:v1#accent', 'zigoals:nova:v1#customInstructions', 'zigoals:nova:v1#shortcuts', 'zigoals:nova:v1#yourName', 'zigoals:nova:v1#panels', 'zigoals:nova:v1#routing', 'zigoals:nova:v1#wake', 'zigoals:nova:v1#startOnNova']);
    // Session AM (D18): the one allow-list in the sections: of zigoals:nova:v1 exactly these two fields travel (lib/vault/extras-nova.test.ts proves that nothing else does).
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.flatMap(r => (r.syncFields ?? []).map(f => `${r.spec.key}#${f}`)))).toEqual(['zigoals:nova:v1#layout', 'zigoals:nova:v1#widgets']);
  });
});
