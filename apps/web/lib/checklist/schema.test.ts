import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';
import {AF_CHECKLIST_EXPORT_KEYS, AF_CHECKLIST_PERSONAL_KEYS, CHECKLIST_DAYS_KEY, CHECKLIST_KEY, TODAY_CHECKLIST_LAYOUT_ID} from '../af-checklist-keys';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {MODULE_KEYS} from '../export/everything';
import {SYNCED} from '../data-health/catalog';
import {DEVICE_PARTS} from '../restore/plan';
import {EXTRAS_DEVICE_KEYS} from '../vault/extras-keys';
import {EXTRAS_SECTIONS} from '../vault/extras-sections';
import {UI_PREFS, checklistPrefsOf, uiPrefsSchema} from '../ui-prefs/schema';
import {CHECKLIST, CHECKLIST_DAYS, checklistSchema} from './schema';
import {orderedItems} from './store';

const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }} as Pick<Storage, 'getItem' | 'setItem'>}; };

describe('Session AF Checklist keys (TIER 3 storage, ADR-028 H10): versioned, loose, device-only, never synced', () => {
  test('the key names and the rows the lead wires', () => {
    expect(CHECKLIST_KEY).toBe('zigoals:checklist:v1');
    expect(CHECKLIST_DAYS_KEY).toBe('zigoals:checklist-days:v1');
    expect(AF_CHECKLIST_PERSONAL_KEYS).toEqual([CHECKLIST_KEY, CHECKLIST_DAYS_KEY]);
    expect(AF_CHECKLIST_EXPORT_KEYS).toEqual({checklist: CHECKLIST_KEY, checklistDays: CHECKLIST_DAYS_KEY});
    expect(TODAY_CHECKLIST_LAYOUT_ID).toBe('today:checklist');
    expect(CHECKLIST.key).toBe(CHECKLIST_KEY); expect(CHECKLIST_DAYS.key).toBe(CHECKLIST_DAYS_KEY);
  });
  test('never a module record or a restore part; synced only as the extras Checklist section (AK 8.10, AFL8), listed so in the catalog', () => {
    for (const key of AF_CHECKLIST_PERSONAL_KEYS) {
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
      expect(EXTRAS_DEVICE_KEYS).toContain(key);
      expect(SYNCED.find(e => e.key === key)?.home).toBe('sync');
      expect(DEVICE_PARTS.some(p => p.key === key)).toBe(false);
    }
  });
  test('only the extras Checklist section names the keys (AK 8.10, AFL8), and it keeps Health quick inputs and today\'s ticks on the device', () => {
    const lib = join(__dirname, '..');
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const sync = [...files(join(lib, 'vault')), ...files(join(lib, 'sync-offer')), join(lib, 'sync-homes-store.ts'), ...files(join(lib, '..', '..', '..', 'workers'))];
    expect(sync.length).toBeGreaterThan(20);
    // Session AK (AFL8, TIER 3 (auth/sync)): the Checklist travels only as the extras section `checklist` (its records in
    // vault/extras-sections.ts, the section's name in vault/extras-sync.ts and in the private-sync Worker's extras store).
    // Tests may name them too. Nothing else that ships may: no module home, no sync offer, no other Worker.
    const naming = sync.filter(file => !/\.test\.(ts|mjs)$/.test(file) && /checklist|CHECKLIST/.test(readFileSync(file, 'utf8'))).map(file => relative(lib, file)).sort();
    expect(naming).toEqual([join('..', '..', '..', 'workers', 'private-sync', 'extras.mjs'), join('vault', 'extras-keys.ts'), join('vault', 'extras-sections.ts'), join('vault', 'extras-sync.ts')].sort());
    const section = EXTRAS_SECTIONS.find(s => s.name === 'checklist')!;
    expect(section.consent).toBe('account');
    expect(section.records.map(r => [r.spec.key, r.deviceFields])).toEqual([[CHECKLIST_KEY, ['healthItems']], [CHECKLIST_DAYS_KEY, ['today']]]);
  });
  test('an older build’s bare record reads; unknown fields and kinds survive a write and are left off the path', () => {
    const {m, storage} = memory();
    expect(readDeviceRecord(storage, CHECKLIST)).toEqual({data: {version: 1, items: [], healthItems: [], order: []}, unreadable: false});
    m.set(CHECKLIST_KEY, JSON.stringify({version: 1, future: {x: 1}, items: [{id: 'ck_1', kind: 'habit', ref: {habitId: 'h1', extra: 2}, addedAt: '2026-10-18T07:00:00.000Z'}, {id: 'ck_2', kind: 'telescope', addedAt: '2026-10-18T07:00:00.000Z', lens: 'wide'}], healthItems: [{id: 'ck_3', kind: 'health', input: 'oxygen', addedAt: '2026-10-18T07:00:00.000Z'}], order: ['ck_2', 'ck_1', 'ck_3']}));
    const read = readDeviceRecord(storage, CHECKLIST);
    expect(read.unreadable).toBe(false);
    expect(orderedItems(read.data).map(i => i.id)).toEqual(['ck_1']);
    updateDeviceRecord(storage, CHECKLIST, r => ({...r, order: [...r.order]}));
    const raw = JSON.parse(m.get(CHECKLIST_KEY)!);
    expect(raw.future).toEqual({x: 1});
    expect(raw.items[1]).toMatchObject({kind: 'telescope', lens: 'wide'});
    expect(raw.items[0].ref.extra).toBe(2);
    expect(raw.healthItems[0].input).toBe('oxygen');
  });
  test('unreadable bytes read as empty, say so, and a read never rewrites them', () => {
    const {m, storage} = memory();
    m.set(CHECKLIST_KEY, '{"version":2}'); m.set(CHECKLIST_DAYS_KEY, 'not json');
    expect(readDeviceRecord(storage, CHECKLIST).unreadable).toBe(true);
    expect(readDeviceRecord(storage, CHECKLIST_DAYS)).toEqual({data: {version: 1, days: {}}, unreadable: true});
    expect(m.get(CHECKLIST_KEY)).toBe('{"version":2}'); expect(m.get(CHECKLIST_DAYS_KEY)).toBe('not json');
  });
  test('the day history holds counts, receipts and custom ticks only', () => {
    const days = CHECKLIST_DAYS.schema.parse({version: 1, days: {'2026-10-17': {total: 6, done: 6, perfect: true}}, today: {date: '2026-10-18', ticks: [{id: 'ck_1', at: '2026-10-18T06:58:12.000Z', record: {kind: 'water', id: 'health_water-1'}}]}});
    expect(days.today).toEqual({date: '2026-10-18', ticks: [{id: 'ck_1', at: '2026-10-18T06:58:12.000Z', record: {kind: 'water', id: 'health_water-1'}}], custom: [], nudged: []});
    expect(CHECKLIST_DAYS.schema.safeParse({version: 1, days: {'2026-10-17': {total: -1, done: 0}}}).success).toBe(false);
    expect(checklistSchema.safeParse({version: 1, items: [{id: '', kind: 'habit', addedAt: 'x'}]}).success).toBe(false);
  });
});

