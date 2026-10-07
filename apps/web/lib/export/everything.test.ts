import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, healthSchema} from '../health';
import {exportHealthCsv} from '../health-daily';
import {homeRecordsIn} from '../sync-homes-store';
import {SYNC_WRITES} from '../vault/sync-writes';
import {LOCAL_SIMULATION_DAMAGED} from '../vault/local-simulation-backup';
import {CSV_FILES, EVERYTHING_KEYS, buildEverythingZip, collectEverything, csvCell, readEverything} from './everything';
import {readStoredZip} from './zip-reader';

const NOW = new Date('2026-10-03T12:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const lines = (text: string) => text.split('\r\n');
const memoryStorage = (values: Record<string, string>): Storage => { const map = new Map(Object.entries(values)); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, clear: () => map.clear(), key: (i: number) => [...map.keys()][i] ?? null, get length() { return map.size; }} as Storage; };

describe('T4 export everything', () => {
  test('an empty device gives an empty JSON and header-only CSVs', () => {
    const collected = collectEverything({}, APP);
    expect(collected.json).toMatchObject({format: 'zigoals-everything', version: 1, exportedAt: NOW.toISOString(), app: {version: '0.0.0-test', commit: 'abc1234'}, modules: {}, device: {}, unreadable: []});
    expect(collected.json.portfolio).toBeUndefined(); expect(collected.json.localSimulation).toBeUndefined();
    expect(Object.keys(collected.csv)).toEqual([...CSV_FILES]);
    for (const name of CSV_FILES) expect(lines(collected.csv[name]).length, name).toBe(1);
    expect(collected.warnings).toEqual([]);
    expect(lines(collected.csv['goals.csv'])[0]).toBe('"source","id","name","type","status","asset","decimals","target","target_date","category","created_at_utc","plan_amount","plan_asset","plan_cadence","plan_next_date","plan_active","notes"');
  });
  test('the Showcase records export faithfully, with the H7 markers on their check-ins', () => {
    const {records} = buildShowcase('2026-09-20');
    const collected = collectEverything(records, APP);
    expect(collected.unreadable).toEqual([]); expect(collected.warnings).toEqual([]);
    expect(collected.json.modules.habits).toEqual(JSON.parse(records[HABITS_KEY]!));
    // Session U Part 9: with the sync writes on, the Showcase's fast is in Health; switched off, in its device key.
    expect((SYNC_WRITES ? (collected.json.modules.health as {fasting: {sessions: {id: string}[]}}).fasting : collected.json.device.fasting as {sessions: {id: string}[]}).sessions[0]!.id).toBe('fast_showcase-1');
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), entries = habits.habits.reduce((n, h) => n + h.entries.length, 0);
    const checkIns = lines(collected.csv['check-ins.csv']);
    expect(checkIns.length).toBe(entries + 1); expect(entries).toBeGreaterThanOrEqual(180);
    expect(checkIns.some(l => l.includes('"skipped"'))).toBe(true);
    const links = homeRecordsIn(records).habitLinks, marked = links.applied.filter(a => !a.undone);
    expect(marked.length).toBe(12);
    const withAuto = checkIns.slice(1).filter(l => !l.endsWith(',""'));
    expect(withAuto.length).toBe(12);
    for (const a of marked) expect(checkIns.some(l => l.startsWith(`"${a.habitId}"`) && l.includes(`"${a.date}"`) && l.endsWith(`"${a.appliedAt}"`)), `${a.habitId} ${a.date}`).toBe(true);
    const health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
    expect(lines(collected.csv['water.csv']).length).toBe((health.daily?.water.length ?? 0) + 1); expect(health.daily?.water.length).toBe(24);
    expect(collected.csv['health-diary.csv']).toBe(exportHealthCsv(health, '1900-01-01', '2199-12-31'));
    expect(lines(collected.csv['weights.csv']).length).toBe(health.weights.length + (health.measurements ?? []).filter(m => m.kind === 'weight').length + 1);
    expect(lines(collected.csv['habits.csv']).length).toBe(habits.habits.length + 1);
    expect(collected.csv['goals.csv']).toContain('"private"');
  });
  test('CSV cells are quoted, doubled and never run as formulas; unknown stays empty', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"'); expect(csvCell('say "hi"')).toBe('"say ""hi"""'); expect(csvCell('-5')).toBe('"\'-5"'); expect(csvCell('+1')).toBe('"\'+1"'); expect(csvCell('@x')).toBe('"\'@x"');
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"'); expect(csvCell(null)).toBe('""'); expect(csvCell(undefined)).toBe('""'); expect(csvCell(0)).toBe('"0"');
    const {records} = buildShowcase('2026-09-20');
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!));
    habits.habits[0]!.entries[0]!.note = '=SUM(A1)'; habits.habits[0]!.title = 'Say "hi"';
    const collected = collectEverything({[HABITS_KEY]: JSON.stringify(habits)}, APP);
    const row = lines(collected.csv['check-ins.csv']).find(l => l.includes('SUM'))!;
    expect(row).toContain('"\'=SUM(A1)"'); expect(row).toContain('"Say ""hi"""');
    const diary = lines(collectEverything(records, APP).csv['health-diary.csv']);
    expect(diary.some(l => l.includes('"Unknown"') || l.includes(',"",'))).toBe(true);
  });
  test('a key that is not JSON is listed as unreadable and copied nowhere; a damaged simulation keeps its marker', () => {
    const collected = collectEverything({[HABITS_KEY]: 'not json', [HEALTH_STORAGE_KEY]: '{"nope": true}'}, {...APP, localSimulation: {section: JSON.stringify({schemaVersion: 1, kind: 'zigoals-local-simulation', omitted: 'damaged'}), warning: LOCAL_SIMULATION_DAMAGED}});
    expect(collected.unreadable).toEqual([HABITS_KEY]); expect(collected.json.unreadable).toEqual([HABITS_KEY]);
    expect(JSON.stringify(collected).includes('not json')).toBe(false);
    expect(collected.json.modules.habits).toBeUndefined(); expect(lines(collected.csv['check-ins.csv']).length).toBe(1);
    expect(collected.json.modules.health).toEqual({nope: true}); expect(lines(collected.csv['health-diary.csv']).length).toBe(1);
    expect(collected.warnings).toContain(LOCAL_SIMULATION_DAMAGED); expect(collected.warnings.some(w => w.startsWith('Your health records'))).toBe(true);
    expect(collected.json.localSimulation).toEqual({schemaVersion: 1, kind: 'zigoals-local-simulation', omitted: 'damaged'});
  });
  test('the ZIP holds everything.json then the nine CSVs, and is named after the day (Showcase says so)', () => {
    const {records} = buildShowcase('2026-09-20');
    const collected = collectEverything(records, APP);
    const plain = buildEverythingZip(collected, {date: '2026-10-01', showcase: false, now: NOW});
    expect(plain.name).toBe('zigoals-export-2026-10-01.zip');
    expect(buildEverythingZip(collected, {date: '2026-10-01', showcase: true, now: NOW}).name).toBe('zigoals-showcase-demo-export-2026-10-01.zip');
    const entries = readStoredZip(plain.bytes);
    expect(entries.map(e => e.name)).toEqual(['everything.json', ...CSV_FILES]);
    expect(JSON.parse(new TextDecoder().decode(entries[0]!.data))).toEqual(collected.json);
    expect(new TextDecoder().decode(entries[4]!.data)).toBe(collected.csv['check-ins.csv']);
  });
  test('readEverything reads every key as stored and writes nothing', async () => {
    const {records} = buildShowcase('2026-09-20');
    const storage = memoryStorage(records), before = JSON.stringify(Object.fromEntries(EVERYTHING_KEYS.map(k => [k, storage.getItem(k)])));
    const {texts, localSimulation} = await readEverything(storage);
    expect(Object.keys(texts).sort()).toEqual([...EVERYTHING_KEYS].sort());
    for (const key of EVERYTHING_KEYS) expect(texts[key]).toBe(records[key] ?? null);
    expect(localSimulation).toBeNull();
    expect(JSON.stringify(Object.fromEntries(EVERYTHING_KEYS.map(k => [k, storage.getItem(k)])))).toBe(before);
  });
});
