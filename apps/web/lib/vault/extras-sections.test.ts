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
  test('the four sections, in order, and only Health under the Health consent', () => {
    expect(EXTRAS_SECTIONS.map(s => [s.name, s.consent])).toEqual([['goals', 'account'], ['life', 'account'], ['habits', 'account'], ['health', 'health']]);
    expect(EXTRAS_SECTIONS.find(s => s.name === 'health')!.records.map(r => r.spec.key)).toEqual(['zigoals:health-coach:v1', 'zigoals:micro-targets:v1', 'zigoals:macro-mode:v1', 'zigoals:aisles:v1', 'zigoals:measurements-custom:v1']);
  });
  test('never a synced module, the Portfolio, a photo, recent searches, the welcome\'s setup or AB-Design\'s display preferences', () => {
    for (const key of [...Object.values(MODULE_KEYS), PORTFOLIO_KEY, PROGRESS_PHOTOS_KEY, SEARCH_RECENT_KEY, ONBOARDING_SETUP_KEY, UI_PREFS_KEY]) expect(EXTRAS_KEYS).not.toContain(key);
  });
  test('every record reads its empty value, and the fields kept on each device are the two decided (C11)', () => {
    for (const section of EXTRAS_SECTIONS) for (const r of section.records) expect(r.spec.schema.safeParse(r.spec.empty()).success, r.spec.key).toBe(true);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.flatMap(r => (r.deviceFields ?? []).map(f => `${r.spec.key}#${f}`)))).toEqual(['zigoals:goal-extras:v1#dormant', 'zigoals:habit-extras:v1#folds']);
  });
});