describe('the ui-prefs checklist group (display, device-only)', () => {
  test('defaults: launcher on, path view, sounds off, vibration and nudges on', () => {
    expect(checklistPrefsOf({version: 1})).toEqual({launcher: true, folded: false, view: 'path', accent: 'cyan', sounds: false, haptics: true, nudges: true, celebratedOn: null});
    expect(checklistPrefsOf({version: 1, checklist: {launcher: false, folded: true, view: 'list', accent: 'gold', sounds: true, haptics: false, nudges: false}})).toEqual({launcher: false, folded: true, view: 'list', accent: 'gold', sounds: true, haptics: false, nudges: false, celebratedOn: null});
  });
  test('Session AG Polish (TIER 3 storage): the day whose celebration played, read tolerantly; anything else is dropped', () => {
    expect(checklistPrefsOf(uiPrefsSchema.parse({version: 1, checklist: {celebratedOn: '2026-10-22'}})).celebratedOn).toBe('2026-10-22');
    for (const odd of ['22/10/2026', 20261022, '', 'yesterday', null]) expect(checklistPrefsOf(uiPrefsSchema.parse({version: 1, checklist: {celebratedOn: odd, launcher: false}}))).toMatchObject({celebratedOn: null, launcher: false});
    // (An older build's schema — the group without the field — still reads the record whole.)
    const {m, storage} = memory();
    m.set(UI_PREFS.key, JSON.stringify({version: 1, theme: 'dark', checklist: {view: 'list', celebratedOn: '2026-10-22'}}));
    const read = readDeviceRecord(storage, UI_PREFS);
    expect(read.unreadable).toBe(false); expect(read.data.theme).toBe('dark'); expect(checklistPrefsOf(read.data)).toMatchObject({view: 'list', celebratedOn: '2026-10-22'});
  });
  test('a value this build cannot read never makes the whole record unreadable (the theme and the folds survive)', () => {
    const {m, storage} = memory();
    m.set(UI_PREFS.key, JSON.stringify({version: 1, theme: 'light', musicFolded: true, checklist: {launcher: 'yes', view: 'constellation-view-too-long', sounds: true, later: 1}}));
    const read = readDeviceRecord(storage, UI_PREFS);
    expect(read.unreadable).toBe(false);
    expect(read.data.theme).toBe('light'); expect(read.data.musicFolded).toBe(true);
    expect(checklistPrefsOf(read.data)).toMatchObject({launcher: true, view: 'path', sounds: true});
    expect(uiPrefsSchema.parse({version: 1, checklist: 'odd'}).checklist).toBeUndefined();
    expect((read.data.checklist as Record<string, unknown>).later).toBe(1);
  });
});
